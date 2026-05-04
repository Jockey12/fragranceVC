import FragranceFinder from "@/components/FragranceFinder";
import { searchFragrances } from "@/lib/fragrance-search";

export default function Home() {
  const initialResults = searchFragrances({ sort: "popularity" });

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-citron/45 blur-3xl" />
        <div className="absolute right-[10%] top-20 h-80 w-80 rounded-full bg-sage/35 blur-3xl" />
        <div className="absolute bottom-10 left-[28%] h-96 w-96 rounded-full bg-ember/20 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <nav className="flex animate-fade-up items-center justify-between rounded-full border border-white/45 bg-white/30 px-4 py-3 shadow-glass backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-black text-milk shadow-glow">
              F
            </div>
            <div>
              <p className="font-display text-base font-black tracking-tight">FragranceVC</p>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">scent finder</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/50 bg-white/35 px-4 py-2 text-sm font-bold text-ink/65 backdrop-blur-xl sm:flex">
            <span className="h-2 w-2 rounded-full bg-sage" />
            Catalog API ready
          </div>
        </nav>

        <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="animate-fade-up [animation-delay:120ms]">
            <p className="mb-4 inline-flex rounded-full border border-white/45 bg-white/30 px-4 py-2 text-sm font-bold text-ink/70 shadow-glass backdrop-blur-2xl">
              Describe the vibe. Compare originals and dupes.
            </p>
            <h1 className="font-display text-5xl font-black leading-[0.9] tracking-[-0.08em] text-ink sm:text-7xl lg:text-8xl">
              Find the scent that says it before you do.
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-ink/65">
              Pick how you want to smell: clean, expensive, cozy, romantic, smoky, beachy, office-ready,
              or anything else. The finder supports a local catalog, Fragella API, or a PostgreSQL full-catalog import.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
              {[
                [String(initialResults.databaseSize), "starter scents"],
                ["6", "sort modes"],
                ["SQL", "full catalog ready"],
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

          <FragranceFinder initialData={initialResults} />
        </section>
      </div>
    </main>
  );
}
