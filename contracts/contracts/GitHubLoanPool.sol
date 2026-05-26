// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GitHubLoanPool - identity-bound undercollateralized loans.
contract GitHubLoanPool {
    struct Loan {
        uint128 amount;
        uint128 collateral;
        uint64 dueBlock;
        bool active;
    }

    uint256 public constant INTEREST_BPS = 1000;
    uint256 public constant LOAN_BLOCKS = 216000;
    uint256 public constant SCORE_TTL = 7 days;
    uint256 public constant WALLET_MIGRATION_DELAY = 30 days;
    uint256 public constant MAX_SCORE = 650;

    address public owner;
    address public pendingOwner;
    address public oracle;
    bool public paused;
    uint256 public maxTotalPrincipal;
    uint256 public totalOutstandingPrincipal;
    uint256 public totalReservedCollateral;

    mapping(bytes32 => address) public walletForIdentity;
    mapping(address => bytes32) public identityForWallet;
    mapping(bytes32 => uint256) public walletBoundAt;
    mapping(bytes32 => uint256) public scores;
    mapping(bytes32 => uint256) public scoreSetAt;
    mapping(bytes32 => Loan) public loans;
    mapping(bytes32 => bool) public defaulted;
    mapping(bytes32 => uint256) public badDebt;
    mapping(bytes32 => bool) public usedProofNonces;

    event WalletBound(bytes32 indexed identityId, address indexed wallet);
    event WalletMigrated(bytes32 indexed identityId, address indexed previousWallet, address indexed wallet);
    event ScoreSet(bytes32 indexed identityId, address indexed wallet, uint256 score, bytes32 proofNonce);
    event LoanRequested(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral);
    event LoanRepaid(bytes32 indexed identityId, address indexed wallet);
    event LoanLiquidated(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral);
    event PoolWithdrawn(address indexed owner, uint256 amount);
    event Paused(bool paused);
    event OracleUpdated(address indexed previousOracle, address indexed oracle);
    event OwnershipTransferStarted(address indexed owner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed owner);
    event ExposureLimitUpdated(uint256 maximumPrincipal);
    event Deposited(address indexed sender, uint256 amount);

    error NotOracle();
    error NotOwner();
    error NotPendingOwner();
    error InvalidAddress();
    error InvalidIdentity();
    error InvalidScore();
    error ProofAlreadyUsed();
    error WalletAlreadyBound();
    error WalletNotBound();
    error MigrationCooldown();
    error IdentityDefaulted();
    error AlreadyHasLoan();
    error ScoreTooLow();
    error ScoreExpired();
    error ExceedsMaxLoan();
    error ExposureLimitExceeded();
    error InsufficientCollateral();
    error InsufficientRepayment();
    error NoActiveLoan();
    error LoanNotDue();
    error PoolInsufficientFunds();
    error InsufficientFreeLiquidity();
    error PausedError();
    error MustBePaused();
    error TransferFailed();
    error RoleCollision();

    constructor(address oracle_, address owner_, uint256 maxPrincipal_) {
        if (oracle_ == address(0) || owner_ == address(0)) revert InvalidAddress();
        if (oracle_ == owner_) revert RoleCollision();
        oracle = oracle_;
        owner = owner_;
        maxTotalPrincipal = maxPrincipal_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setScoreAndBind(bytes32 identityId, address wallet, uint256 score, bytes32 proofNonce) external {
        if (msg.sender != oracle) revert NotOracle();
        if (identityId == bytes32(0)) revert InvalidIdentity();
        if (wallet == address(0)) revert InvalidAddress();
        if (score > MAX_SCORE) revert InvalidScore();
        if (proofNonce == bytes32(0) || usedProofNonces[proofNonce]) revert ProofAlreadyUsed();
        if (defaulted[identityId]) revert IdentityDefaulted();

        address previous = walletForIdentity[identityId];
        bytes32 boundIdentity = identityForWallet[wallet];
        if (boundIdentity != bytes32(0) && boundIdentity != identityId) revert WalletAlreadyBound();
        if (previous != address(0) && previous != wallet) {
            if (loans[identityId].active) revert AlreadyHasLoan();
            if (block.timestamp < walletBoundAt[identityId] + WALLET_MIGRATION_DELAY) revert MigrationCooldown();
            delete identityForWallet[previous];
            emit WalletMigrated(identityId, previous, wallet);
        } else if (previous == address(0)) {
            emit WalletBound(identityId, wallet);
        }

        usedProofNonces[proofNonce] = true;
        walletForIdentity[identityId] = wallet;
        identityForWallet[wallet] = identityId;
        if (previous != wallet) walletBoundAt[identityId] = block.timestamp;
        scores[identityId] = score;
        scoreSetAt[identityId] = block.timestamp;
        emit ScoreSet(identityId, wallet, score, proofNonce);
    }

    function tier(bytes32 identityId) public view returns (uint8) {
        uint256 score = scores[identityId];
        if (score > 600) return 4;
        if (score > 500) return 3;
        if (score > 350) return 2;
        if (score > 200) return 1;
        return 0;
    }

    function maxLoan(bytes32 identityId) public view returns (uint256) {
        uint8 creditTier = tier(identityId);
        if (creditTier == 4) return 0.75 ether;
        if (creditTier == 3) return 0.40 ether;
        if (creditTier == 2) return 0.15 ether;
        if (creditTier == 1) return 0.05 ether;
        return 0;
    }

    function collateralBps(bytes32 identityId) public view returns (uint256) {
        uint8 creditTier = tier(identityId);
        if (creditTier >= 4) return 0;
        if (creditTier == 3) return 2000;
        if (creditTier == 2) return 5000;
        return 10000;
    }

    function requestLoan(uint256 amount) external payable {
        if (paused) revert PausedError();
        bytes32 identityId = identityForWallet[msg.sender];
        if (identityId == bytes32(0)) revert WalletNotBound();
        if (defaulted[identityId]) revert IdentityDefaulted();
        if (loans[identityId].active) revert AlreadyHasLoan();
        uint256 limit = maxLoan(identityId);
        if (limit == 0) revert ScoreTooLow();
        if (block.timestamp > scoreSetAt[identityId] + SCORE_TTL) revert ScoreExpired();
        if (amount > limit) revert ExceedsMaxLoan();
        if (totalOutstandingPrincipal + amount > maxTotalPrincipal) revert ExposureLimitExceeded();

        uint256 collateral = (amount * collateralBps(identityId)) / 10000;
        if (msg.value < collateral) revert InsufficientCollateral();
        if (address(this).balance - msg.value < amount) revert PoolInsufficientFunds();
        loans[identityId] = Loan(uint128(amount), uint128(msg.value), uint64(block.number + LOAN_BLOCKS), true);
        totalOutstandingPrincipal += amount;
        totalReservedCollateral += msg.value;
        emit LoanRequested(identityId, msg.sender, amount, msg.value);
        _send(msg.sender, amount);
    }

    function repayLoan() external payable {
        bytes32 identityId = identityForWallet[msg.sender];
        if (identityId == bytes32(0)) revert WalletNotBound();
        Loan storage loan = loans[identityId];
        if (!loan.active) revert NoActiveLoan();
        uint256 amount = loan.amount;
        uint256 collateral = loan.collateral;
        uint256 due = amount + (amount * INTEREST_BPS) / 10000;
        if (msg.value < due) revert InsufficientRepayment();
        loan.active = false;
        loan.amount = 0;
        loan.collateral = 0;
        totalOutstandingPrincipal -= amount;
        totalReservedCollateral -= collateral;
        emit LoanRepaid(identityId, msg.sender);
        if (collateral > 0) _send(msg.sender, collateral);
        if (msg.value > due) _send(msg.sender, msg.value - due);
    }

    function liquidate(bytes32 identityId) external {
        Loan storage loan = loans[identityId];
        if (!loan.active) revert NoActiveLoan();
        if (block.number <= loan.dueBlock) revert LoanNotDue();
        uint256 amount = loan.amount;
        uint256 collateral = loan.collateral;
        loan.active = false;
        loan.amount = 0;
        loan.collateral = 0;
        totalOutstandingPrincipal -= amount;
        totalReservedCollateral -= collateral;
        defaulted[identityId] = true;
        badDebt[identityId] += amount;
        emit LoanLiquidated(identityId, walletForIdentity[identityId], amount, collateral);
    }

    function withdrawPool(uint256 amount) external onlyOwner {
        if (amount > address(this).balance - totalReservedCollateral) revert InsufficientFreeLiquidity();
        emit PoolWithdrawn(msg.sender, amount);
        _send(owner, amount);
    }

    function pause() external onlyOwner { paused = true; emit Paused(true); }
    function unpause() external onlyOwner { paused = false; emit Paused(false); }

    function setMaxTotalPrincipal(uint256 maximumPrincipal) external onlyOwner {
        if (!paused) revert MustBePaused();
        if (maximumPrincipal < totalOutstandingPrincipal) revert ExposureLimitExceeded();
        maxTotalPrincipal = maximumPrincipal;
        emit ExposureLimitUpdated(maximumPrincipal);
    }

    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == owner) revert RoleCollision();
        address previous = oracle;
        oracle = newOracle;
        emit OracleUpdated(previous, newOracle);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        if (newOwner == oracle) revert RoleCollision();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        if (msg.sender == oracle) revert RoleCollision();
        address previous = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, msg.sender);
    }

    function _send(address recipient, uint256 amount) private {
        (bool sent,) = payable(recipient).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    receive() external payable { emit Deposited(msg.sender, msg.value); }
}
