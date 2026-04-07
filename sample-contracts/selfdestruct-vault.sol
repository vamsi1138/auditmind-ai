// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SelfdestructVault {
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {}

    function emergencyShutdown() external {
        require(msg.sender == owner, "not owner");
        selfdestruct(payable(owner));
    }
}
