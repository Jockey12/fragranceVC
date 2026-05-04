import FragranceFinder from "@/components/FragranceFinder";
import SiteHeader from "@/components/layout/SiteHeader";
import { searchCatalog } from "@/lib/catalog/search-catalog";

export const dynamic = "force-dynamic";

export default async function SelectorPage() {
  const initialResults = await searchCatalog({ sort: "popularity" });
  const apiEnabled = process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true";

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-citron/45 blur-3xl" />
        <div className="absolute right-[10%] top-20 h-80 w-80 rounded-full bg-sage/35 blur-3xl" />
        <div className="absolute bottom-10 left-[28%] h-96 w-96 rounded-full bg-ember/20 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <SiteHeader />
        <section className="grid gap-4">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex rounded-full border border-white/45 bg-white/30 px-4 py-2 text-sm font-bold text-ink/70 shadow-glass backdrop-blur-2xl">
              Fragrance selector
            </p>
            <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.9] tracking-[-0.08em] text-ink sm:text-7xl">
              Choose a scent by vibe, notes, price, or popularity.
            </h1>
          </div>
          <FragranceFinder initialData={initialResults} apiEnabled={apiEnabled} />
        </section>
      </div>
    </main>
  );
}
