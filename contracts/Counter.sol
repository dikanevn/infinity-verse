// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    event Increment(address indexed caller, uint256 newCount);
    event Decrement(address indexed caller, uint256 newCount);

    function increment() external {
        count += 1;
        emit Increment(msg.sender, count);
    }

    function decrement() external {
        require(count > 0, "Counter: underflow");
        count -= 1;
        emit Decrement(msg.sender, count);
    }
}
