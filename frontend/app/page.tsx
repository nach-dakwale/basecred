import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm tracking-tight text-white">BaseCred</span>
        <Link
          href="/dapp"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Launch App
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 space-y-16">
        <section className="space-y-5">
          <span className="inline-flex items-center rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs font-mono text-zinc-400">
            Base Sepolia Testnet
          </span>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Borrow ETH with your
            <br />
            GitHub history
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
            BaseCred calculates a score from public GitHub activity and uses it
            to set loan terms on Base.
          </p>
          <Link
            href="/dapp"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Check my score
          </Link>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Score from web3 contributions",
              body: "Merged PRs to Ethereum, Base, Uniswap, Aave, and other major crypto repos carry the most weight.",
            },
            {
              title: "Borrow up to 0.75 ETH",
              body: "Higher tiers can borrow more. Some tiers require collateral; Tier 4 does not.",
            },
            {
              title: "On-chain repayment record",
              body: "Repay on time to stay eligible for future loans. A default blocks new borrowing.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <p className="font-medium text-sm text-white">{card.title}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Score tiers</h2>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Max Loan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Collateral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { tier: "1", score: "201–350", loan: "0.05 ETH", col: "100%" },
                  { tier: "2", score: "351–500", loan: "0.15 ETH", col:  "50%" },
                  { tier: "3", score: "501–600", loan: "0.40 ETH", col:  "20%" },
                  { tier: "4", score: "601–650", loan: "0.75 ETH", col: "None" },
                ].map((row) => (
                  <tr key={row.tier} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-300">Tier {row.tier}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{row.score}</td>
                    <td className="px-4 py-3 font-medium text-white">{row.loan}</td>
                    <td className={`px-4 py-3 font-mono ${row.col === "None" ? "text-blue-400" : "text-zinc-400"}`}>
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
