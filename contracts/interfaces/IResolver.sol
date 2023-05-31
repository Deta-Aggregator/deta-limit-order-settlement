// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IResolver {
    function resolveOrders(bytes calldata tokensAndAmounts, bytes calldata data) external returns(bool);
}
