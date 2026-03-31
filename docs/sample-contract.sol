pragma solidity ^0.8.0;

contract SimpleVault {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function withdraw(address payable to, uint amount) public {
        require(msg.sender == owner, "Not owner");
        to.transfer(amount);
    }

    function destroy() public {
        require(msg.sender == owner, "Not owner");
        selfdestruct(payable(owner));
    }
}