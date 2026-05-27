import { createPublicClient, http, parseAbiItem } from "viem";
import { PUBLIC_NETWORK, serverRpcUrl } from "./network";

export const adminClient = createPublicClient({
  chain: PUBLIC_NETWORK.chain,
  transport: http(serverRpcUrl()),
});

export const CONTRACT = PUBLIC_NETWORK.contractAddress;

export const ORACLE_WALLET = "0xae10cc5f84c52dd69b21bfc8837ffd8c1daad6c1" as const;

export const ORACLE_LOW_BALANCE_THRESHOLD = BigInt(5e14); // 0.0005 ETH in wei

export const EVENT_LOAN_REQUESTED = parseAbiItem(
  "event LoanRequested(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral)"
);
export const EVENT_LOAN_REPAID = parseAbiItem(
  "event LoanRepaid(bytes32 indexed identityId, address indexed wallet)"
);
export const EVENT_LOAN_LIQUIDATED = parseAbiItem(
  "event LoanLiquidated(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral)"
);

export const ADMIN_ABI = [
  {
    name: "walletForIdentity", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "", type: "address" }],
  },
  {
    name: "identityForWallet", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "scores", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "scoreSetAt", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tier", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "", type: "uint8" }],
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
    name: "totalOutstandingPrincipal", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
] as const;
