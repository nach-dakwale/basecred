import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0D1A] text-slate-100">
      <header className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10 bg-[#0B0D1A]/80">
        <span className="font-semibold text-sm tracking-tight text-white">BaseCred</span>
        <nav className="flex items-center gap-5">
          <Link href="/dividends" className="text-sm text-slate-400 hover:text-white transition-colors">Dividends</Link>
          <Link href="/govern" className="text-sm text-slate-400 hover:text-white transition-colors">Govern</Link>
          <Link href="/sale" className="text-sm text-slate-400 hover:text-white transition-colors">Token Sale</Link>
          <Link href="/dapp" className="rounded-lg bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors">
            Launch App
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-28 space-y-20">
        <section className="relative space-y-6">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-800/50 bg-violet-950/40 px-3 py-1 text-xs font-medium text-violet-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Base Sepolia Testnet
          </span>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Borrow ETH with your{" "}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              GitHub history
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
            BaseCred scores your open source contributions and issues ETH credit limits on Base. No traditional credit check.
          </p>
          <Link
            href="/dapp"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/20"
          >
            Check my score
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div key={card.title} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-5 space-y-2 hover:border-violet-800/40 transition-colors">
              <p className="font-semibold text-sm text-white">{card.title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Score tiers</h2>
          <div className="rounded-xl border border-slate-800/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/60">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Max Loan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Collateral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {[
                  { tier: "1", score: "201–350", loan: "0.05 ETH", col: "75%" },
                  { tier: "2", score: "351–500", loan: "0.15 ETH", col: "50%" },
                  { tier: "3", score: "501–600", loan: "0.40 ETH", col: "20%" },
                  { tier: "4", score: "601–650", loan: "0.75 ETH", col: "None" },
                ].map((row) => (
                  <tr key={row.tier} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 text-slate-300">Tier {row.tier}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{row.score}</td>
                    <td className="px-4 py-3 font-semibold text-white">{row.loan}</td>
                    <td className={`px-4 py-3 font-mono ${row.col === "None" ? "text-violet-400" : "text-slate-400"}`}>
                      {row.col}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/40 px-6 py-6 text-center text-xs text-slate-600">
        BaseCred is a proof of concept on Base Sepolia testnet. Not financial advice.
      </footer>
    </div>
  );
}
