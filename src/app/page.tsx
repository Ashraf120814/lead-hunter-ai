import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
              LH
            </span>
            Lead Hunter AI
          </div>
          <Link
            href="/leads/find"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Find Leads
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-16">
        <p className="mb-3 text-sm font-medium text-indigo-600">AI Lead Intelligence</p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
          Find businesses that need a better website
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Discover local businesses with weak or missing websites, score their potential, and
          generate outreach.
        </p>
        <div className="mt-8">
          <Link
            href="/leads/find"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-500"
          >
            Start searching
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Lead Hunter AI © 2026 — Developed by Mohammad Ashraf | D-Mappers
      </footer>
    </div>
  );
}