// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CredPrivateSale — fixed-rate ETH-in / baseCREDIT-out private sale.
contract CredPrivateSale {
    IERC20 public immutable token;
    address public owner;

    uint256 public priceWeiPerToken; // ETH wei per 1e18 baseCREDIT
    uint256 public hardCapWei;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public totalRaisedWei;

    event Purchased(address indexed buyer, uint256 ethIn, uint256 tokensOut);
    event Withdrawn(address indexed owner, uint256 amount);
    event SaleConfigured(uint256 price, uint256 cap, uint256 start, uint256 end);
    event UnsoldRecovered(address indexed owner, uint256 amount);

    error NotOwner();
    error SaleNotActive();
    error CapExceeded();
    error ZeroAmount();
    error ZeroAddress();
    error TransferFailed();
    error SaleNotEnded();
    error InvalidConfig();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address token_) {
        if (token_ == address(0)) revert ZeroAddress();
        token = IERC20(token_);
        owner = msg.sender;
    }

    /// Configure sale parameters. Can be called before start to update.
    function configureSale(
        uint256 priceWeiPerToken_,
        uint256 hardCapWei_,
        uint256 startTime_,
        uint256 endTime_
    ) external onlyOwner {
        if (priceWeiPerToken_ == 0 || hardCapWei_ == 0) revert InvalidConfig();
        if (startTime_ >= endTime_) revert InvalidConfig();
        priceWeiPerToken = priceWeiPerToken_;
        hardCapWei = hardCapWei_;
        startTime = startTime_;
        endTime = endTime_;
        emit SaleConfigured(priceWeiPerToken_, hardCapWei_, startTime_, endTime_);
    }

    /// Buy baseCREDIT tokens. Send ETH, receive tokens at the configured rate.
    function buy() external payable {
        if (block.timestamp < startTime || block.timestamp > endTime) revert SaleNotActive();
        if (msg.value == 0) revert ZeroAmount();
        if (totalRaisedWei + msg.value > hardCapWei) revert CapExceeded();

        uint256 tokensOut = (msg.value * 1e18) / priceWeiPerToken;
        totalRaisedWei += msg.value;

        emit Purchased(msg.sender, msg.value, tokensOut);
        if (!token.transfer(msg.sender, tokensOut)) revert TransferFailed();
    }

    /// Preview how many tokens a given ETH amount would buy.
    function previewBuy(uint256 weiIn) external view returns (uint256) {
        return (weiIn * 1e18) / priceWeiPerToken;
    }

    /// Remaining ETH capacity before hard cap.
    function remainingCapWei() external view returns (uint256) {
        return hardCapWei > totalRaisedWei ? hardCapWei - totalRaisedWei : 0;
    }

    /// Owner withdraws raised ETH at any time.
    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        emit Withdrawn(msg.sender, bal);
        (bool ok,) = payable(owner).call{value: bal}("");
        if (!ok) revert TransferFailed();
    }

    /// Recover unsold tokens after sale ends.
    function recoverUnsoldTokens() external onlyOwner {
        if (block.timestamp <= endTime) revert SaleNotEnded();
        uint256 bal = token.balanceOf(address(this));
        emit UnsoldRecovered(msg.sender, bal);
        if (!token.transfer(owner, bal)) revert TransferFailed();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
