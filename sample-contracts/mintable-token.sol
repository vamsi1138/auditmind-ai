// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MintableToken {
    string public name = "MintableToken";
    string public symbol = "MINT";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function mint(address to, uint256 amount) external {
        require(to != address(0), "zero address");

        totalSupply += amount;
        balanceOf[to] += amount;

        emit Transfer(address(0), to, amount);
    }
}
