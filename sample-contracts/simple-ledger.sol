// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleLedger {
    mapping(address => uint256) public balances;
    event Deposited(address indexed account, uint256 amount);
    event Moved(address indexed from, address indexed to, uint256 amount);

    function deposit(uint256 amount) external {
        require(amount > 0, "amount must be positive");
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function move(address to, uint256 amount) external {
        require(to != address(0), "zero address");
        require(balances[msg.sender] >= amount, "insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Moved(msg.sender, to, amount);
    }
}
