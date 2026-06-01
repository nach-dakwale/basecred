// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CredDividends — pull-based ETH dividend distributor for baseCREDIT holders.
/// Uses the ERC-20 dividend pattern: tracks rewardPerToken globally, snapshots per holder.
/// Only the loan pool may call receiveInterest(). Only the token may call notifyBalanceChange().
contract CredDividends {
    uint256 private constant PRECISION = 1e18;

    address public immutable token;
    address public loanPool;
    address public owner;

    uint256 public rewardPerTokenStored;
    uint256 public totalDistributed;

    mapping(address => uint256) public rewardPerTokenPaid;
    mapping(address => uint256) public unclaimed;

    event InterestReceived(uint256 holderShare);
    event Claimed(address indexed account, uint256 amount);
    event LoanPoolSet(address indexed pool);

    error NotToken();
    error NotPool();
    error NotOwner();
    error AlreadySet();
    error ZeroAddress();
    error TransferFailed();
    error NothingToClaim();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address token_) {
        if (token_ == address(0)) revert ZeroAddress();
        token = token_;
        owner = msg.sender;
    }

    /// Set once after pool is deployed.
    function setLoanPool(address pool) external onlyOwner {
        if (loanPool != address(0)) revert AlreadySet();
        if (pool == address(0)) revert ZeroAddress();
        loanPool = pool;
        emit LoanPoolSet(pool);
    }

    /// Called by GitHubLoanPool on each repayment with the 80% holder share.
    function receiveInterest() external payable {
        if (msg.sender != loanPool) revert NotPool();
        if (msg.value == 0) return;
        uint256 supply = _totalSupply();
        if (supply == 0) return; // no holders: ETH stays here, claimed by owner later
        rewardPerTokenStored += (msg.value * PRECISION) / supply;
        totalDistributed += msg.value;
        emit InterestReceived(msg.value);
    }

    /// Called by BaseCreditToken._update() BEFORE balances change.
    function notifyBalanceChange(address account, uint256 currentBalance, uint256 currentTotalSupply) external {
        if (msg.sender != token) revert NotToken();
        _checkpoint(account, currentBalance, currentTotalSupply);
    }

    /// Pull pending ETH dividends.
    function claim() external returns (uint256 amount) {
        uint256 bal = _balanceOf(msg.sender);
        uint256 supply = _totalSupply();
        _checkpoint(msg.sender, bal, supply);
        amount = unclaimed[msg.sender];
        if (amount == 0) revert NothingToClaim();
        unclaimed[msg.sender] = 0;
        emit Claimed(msg.sender, amount);
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// View pending claimable ETH for an account.
    function pendingReward(address account) external view returns (uint256) {
        uint256 bal = _balanceOf(account);
        uint256 earned = (bal * (rewardPerTokenStored - rewardPerTokenPaid[account])) / PRECISION;
        return unclaimed[account] + earned;
    }

    // --- internals ---

    function _checkpoint(address account, uint256 balance, uint256 /*supply*/) internal {
        uint256 delta = rewardPerTokenStored - rewardPerTokenPaid[account];
        if (delta > 0) {
            unclaimed[account] += (balance * delta) / PRECISION;
            rewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    function _balanceOf(address account) internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        require(ok, "balanceOf failed");
        return abi.decode(data, (uint256));
    }

    function _totalSupply() internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("totalSupply()")
        );
        require(ok, "totalSupply failed");
        return abi.decode(data, (uint256));
    }

    receive() external payable {}
}
