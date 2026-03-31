pragma solidity ^0.8.0;

contract BasicOwnable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function setValue(uint256 newValue) public {
        require(msg.sender == owner, "Not owner");
    }
}