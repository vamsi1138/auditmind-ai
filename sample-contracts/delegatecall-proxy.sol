// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DelegatecallProxy {
    address public implementation;
    address public owner;

    constructor(address initialImplementation) {
        owner = msg.sender;
        implementation = initialImplementation;
    }

    function setImplementation(address newImplementation) external {
        require(msg.sender == owner, "not owner");
        implementation = newImplementation;
    }

    fallback() external payable {
        (bool ok, ) = implementation.delegatecall(msg.data);
        require(ok, "delegatecall failed");
    }
}
