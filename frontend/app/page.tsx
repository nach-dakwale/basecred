import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <header className="border-b border-[#30363D] px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm text-white">BaseCred</span>
        <nav className="flex items-center gap-5">
          <Link href="/dividends" className="text-sm text-[#8B949E] hover:text-white transition-colors">Dividends</Link>
          <Link href="/govern" className="text-sm text-[#8B949E] hover:text-white transition-colors">Govern</Link>
          <Link href="/sale" className="text-sm text-[#8B949E] hover:text-white transition-colors">Token Sale</Link>
          <Link href="/dapp" className="rounded-md bg-[#238636] border border-[#2EA043] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[#2EA043] transition-colors">
            Launch App
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 space-y-16">
        <section className="space-y-5">
          <span className="inline-flex items-center rounded-full border border-[#30363D] bg-[#161B22] px-2.5 py-0.5 text-xs text-[#8B949E]">
            Base Sepolia Testnet
          </span>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Borrow ETH with your
            <br />
            GitHub history
          </h1>
          <p className="text-lg text-[#8B949E] max-w-xl leading-relaxed">
            BaseCred scores your open source contributions and issues ETH credit limits on Base. No traditional credit check.
          </p>
          <Link
            href="/dapp"
            className="inline-flex items-center rounded-md bg-[#238636] border border-[#2EA043] px-4 py-2 text-sm font-medium text-white hover:bg-[#2EA043] transition-colors"
          >
            Check my score
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
            <div key={card.title} className="rounded-md border border-[#30363D] bg-[#161B22] p-4 space-y-2">
              <p className="font-semibold text-sm text-white">{card.title}</p>
              <p className="text-sm text-[#8B949E] leading-relaxed">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Score tiers</h2>
          <div className="rounded-md border border-[#30363D] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#161B22]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Max Loan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#8B949E] uppercase tracking-wider">Collateral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262D]">
                {[
                  { tier: "1", score: "201–350", loan: "0.05 ETH", col: "75%" },
                  { tier: "2", score: "351–500", loan: "0.15 ETH", col: "50%" },
                  { tier: "3", score: "501–600", loan: "0.40 ETH", col: "20%" },
                  { tier: "4", score: "601–650", loan: "0.75 ETH", col: "None" },
                ].map((row) => (
                  <tr key={row.tier} className="hover:bg-[#161B22] transition-colors">
                    <td className="px-4 py-3 text-[#E6EDF3]">Tier {row.tier}</td>
                    <td className="px-4 py-3 font-mono text-[#E6EDF3]">{row.score}</td>
                    <td className="px-4 py-3 font-semibold text-white">{row.loan}</td>
                    <td className={`px-4 py-3 font-mono ${row.col === "None" ? "text-[#3FB950]" : "text-[#8B949E]"}`}>
                      {row.col}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#21262D] px-6 py-6 text-center text-xs text-[#6E7681]">
        BaseCred is a proof of concept on Base Sepolia testnet. Not financial advice.
      </footer>
    </div>
  );
}
