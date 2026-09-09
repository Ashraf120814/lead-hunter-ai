import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm">LH</span>
            Lead Hunter AI
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/leads/find" className="text-slate-600 hover:text-indigo-600 dark:text-slate-300">
              Find Leads
            </Link>
            <Link
              href="/leads/find"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500"
            >
              Start searching
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-indigo-600 mb-3">AI Lead Intelligence</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
              Find businesses that need a better website
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Discover local businesses worldwide with weak or missing websites, score their
              purchase potential, and generate personalized outreach in one workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/leads/find"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-white font-medium hover:bg-indigo-500"
              >
                Find leads
              </Link>
              <a
                href="#how"
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-3 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Discover", desc: "Search by city, industry, rating, and website status." },
              { title: "Analyze", desc: "Audit websites and score digital opportunity." },
              { title: "Qualify", desc: "Lead score, purchase probability, and heat ranking." },
              { title: "Pitch", desc: "Emails, DMs, call scripts, and website prompts." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold">Workflow</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-xl">
              FIND → ANALYZE → QUALIFY → PITCH → FOLLOW UP → CLOSE
            </p>
            <ol className="mt-8 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li>1. Choose location and industry (e.g. jewellery in Dubai, dentists in London).</li>
              <li>2. Filter for no website or poor website quality.</li>
              <li>3. Review AI scores and business summaries.</li>
              <li>4. Copy personalized email, DM, or call script.</li>
              <li>5. Export to Excel and track in CRM.</li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        Lead Hunter AI © 2026 — Developed by Mohammad Ashraf | D-Mappers
      </footer>
    </div>
  );
}
