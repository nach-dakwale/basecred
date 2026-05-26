import { defineConfig } from "vitest/config";
import path from "node:path";

process.env.NEXT_PUBLIC_CHAIN_ID ||= "84532";
process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||= "0x1111111111111111111111111111111111111111";
process.env.NEXT_PUBLIC_EXPLORER_URL ||= "https://sepolia.basescan.org";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node" },
});
