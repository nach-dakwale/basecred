import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { PUBLIC_NETWORK, serverRpcUrl } from "./network";

export function getAdminClient() {
  return createPublicClient({
    chain: PUBLIC_NETWORK.chain,
    transport: http(serverRpcUrl()),
  });
}

export const CONTRACT = PUBLIC_NETWORK.contractAddress;

export const ORACLE_WALLET = "0xae10cc5f84c52dd69b21bfc8837ffd8c1daad6c1" as const;

export const ORACLE_LOW_BALANCE_THRESHOLD = BigInt(5e14); // 0.0005 ETH in wei

// Contract deployed at block 42054200 on Base Sepolia
export const CONTRACT_DEPLOY_BLOCK = 42054200n;

const LOG_PAGE_SIZE = 1999n; // public Base Sepolia RPC caps at 2000 blocks per eth_getLogs request

export const EVENT_LOAN_REQUESTED = parseAbiItem(
  "event LoanRequested(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral)"
);
export const EVENT_LOAN_REPAID = parseAbiItem(
  "event LoanRepaid(bytes32 indexed identityId, address indexed wallet)"
);
export const EVENT_LOAN_LIQUIDATED = parseAbiItem(
  "event LoanLiquidated(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral)"
);

const LOAN_EVENTS = [EVENT_LOAN_REQUESTED, EVENT_LOAN_REPAID, EVENT_LOAN_LIQUIDATED] as const;

const T_REQUESTED  = "0x1a3751f5f3b7b80f3de6bbced92a321e7c436836c5aa894a2d16b7365019938a";
const T_REPAID     = "0x8daf861cd83df9ee5bdd1881cc2e0ac722103d7b2a952fc76573658ca88c4503";
const T_LIQUIDATED = "0xa0d1d24d1a146dfcd1b00b827388053294ac2349152682148355a8a69111186d";

export interface RequestedEvent { identityId: `0x${string}`; wallet: `0x${string}`; amount: bigint; collateral: bigint }
export interface ClosedEvent { identityId: `0x${string}`; wallet: `0x${string}` }

export interface LoanEvents {
  requested: RequestedEvent[];
  repaid: ClosedEvent[];
  liquidated: ClosedEvent[];
}

// Fetch all three loan event types in a single sequential set of pages (one call per range).
// Using events[] so a single getLogs covers all event types, avoiding concurrent calls
// that trigger rate limits on the public Base Sepolia RPC.
export async function fetchLoanEvents(fromBlock: bigint): Promise<LoanEvents> {
  const client = getAdminClient();
  const latestBlock = await client.getBlockNumber();
  type RawLog = Awaited<ReturnType<typeof client.getLogs>>[number];
  const all: RawLog[] = [];

  for (let start = fromBlock; start <= latestBlock; start += LOG_PAGE_SIZE + 1n) {
    const end = start + LOG_PAGE_SIZE > latestBlock ? latestBlock : start + LOG_PAGE_SIZE;
    const chunk = await client.getLogs({ address: CONTRACT, events: LOAN_EVENTS, fromBlock: start, toBlock: end });
    all.push(...chunk);
  }

  const requested: RequestedEvent[] = [];
  const repaid: ClosedEvent[] = [];
  const liquidated: ClosedEvent[] = [];

  for (const log of all) {
    if (log.topics[0] === T_REQUESTED) {
      const d = decodeEventLog({ abi: [EVENT_LOAN_REQUESTED], data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      const a = d.args as { identityId: `0x${string}`; wallet: `0x${string}`; amount: bigint; collateral: bigint };
      requested.push(a);
    } else if (log.topics[0] === T_REPAID) {
      const d = decodeEventLog({ abi: [EVENT_LOAN_REPAID], data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      const a = d.args as { identityId: `0x${string}`; wallet: `0x${string}` };
      repaid.push(a);
    } else if (log.topics[0] === T_LIQUIDATED) {
      const d = decodeEventLog({ abi: [EVENT_LOAN_LIQUIDATED], data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      const a = d.args as { identityId: `0x${string}`; wallet: `0x${string}`; amount: bigint; collateral: bigint };
      liquidated.push({ identityId: a.identityId, wallet: a.wallet });
    }
  }

  return { requested, repaid, liquidated };
}

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
