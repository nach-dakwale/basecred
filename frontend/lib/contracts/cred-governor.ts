export const CRED_GOVERNOR_ABI = [
  { name: "propose", type: "function", stateMutability: "nonpayable", inputs: [{ name: "targets", type: "address[]" }, { name: "values", type: "uint256[]" }, { name: "calldatas", type: "bytes[]" }, { name: "description", type: "string" }], outputs: [{ name: "proposalId", type: "uint256" }] },
  { name: "castVote", type: "function", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }], outputs: [{ name: "balance", type: "uint256" }] },
  { name: "castVoteWithReason", type: "function", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "uint8" }, { name: "reason", type: "string" }], outputs: [{ name: "balance", type: "uint256" }] },
  { name: "queue", type: "function", stateMutability: "nonpayable", inputs: [{ name: "targets", type: "address[]" }, { name: "values", type: "uint256[]" }, { name: "calldatas", type: "bytes[]" }, { name: "descriptionHash", type: "bytes32" }], outputs: [{ name: "proposalId", type: "uint256" }] },
  { name: "execute", type: "function", stateMutability: "payable", inputs: [{ name: "targets", type: "address[]" }, { name: "values", type: "uint256[]" }, { name: "calldatas", type: "bytes[]" }, { name: "descriptionHash", type: "bytes32" }], outputs: [{ name: "proposalId", type: "uint256" }] },
  { name: "state", type: "function", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "", type: "uint8" }] },
  { name: "proposalVotes", type: "function", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "againstVotes", type: "uint256" }, { name: "forVotes", type: "uint256" }, { name: "abstainVotes", type: "uint256" }] },
  { name: "proposalDeadline", type: "function", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "proposalSnapshot", type: "function", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "hasVoted", type: "function", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }, { name: "account", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "quorum", type: "function", stateMutability: "view", inputs: [{ name: "timepoint", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "votingDelay", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "votingPeriod", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "proposalThreshold", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "ProposalCreated", type: "event", inputs: [{ name: "proposalId", type: "uint256", indexed: false }, { name: "proposer", type: "address", indexed: false }, { name: "targets", type: "address[]", indexed: false }, { name: "values", type: "uint256[]", indexed: false }, { name: "signatures", type: "string[]", indexed: false }, { name: "calldatas", type: "bytes[]", indexed: false }, { name: "voteStart", type: "uint256", indexed: false }, { name: "voteEnd", type: "uint256", indexed: false }, { name: "description", type: "string", indexed: false }] },
  { name: "VoteCast", type: "event", inputs: [{ name: "voter", type: "address", indexed: true }, { name: "proposalId", type: "uint256", indexed: false }, { name: "support", type: "uint8", indexed: false }, { name: "weight", type: "uint256", indexed: false }, { name: "reason", type: "string", indexed: false }] },
] as const;

export const CRED_GOVERNOR_ADDRESS = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as `0x${string}` | undefined;

export const ProposalState = {
  0: "Pending",
  1: "Active",
  2: "Canceled",
  3: "Defeated",
  4: "Succeeded",
  5: "Queued",
  6: "Expired",
  7: "Executed",
} as const;
