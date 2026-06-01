export const CRED_DIVIDENDS_ABI = [
  { name: "pendingReward", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ name: "amount", type: "uint256" }] },
  { name: "totalDistributed", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "rewardPerTokenStored", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "Claimed", type: "event", inputs: [{ name: "account", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { name: "InterestReceived", type: "event", inputs: [{ name: "holderShare", type: "uint256", indexed: false }] },
] as const;

export const CRED_DIVIDENDS_ADDRESS = process.env.NEXT_PUBLIC_DIVIDENDS_ADDRESS as `0x${string}` | undefined;
