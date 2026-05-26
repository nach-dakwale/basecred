import { PUBLIC_NETWORK } from "@/lib/network";

export const CONTRACT_ADDRESS = PUBLIC_NETWORK.contractAddress;

export const ABI = [
  {
    name: "setScoreAndBind", type: "function", stateMutability: "nonpayable", outputs: [],
    inputs: [
      { name: "identityId", type: "bytes32" },
      { name: "wallet", type: "address" },
      { name: "score", type: "uint256" },
      { name: "proofNonce", type: "bytes32" },
    ],
  },
  {
    name: "requestLoan", type: "function", stateMutability: "payable", outputs: [],
    inputs: [{ name: "amount", type: "uint256" }],
  },
  {
    name: "repayLoan", type: "function", stateMutability: "payable", inputs: [], outputs: [],
  },
  {
    name: "identityForWallet", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "loans", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "amount", type: "uint128" },
      { name: "collateral", type: "uint128" },
      { name: "dueBlock", type: "uint64" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "defaulted", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "ScoreSet", type: "event",
    inputs: [
      { name: "identityId", type: "bytes32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "score", type: "uint256", indexed: false },
      { name: "proofNonce", type: "bytes32", indexed: false },
    ],
  },
  {
    name: "LoanRequested", type: "event",
    inputs: [
      { name: "identityId", type: "bytes32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "collateral", type: "uint256", indexed: false },
    ],
  },
] as const;
