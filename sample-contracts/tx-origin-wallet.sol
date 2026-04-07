// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TxOriginWallet {
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {}

    function withdrawAll(address payable recipient) external {
        require(tx.origin == owner, "not owner");
        require(recipient != address(0), "zero address");

        recipient.transfer(address(this).balance);
    }
}
