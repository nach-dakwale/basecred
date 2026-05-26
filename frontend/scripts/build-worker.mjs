import { cpSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { getAddress, zeroAddress } from "viem";

const expected = process.argv[2] === "mainnet" ? 8453 : process.argv[2] === "testnet" ? 84532 : 0;
if (!expected) throw new Error("Build environment must be testnet or mainnet");
if (Number(process.env.NEXT_PUBLIC_CHAIN_ID) !== expected) {
  throw new Error(`NEXT_PUBLIC_CHAIN_ID must be ${expected} for this artifact`);
}
const address = getAddress(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "");
if (address === zeroAddress) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS must be a deployed contract");
if (!process.env.NEXT_PUBLIC_EXPLORER_URL) throw new Error("NEXT_PUBLIC_EXPLORER_URL is required");
if (expected === 8453 && (!process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL.includes("mainnet.base.org"))) {
  throw new Error("Mainnet browser RPC endpoint must use production infrastructure");
}

execFileSync("npx", ["opennextjs-cloudflare", "build"], { stdio: "inherit", env: process.env });
cpSync(".open-next/worker.js", ".open-next/assets/_worker.js");
writeFileSync(".open-next/assets/.assetsignore", "_worker.js\n");
