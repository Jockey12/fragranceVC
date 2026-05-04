"use client";

import type { FragranceResult } from "@/lib/fragrance-search";

type Props = {
  fragrance: FragranceResult;
  index: number;
  selected: boolean;
  onSelect: (fragrance: FragranceResult) => void;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function FragranceResultCard({ fragrance, index, selected, onSelect }: Props) {
  return (
    <article
      className={`animate-fade-up rounded-[2rem] border p-2 shadow-glass backdrop-blur-2xl transition duration-300 hover:-translate-y-1 ${
        selected ? "border-ink/55 bg-white/62" : "border-white/50 bg-white/35 hover:bg-white/50"
      }`}
      style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
    >
      <button
        className="grid w-full gap-4 p-2 text-left sm:grid-cols-[9rem_1fr]"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(fragrance)}
      >
        <div
          className="relative min-h-36 overflow-hidden rounded-[1.5rem] border border-white/45 shadow-glow"
          style={{ background: `linear-gradient(145deg, ${fragrance.colorA}, ${fragrance.colorB})` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.82),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.2),transparent)]" />
          {fragrance.imageUrl ? (
            <img
              src={fragrance.imageUrl}
              alt={`${fragrance.name} bottle`}
              className="absolute inset-0 h-full w-full object-contain p-5"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/25 bg-white/20 p-3 text-milk backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-75">{fragrance.concentration}</p>
            <p className="font-display text-xl font-black tracking-[-0.05em]">{fragrance.priceBand}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                    fragrance.kind === "Dupe" ? "bg-ember/15 text-ember" : "bg-sage/20 text-ink"
                  }`}
                >
                  {fragrance.kind}
                </span>
                {fragrance.dupeFor ? (
                  <span className="rounded-full bg-white/45 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-ink/55">
                    Inspired by {fragrance.dupeFor}
                  </span>
                ) : null}
              </div>
              <h3 className="font-display text-3xl font-black tracking-[-0.05em]">{fragrance.name}</h3>
              <p className="font-bold text-ink/55">{fragrance.house}</p>
            </div>

            <div className="grid min-w-24 place-items-center rounded-[1.4rem] border border-white/55 bg-white/40 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">Match</p>
              <p className="font-display text-3xl font-black tracking-[-0.06em]">{fragrance.matchScore}</p>
            </div>
          </div>

          <p className="line-clamp-2 text-sm font-semibold leading-6 text-ink/62">{fragrance.description}</p>

          <div className="grid gap-2 md:grid-cols-3">
            <Metric label="Price" value={fragrance.price > 0 ? currency.format(fragrance.price) : "Market"} />
            <Metric label="Popularity" value={`${fragrance.popularity}/100`} />
            <Metric label="Longevity" value={`${fragrance.longevityHours}h`} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(fragrance.matchedOn.length ? fragrance.matchedOn : fragrance.accords.slice(0, 5)).map((match) => (
              <span key={match} className="rounded-full bg-ink px-3 py-2 text-xs font-black capitalize text-milk">
                {match}
              </span>
            ))}
          </div>
        </div>
      </button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/55 bg-white/35 p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">{label}</p>
      <p className="mt-1 font-display text-xl font-black tracking-[-0.04em]">{value}</p>
    </div>
  );
}
