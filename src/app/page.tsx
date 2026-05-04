import Link from "next/link";

import SiteHeader from "@/components/layout/SiteHeader";
import { searchFragrances } from "@/lib/fragrance-search";

export default function Home() {
  const initialResults = searchFragrances({ sort: "popularity" });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[7%] top-10 h-80 w-80 rounded-full bg-citron/45 blur-3xl" />
        <div className="absolute right-[5%] top-24 h-[28rem] w-[28rem] rounded-full bg-sage/35 blur-3xl" />
        <div className="absolute bottom-0 left-[30%] h-[32rem] w-[32rem] rounded-full bg-ember/18 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <SiteHeader />

        <section className="grid min-h-[72vh] items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="animate-fade-up [animation-delay:120ms]">
            <p className="mb-4 inline-flex rounded-full border border-white/45 bg-white/30 px-4 py-2 text-sm font-bold text-ink/70 shadow-glass backdrop-blur-2xl">
              API-backed perfume discovery
            </p>
            <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.88] tracking-[-0.08em] text-ink sm:text-7xl lg:text-8xl">
              Smell like a mood, not a search result.
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-ink/65">
              FragranceVC turns plain-language scent briefs into ranked perfumes, dupes, and originals. Use the
              selector to search by vibe, notes, occasion, price, popularity, and performance.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-full bg-ink px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-milk shadow-glow transition hover:-translate-y-0.5"
                href="/selector"
              >
                Open Fragrance Selector
              </Link>
              <Link
                className="rounded-full border border-white/60 bg-white/40 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-ink/65 shadow-glass backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/65"
                href="/how-built"
              >
                How I Built This
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
              {[
                [String(initialResults.databaseSize), "starter scents"],
                ["Live API", "catalog ready"],
                ["PostgreSQL", "full import path"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[1.5rem] border border-white/45 bg-white/25 p-4 shadow-glass backdrop-blur-2xl"
                >
                  <p className="font-display text-3xl font-black tracking-[-0.06em]">{value}</p>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink/45">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:220ms]">
            <HeroCard />
          </div>
        </section>

        <section className="grid gap-4 pb-12 md:grid-cols-3">
          {[
            ["Describe", "Write a brief like “clean, expensive, airy, and good for summer dates.”"],
            ["Filter", "Dial in accord families, mood, occasion, gender direction, budget, dupes, and originals."],
            ["Select", "Open a polished scent profile card with notes, accords, performance, seasons, and price."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[2rem] border border-white/45 bg-white/28 p-6 shadow-glass backdrop-blur-2xl">
              <p className="font-display text-3xl font-black tracking-[-0.05em]">{title}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/58">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function HeroCard() {
  return (
    <div className="glass-panel rounded-[3rem] p-5">
      <div className="relative z-10 overflow-hidden rounded-[2.4rem] border border-white/50 bg-[#e7f0df]/80 p-5 shadow-glass backdrop-blur-2xl">
        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-citron/50 blur-2xl" />
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.1fr]">
          <div className="grid content-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-ink/42">Current top match</p>
              <h2 className="mt-2 font-display text-5xl font-black leading-none tracking-[-0.07em]">Santal 33</h2>
              <p className="mt-2 text-xl font-medium text-ink/58">Le Labo</p>
            </div>
            <div className="relative mx-auto h-64 w-44 rounded-[2rem] border border-white/50 bg-gradient-to-br from-[#e8dec6] to-[#6d725f] shadow-glow">
              <div className="absolute inset-5 rounded-[1.5rem] border border-white/25 bg-white/15 backdrop-blur-sm" />
              <div className="absolute -top-8 left-1/2 h-16 w-20 -translate-x-1/2 rounded-2xl bg-gradient-to-br from-[#f3d88d] to-[#8d642f] shadow-glow" />
              <div className="absolute inset-x-6 top-24 rounded-2xl border border-white/40 bg-white/25 p-4 text-center text-milk backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Woody</p>
                <p className="font-display text-2xl font-black tracking-[-0.06em]">Clean</p>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <Panel title="main accords">
              {[
                ["Sandalwood", "96%", "#7a6c52"],
                ["Woody", "88%", "#415143"],
                ["Clean", "74%", "#8aa2a0"],
                ["Leather", "61%", "#80542e"],
              ].map(([label, width, color]) => (
                <div key={label} className="rounded-xl px-4 py-3 text-sm font-black text-white" style={{ width, background: color }}>
                  {label}
                </div>
              ))}
            </Panel>
            <Panel title="fragrance profile">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Longevity" value="8h" />
                <MiniMetric label="Sillage" value="Moderate" />
                <MiniMetric label="Occasion" value="Daily" />
                <MiniMetric label="Sort" value="Dupes" />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/60 p-4">
      <p className="mb-3 text-xl font-light lowercase text-ink/42">{title}</p>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/75 p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/38">{label}</p>
      <p className="mt-1 font-display text-xl font-black tracking-[-0.04em]">{value}</p>
    </div>
  );
}
