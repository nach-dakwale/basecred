export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const ABI = [
  {
    name: "setScore",
    type: "function",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "score",    type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "requestLoan",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "repayLoan",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "scores",
    type: "function",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "loans",
    type: "function",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "amount",     type: "uint128" },
      { name: "collateral", type: "uint128" },
      { name: "dueBlock",   type: "uint64"  },
      { name: "active",     type: "bool"    },
    ],
    stateMutability: "view",
  },
  {
    name: "tier",
    type: "function",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "maxLoan",
    type: "function",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "collateralBps",
    type: "function",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "ScoreSet",
    type: "event",
    inputs: [
      { name: "borrower", type: "address", indexed: true  },
      { name: "score",    type: "uint256", indexed: false },
    ],
  },
  {
    name: "LoanRequested",
    type: "event",
    inputs: [
      { name: "borrower",   type: "address", indexed: true  },
      { name: "amount",     type: "uint256", indexed: false },
      { name: "collateral", type: "uint256", indexed: false },
    ],
  },
  {
    name: "LoanRepaid",
    type: "event",
    inputs: [{ name: "borrower", type: "address", indexed: true }],
  },
] as const;
