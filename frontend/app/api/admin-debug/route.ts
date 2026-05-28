import { NextResponse } from "next/server";
import { getAdminClient, CONTRACT, ADMIN_ABI, CONTRACT_DEPLOY_BLOCK, fetchLoanEvents } from "@/lib/admin-chain";

export async function GET() {
  const steps: Record<string, unknown> = {};
  try {
    steps.rpcUrl = process.env.RPC_URL ? "set" : "missing";
    steps.contractAddress = CONTRACT;

    const client = getAdminClient();
    steps.clientCreated = true;

    const balance = await client.getBalance({ address: CONTRACT });
    steps.balance = balance.toString();

    const principal = await client.readContract({
      address: CONTRACT, abi: ADMIN_ABI, functionName: "totalOutstandingPrincipal",
    });
    steps.principal = principal.toString();

    const events = await fetchLoanEvents(CONTRACT_DEPLOY_BLOCK);
    steps.loanLogs = events.requested.length;

    return NextResponse.json({ ok: true, steps });
  } catch (err) {
    return NextResponse.json({ ok: false, steps, error: String(err) }, { status: 500 });
  }
}
