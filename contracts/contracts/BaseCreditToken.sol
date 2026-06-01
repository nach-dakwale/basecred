// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/// @title BaseCreditToken — governance + dividend token for BaseCred on Base.
/// Symbol: baseCREDIT. Sister tokens on other chains follow the pattern: stxCREDIT, solCREDIT, etc.
contract BaseCreditToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10 ** 18;

    /// Contract that receives balance-change notifications for dividend accounting.
    address public dividends;

    address public owner;

    event DividendsSet(address indexed previous, address indexed next);
    event OwnershipTransferred(address indexed previous, address indexed next);

    error NotOwner();
    error AlreadySet();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) ERC20("BaseCreditToken", "baseCREDIT") ERC20Permit("BaseCreditToken") {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        _mint(initialOwner, TOTAL_SUPPLY);
    }

    /// Set once after CredDividends is deployed.
    function setDividends(address dividendsContract) external onlyOwner {
        if (dividends != address(0)) revert AlreadySet();
        if (dividendsContract == address(0)) revert ZeroAddress();
        address previous = dividends;
        dividends = dividendsContract;
        emit DividendsSet(previous, dividendsContract);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --- ERC-20Votes + dividend snapshot wiring ---

    function _update(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        // Snapshot dividend state BEFORE balances change.
        address div = dividends;
        if (div != address(0)) {
            if (from != address(0)) ICredDividends(div).notifyBalanceChange(from, balanceOf(from), totalSupply());
            if (to != address(0)) ICredDividends(div).notifyBalanceChange(to, balanceOf(to), totalSupply());
        }
        super._update(from, to, amount);
    }

    function nonces(address account) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(account);
    }
}

interface ICredDividends {
    function notifyBalanceChange(address account, uint256 currentBalance, uint256 currentTotalSupply) external;
}
