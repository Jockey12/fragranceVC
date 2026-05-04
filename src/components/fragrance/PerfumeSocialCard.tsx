"use client";

import RotatableBottle from "@/components/fragrance/RotatableBottle";
import type { FragranceResult } from "@/lib/fragrance-search";

type Props = {
  fragrance: FragranceResult;
};

const seasonLabels = ["winter", "spring", "summer", "fall"];

export default function PerfumeSocialCard({ fragrance }: Props) {
  const notes = [...fragrance.topNotes, ...fragrance.heartNotes, ...fragrance.baseNotes].slice(0, 6);
  const nightScore = fragrance.occasions.some((item) => /date|night|evening|party|club/i.test(item)) ? 64 : 36;
  const dayScore = 100 - nightScore;

  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-white/55 bg-[#e7f0df]/80 shadow-glass backdrop-blur-2xl">
      <div className="grid gap-5 bg-gradient-to-r from-[#eff4e9] via-[#dceeea] to-[#edf5d2] p-5 sm:p-6 lg:grid-cols-[0.9fr_1.35fr]">
        <div className="grid content-between gap-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-5xl font-black leading-none tracking-[-0.07em] text-[#1f2924]">
                  {fragrance.name}
                </h2>
                <p className="mt-2 text-2xl font-medium text-[#1f2924]/60">{fragrance.house}</p>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1f2924]/42">
                  {fragrance.gender}
                  {fragrance.year ? ` / ${fragrance.year}` : ""}
                </p>
              </div>
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/70 bg-white/75 text-center text-[0.62rem] font-black uppercase leading-tight tracking-[0.14em] text-ink/55">
                Scent
                <br />
                Card
              </div>
            </div>

            <RotatableBottle fragrance={fragrance} />

            <div className="mt-2 text-center">
              <p className="font-display text-4xl font-black tracking-[-0.06em]">{fragrance.rating.toFixed(1)}</p>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-ink/42">
                {fragrance.votes ? `${fragrance.votes.toLocaleString()} votes` : `${fragrance.popularity}/100 popularity`}
              </p>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/75 bg-white/62 p-4 shadow-sm">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-ink/42">Notes</p>
            <div className="grid grid-cols-3 gap-3">
              {notes.map((note) => (
                <div key={note} className="rounded-2xl border border-white/80 bg-white/75 p-2 text-center shadow-sm">
                  <div
                    className="mb-2 grid aspect-square place-items-center rounded-xl text-lg font-black text-white"
                    style={{ background: `linear-gradient(145deg, ${fragrance.colorA}, ${fragrance.colorB})` }}
                  >
                    {note.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-bold capitalize leading-tight text-ink/65">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-5">
          <CardPanel title="Main Accords">
            <div className="grid gap-2">
              {fragrance.accords.slice(0, 6).map((accord, index) => (
                <div
                  key={accord}
                  className="rounded-xl px-4 py-2 text-base font-semibold capitalize text-white shadow-sm"
                  style={{
                    width: `${Math.max(50, 96 - index * 9)}%`,
                    background: accordColor(accord, index),
                  }}
                >
                  {accord}
                </div>
              ))}
            </div>
          </CardPanel>

          <CardPanel title="Fragrance Profile">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfilePill label="Longevity" value={`${fragrance.longevityHours} h`} />
              <ProfilePill label="Sillage" value={fragrance.projection} />
              <ProfilePill label="Type" value={fragrance.concentration} />
              <ProfilePill label="Price" value={fragrance.price > 0 ? `$${fragrance.price}` : "Market"} />
            </div>
          </CardPanel>

          <CardPanel title="Day Time">
            <div className="flex overflow-hidden rounded-2xl border border-white/80 bg-white/70 text-sm font-black text-ink/62">
              <div className="bg-sky-200/80 px-4 py-3 text-center" style={{ width: `${dayScore}%` }}>
                Day
              </div>
              <div className="bg-slate-600 px-4 py-3 text-center text-white" style={{ width: `${nightScore}%` }}>
                Night
              </div>
            </div>
          </CardPanel>

          <CardPanel title="Seasons">
            <div className="grid gap-3 sm:grid-cols-2">
              {seasonLabels.map((season) => {
                const active = fragrance.seasons.includes(season) || fragrance.seasons.includes("all season");

                return (
                  <div key={season} className="overflow-hidden rounded-2xl bg-slate-200/80">
                    <div
                      className="px-4 py-3 text-sm font-black capitalize text-ink/64"
                      style={{
                        width: active ? "72%" : "24%",
                        background: seasonColor(season),
                      }}
                    >
                      {season}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardPanel>
        </div>
      </div>
    </section>
  );
}

function CardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-white/75 bg-white/62 p-4 shadow-sm">
      <p className="mb-3 text-xl font-light lowercase tracking-[0.02em] text-ink/42">{title}</p>
      {children}
    </div>
  );
}

function ProfilePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/78 px-4 py-3 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/38">{label}</p>
      <p className="mt-1 text-base font-bold text-ink/76">{value}</p>
    </div>
  );
}

function accordColor(accord: string, index: number) {
  const normalized = accord.toLowerCase();
  if (normalized.includes("vanilla") || normalized.includes("sweet")) return "#f0cf57";
  if (normalized.includes("green")) return "#138c25";
  if (normalized.includes("fresh") || normalized.includes("aquatic")) return "#66b5d8";
  if (normalized.includes("amber") || normalized.includes("spicy")) return "#bd520f";
  if (normalized.includes("woody") || normalized.includes("leather")) return "#6c4b2c";
  if (normalized.includes("floral") || normalized.includes("rose")) return "#d46f94";
  if (normalized.includes("musk") || normalized.includes("clean")) return "#8aa2a0";
  return ["#3aa491", "#8ac81f", "#253c33", "#c76c31"][index % 4];
}

function seasonColor(season: string) {
  if (season === "winter") return "#92c7ea";
  if (season === "spring") return "#9bdc69";
  if (season === "summer") return "#ffc340";
  return "#ef7a2f";
}
