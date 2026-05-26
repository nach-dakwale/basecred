// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GitHubLoanPool — undercollateralized ETH loans backed by GitHub reputation
contract GitHubLoanPool {
    address public oracle;
    address public owner;

    struct Loan {
        uint128 amount;     // principal in wei
        uint128 collateral; // collateral locked in wei
        uint64  dueBlock;
        bool    active;
    }

    // Tiers by score:
    //   0: score <= 200  → no loans
    //   1: 201-350       → 0.05 ETH max, 100% collateral
    //   2: 351-500       → 0.15 ETH max,  50% collateral
    //   3: 501-600       → 0.40 ETH max,  20% collateral
    //   4: 601-650       → 0.75 ETH max,   0% collateral

    uint256 public constant INTEREST_BPS  = 1000;   // 10%
    uint256 public constant LOAN_BLOCKS   = 216000; // ~30 days (2s blocks on Base)
    uint256 public constant SCORE_TTL     = 7 days;

    mapping(address => uint256) public scores;
    mapping(address => uint256) public scoreSetAt;
    mapping(address => Loan)    public loans;
    bool public paused;

    event ScoreSet(address indexed borrower, uint256 score);
    event LoanRequested(address indexed borrower, uint256 amount, uint256 collateral);
    event LoanRepaid(address indexed borrower);
    event LoanLiquidated(address indexed borrower, uint256 amount, uint256 collateral);
    event PoolWithdrawn(address indexed owner, uint256 amount);
    event PoolPaused();
    event PoolUnpaused();
    event Deposited(address indexed sender, uint256 amount);

    error NotOracle();
    error NotOwner();
    error AlreadyHasLoan();
    error ScoreTooLow();
    error ScoreExpired();
    error ExceedsMaxLoan();
    error InsufficientCollateral();
    error InsufficientRepayment();
    error NoActiveLoan();
    error LoanNotDue();
    error PoolInsufficientFunds();
    error Paused();

    constructor(address _oracle) {
        oracle = _oracle;
        owner  = msg.sender;
    }

    function setScore(address borrower, uint256 score) external {
        if (msg.sender != oracle) revert NotOracle();
        scores[borrower] = score;
        scoreSetAt[borrower] = block.timestamp;
        emit ScoreSet(borrower, score);
    }

    function tier(address borrower) public view returns (uint8) {
        uint256 s = scores[borrower];
        if (s > 600) return 4;
        if (s > 500) return 3;
        if (s > 350) return 2;
        if (s > 200) return 1;
        return 0;
    }

    function maxLoan(address borrower) public view returns (uint256) {
        uint8 t = tier(borrower);
        if (t == 4) return 0.75 ether;
        if (t == 3) return 0.40 ether;
        if (t == 2) return 0.15 ether;
        if (t == 1) return 0.05 ether;
        return 0;
    }

    function collateralBps(address borrower) public view returns (uint256) {
        uint8 t = tier(borrower);
        if (t >= 4) return 0;
        if (t == 3) return 2000;
        if (t == 2) return 5000;
        return 10000;
    }

    function requestLoan(uint256 amount) external payable {
        if (paused)                      revert Paused();
        if (loans[msg.sender].active)    revert AlreadyHasLoan();
        uint256 max = maxLoan(msg.sender);
        if (max == 0)                    revert ScoreTooLow();
        if (block.timestamp - scoreSetAt[msg.sender] > SCORE_TTL) revert ScoreExpired();
        if (amount > max)                revert ExceedsMaxLoan();

        uint256 colNeeded = (amount * collateralBps(msg.sender)) / 10000;
        if (msg.value < colNeeded)       revert InsufficientCollateral();
        if (address(this).balance - msg.value < amount) revert PoolInsufficientFunds();

        loans[msg.sender] = Loan({
            amount:     uint128(amount),
            collateral: uint128(msg.value),
            dueBlock:   uint64(block.number + LOAN_BLOCKS),
            active:     true
        });

        emit LoanRequested(msg.sender, amount, msg.value);
        payable(msg.sender).transfer(amount);
    }

    function repayLoan() external payable {
        Loan storage loan = loans[msg.sender];
        if (!loan.active) revert NoActiveLoan();

        uint256 interest = (uint256(loan.amount) * INTEREST_BPS) / 10000;
        uint256 due      = uint256(loan.amount) + interest;
        if (msg.value < due) revert InsufficientRepayment();

        uint256 colReturn = loan.collateral;
        loan.active    = false;
        loan.amount    = 0;
        loan.collateral = 0;

        emit LoanRepaid(msg.sender);
        if (colReturn > 0) payable(msg.sender).transfer(colReturn);
        uint256 overpaid = msg.value - due;
        if (overpaid > 0) payable(msg.sender).transfer(overpaid);
    }

    function liquidate(address borrower) external {
        Loan storage loan = loans[borrower];
        if (!loan.active) revert NoActiveLoan();
        if (block.number <= loan.dueBlock) revert LoanNotDue();

        uint256 amount = loan.amount;
        uint256 collateral = loan.collateral;
        loan.active = false;
        loan.amount = 0;
        loan.collateral = 0;

        emit LoanLiquidated(borrower, amount, collateral);
    }

    function withdrawPool(uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        emit PoolWithdrawn(msg.sender, amount);
        payable(owner).transfer(amount);
    }

    function pause() external {
        if (msg.sender != owner) revert NotOwner();
        paused = true;
        emit PoolPaused();
    }

    function unpause() external {
        if (msg.sender != owner) revert NotOwner();
        paused = false;
        emit PoolUnpaused();
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}
