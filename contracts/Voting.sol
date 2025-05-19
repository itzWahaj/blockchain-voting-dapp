// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Voting {
    address public admin;
    bool public votingStarted;
    bool public votingEnded;
    uint public votingDeadline;

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedCandidateId;
    }

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    mapping(address => Voter) public voters;
    mapping(address => bytes32) public credentialOf;
    mapping(bytes32 => bool) public usedCredentials;
    mapping(uint => Candidate) public candidates;

    address[] public voterAddresses; // ✅ NEW: stores all registered voters

    uint public candidatesCount;

    // ✅ Events for monitoring
    event VoterRegistered(address indexed voter, bytes32 credentialId);
    event VoteCast(address indexed voter, uint candidateId);
    event CandidateAdded(uint candidateId, string name);
    event VotingStarted(uint deadline);
    event VotingEnded();

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyDuringVoting() {
        require(votingStarted && !votingEnded, "Voting is not active");
        _;
    }

    function addCandidate(string memory _name) public onlyAdmin {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit CandidateAdded(candidatesCount, _name);
    }

    function registerVoter(bytes32 credentialId) public {
        Voter storage voter = voters[msg.sender];
        require(!voter.isRegistered, "Already registered");
        require(credentialId != 0x0, "Invalid credential");
        require(!usedCredentials[credentialId], "Credential already used");

        voter.isRegistered = true;
        credentialOf[msg.sender] = credentialId;
        usedCredentials[credentialId] = true;

        voterAddresses.push(msg.sender); // ✅ TRACK VOTER

        emit VoterRegistered(msg.sender, credentialId);
    }

    function startVoting(uint _deadline) public onlyAdmin {
        require(!votingStarted, "Voting already started");
        require(_deadline > block.timestamp, "Deadline must be in future");

        votingStarted = true;
        votingEnded = false;
        votingDeadline = _deadline;

        emit VotingStarted(_deadline);
    }

    function endVoting() public onlyAdmin {
        require(votingStarted, "Voting not started");
        require(!votingEnded, "Already ended");

        votingEnded = true;
        emit VotingEnded();
    }

    function vote(uint _candidateId, bytes32 credentialId) public onlyDuringVoting {
        require(block.timestamp <= votingDeadline, "Voting has ended");

        Voter storage voter = voters[msg.sender];
        require(voter.isRegistered, "Not registered");
        require(!voter.hasVoted, "Already voted");

        require(credentialOf[msg.sender] == credentialId, "Credential mismatch");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");

        voter.hasVoted = true;
        voter.votedCandidateId = _candidateId;
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId);
    }

    function getWinner() public view returns (string memory winnerName) {
        require(votingEnded || block.timestamp > votingDeadline, "Voting not ended");

        uint maxVotes = 0;
        uint winnerId = 0;

        for (uint i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }

        require(winnerId != 0, "No votes yet");
        winnerName = candidates[winnerId].name;
    }

    // ✅ Optional helper (already available via public array)
    function getVoterAddresses() public view returns (address[] memory) {
        return voterAddresses;
    }
}
