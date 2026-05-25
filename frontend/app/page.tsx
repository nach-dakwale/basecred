import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">BaseCred</span>
        <Link
          href="/dapp"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Launch App
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 space-y-16">
        <section className="space-y-6">
          <div className="inline-block rounded-full bg-blue-600/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-400">
            Base Sepolia Testnet
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Borrow ETH with your
            <br />
            GitHub reputation
          </h1>
          <p className="text-xl text-zinc-400 max-w-xl">
            BaseCred scores your open-source contribution history and issues
            undercollateralized loans on Base. No credit bureau. No identity verification.
            Just code.
          </p>
          <Link
            href="/dapp"
            className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Check my score
          </Link>
        </section>

        <section className="grid grid-cols-3 gap-6">
          {[
            {
              title: "Score based on web3 contributions",
              body: "PRs merged to Ethereum, Base, Uniswap, Aave, and other major crypto repos carry the most weight.",
            },
            {
              title: "Borrow up to 0.75 ETH uncollateralized",
              body: "Top-tier contributors get fully uncollateralized loans. No crypto to put up front.",
            },
            {
              title: "On-chain credit history",
              body: "Your score lives on Base. Repay on time to keep it. Default and it resets.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
              <p className="font-semibold text-sm">{card.title}</p>
              <p className="text-sm text-zinc-400">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Score tiers</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Tier</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Score</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Max Loan</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Collateral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { tier: "1", score: "201-350", loan: "0.05 ETH", col: "100%" },
                  { tier: "2", score: "351-500", loan: "0.15 ETH", col:  "50%" },
                  { tier: "3", score: "501-600", loan: "0.40 ETH", col:  "20%" },
                  { tier: "4", score: "601-650", loan: "0.75 ETH", col: "None" },
                ].map((row) => (
                  <tr key={row.tier}>
                    <td className="px-4 py-3">Tier {row.tier}</td>
                    <td className="px-4 py-3 font-mono">{row.score}</td>
                    <td className="px-4 py-3 font-semibold">{row.loan}</td>
                    <td className={`px-4 py-3 ${row.col === "None" ? "text-green-400 font-medium" : "text-zinc-300"}`}>
                      {row.col}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-600">
        BaseCred is a proof of concept on Base Sepolia testnet. Not financial advice.
      </footer>
    </div>
  );
}
