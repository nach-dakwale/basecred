export const CRED_SALE_ABI = [
  { name: "buy", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "previewBuy", type: "function", stateMutability: "view", inputs: [{ name: "weiIn", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "remainingCapWei", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalRaisedWei", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "hardCapWei", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "priceWeiPerToken", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "startTime", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "endTime", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "Purchased", type: "event", inputs: [{ name: "buyer", type: "address", indexed: true }, { name: "ethIn", type: "uint256", indexed: false }, { name: "tokensOut", type: "uint256", indexed: false }] },
] as const;

export const CRED_SALE_ADDRESS = process.env.NEXT_PUBLIC_SALE_ADDRESS as `0x${string}` | undefined;
