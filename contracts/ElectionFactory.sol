// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Voting.sol";

contract ElectionFactory {
    Voting[] public elections;
    address public latestElection;

    event ElectionCreated(address indexed electionAddress, address indexed admin);

    function createElection() public {
        // Deploy new Voting contract, passing msg.sender as the admin
        Voting newElection = new Voting(msg.sender);
        elections.push(newElection);
        latestElection = address(newElection);

        emit ElectionCreated(address(newElection), msg.sender);
    }

    function getElections() public view returns (Voting[] memory) {
        return elections;
    }

    function getElectionsCount() public view returns (uint) {
        return elections.length;
    }
}
