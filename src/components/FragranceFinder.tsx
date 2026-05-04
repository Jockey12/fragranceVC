"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import FragranceResultCard from "@/components/fragrance/FragranceResultCard";
import PerfumeSocialCard from "@/components/fragrance/PerfumeSocialCard";
import { accordSuggestions, moodSuggestions, occasionSuggestions } from "@/data/fragrances";
import { searchFragrances } from "@/lib/fragrance-search";
import type {
  FinderBudget,
  FinderGender,
  FinderKindFilter,
  FinderSort,
  FragranceResult,
  FragranceSearchResponse,
} from "@/lib/fragrance-search";

type Props = {
  initialData: FragranceSearchResponse;
  apiEnabled?: boolean;
};

const sortOptions: { value: FinderSort; label: string }[] = [
  { value: "match", label: "Best match" },
  { value: "dupe-first", label: "Dupes first" },
  { value: "original-first", label: "Originals first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popularity", label: "Popularity" },
];

const budgetOptions: { value: FinderBudget; label: string }[] = [
  { value: "all", label: "Any price" },
  { value: "under-50", label: "Under $50" },
  { value: "under-100", label: "Under $100" },
  { value: "under-200", label: "Under $200" },
  { value: "premium", label: "Premium" },
];

const kindOptions: { value: FinderKindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "dupe", label: "Dupes" },
  { value: "original", label: "Originals" },
];

const genderOptions: { value: FinderGender; label: string }[] = [
  { value: "all", label: "Any vibe" },
  { value: "unisex", label: "Unisex" },
  { value: "feminine", label: "Feminine" },
  { value: "masculine", label: "Masculine" },
];

const quickBriefs = [
  {
    label: "Clean office",
    query: "clean professional fresh musk polished office",
    accords: ["clean", "musk", "fresh"],
    mood: "professional",
    occasion: "office",
  },
  {
    label: "Expensive date",
    query: "expensive seductive amber sweet luxury date night",
    accords: ["amber", "sweet", "luxury"],
    mood: "expensive",
    occasion: "date night",
  },
  {
    label: "Cozy vanilla",
    query: "cozy vanilla gourmand warm cinnamon",
    accords: ["vanilla", "gourmand", "sweet"],
    mood: "cozy",
    occasion: "cold weather",
  },
  {
    label: "Beach air",
    query: "fresh aquatic salty vacation clean beach",
    accords: ["aquatic", "fresh", "clean"],
    mood: "vacation",
    occasion: "vacation",
  },
];

const RESULTS_BATCH_SIZE = 24;
const QUERY_MAX_LENGTH = 180;

export default function FragranceFinder({ initialData, apiEnabled = true }: Props) {
  const [query, setQuery] = useState("");
  const [selectedAccords, setSelectedAccords] = useState<string[]>([]);
  const [mood, setMood] = useState("any");
  const [occasion, setOccasion] = useState("any");
  const [budget, setBudget] = useState<FinderBudget>("all");
  const [kind, setKind] = useState<FinderKindFilter>("all");
  const [gender, setGender] = useState<FinderGender>("all");
  const [sort, setSort] = useState<FinderSort>("match");
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<FragranceResult | undefined>(initialData.results[0]);
  const [visibleCount, setVisibleCount] = useState(RESULTS_BATCH_SIZE);
  const [syncTick, setSyncTick] = useState(0);
  const [bubbleBurst, setBubbleBurst] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const activeFilters = useMemo(
    () =>
      [
        ...selectedAccords,
        mood !== "any" ? mood : "",
        occasion !== "any" ? occasion : "",
        budget !== "all" ? budget.replace("-", " ") : "",
        kind !== "all" ? kind : "",
        gender !== "all" ? gender : "",
      ].filter(Boolean),
    [budget, gender, kind, mood, occasion, selectedAccords],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const params = new URLSearchParams();

    if (deferredQuery.trim()) params.set("query", deferredQuery.trim());
    selectedAccords.forEach((accord) => params.append("accord", accord));
    params.set("mood", mood);
    params.set("occasion", occasion);
    params.set("budget", budget);
    params.set("gender", gender);
    params.set("kind", kind);
    params.set("sort", sort);

    setIsLoading(true);

    if (!apiEnabled) {
      const nextData = searchFragrances({
        query: deferredQuery,
        accords: selectedAccords,
        mood,
        occasion,
        budget,
        gender,
        kind,
        sort,
      });

      setData({
        ...nextData,
        sourceLabel: "Static catalog",
        dataNotice: "GitHub Pages is static, so this selector uses the bundled catalog. Use Vercel/Netlify for live API search.",
      });
      setSelected((current) => {
        if (!nextData.results.length) return undefined;
        return nextData.results.find((fragrance) => fragrance.id === current?.id) ?? nextData.results[0];
      });
      setIsLoading(false);

      return () => {
        active = false;
        controller.abort();
      };
    }

    fetch(`/api/fragrances?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load fragrance matches.");
        }

        return response.json() as Promise<FragranceSearchResponse>;
      })
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setSelected((current) => {
          if (!nextData.results.length) return undefined;
          return nextData.results.find((fragrance) => fragrance.id === current?.id) ?? nextData.results[0];
        });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [budget, deferredQuery, gender, kind, mood, occasion, selectedAccords, sort, syncTick]);

  useEffect(() => {
    setVisibleCount(RESULTS_BATCH_SIZE);
  }, [budget, deferredQuery, gender, kind, mood, occasion, selectedAccords, sort]);

  useEffect(() => {
    if (!apiEnabled || data.sync?.status !== "syncing") return;

    const timer = window.setTimeout(() => setSyncTick((current) => current + 1), 2500);
    return () => window.clearTimeout(timer);
  }, [apiEnabled, data.sync?.processedPrefixes, data.sync?.status, data.sync?.totalPrefixes]);

  function toggleAccord(accord: string) {
    startTransition(() => {
      setSelectedAccords((current) =>
        current.includes(accord) ? current.filter((item) => item !== accord) : [...current, accord],
      );
    });
  }

  function applyBrief(brief: (typeof quickBriefs)[number]) {
    startTransition(() => {
      setQuery(brief.query);
      setSelectedAccords(brief.accords);
      setMood(brief.mood);
      setOccasion(brief.occasion);
      setSort("match");
    });
  }

  function resetFilters() {
    startTransition(() => {
      setQuery("");
      setSelectedAccords([]);
      setMood("any");
      setOccasion("any");
      setBudget("all");
      setKind("all");
      setGender("all");
      setSort("match");
    });
  }

  function selectFragrance(fragrance: FragranceResult) {
    setSelected(fragrance);
    setBubbleBurst((current) => current + 1);
  }

  return (
    <div
      className="glass-panel animate-fade-up rounded-[2.5rem] p-4 [animation-delay:220ms] sm:p-6 lg:p-7"
      aria-busy={isLoading || isPending}
    >
      <BubbleBurst key={bubbleBurst} active={bubbleBurst > 0} fragrance={selected} />
      <div className="relative z-10 grid gap-5">
        <div className="grid gap-4 rounded-[2rem] border border-white/50 bg-white/30 p-4 backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-ink/45">Scent brief</p>
              <h2 className="font-display text-3xl font-black tracking-[-0.05em]">How do you want to smell?</h2>
            </div>
            <button
              className="rounded-full border border-white/60 bg-white/40 px-4 py-2 text-sm font-black text-ink/70 transition hover:bg-white/65"
              type="button"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>

          <textarea
            className="min-h-28 resize-none rounded-[1.5rem] border border-white/60 bg-milk/55 p-4 text-base font-semibold leading-7 text-ink outline-none ring-0 backdrop-blur-xl placeholder:text-ink/35 focus:border-ink/30"
            placeholder="Example: I want to smell clean, expensive, a little sweet, and good for date night..."
            value={query}
            maxLength={QUERY_MAX_LENGTH}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {quickBriefs.map((brief) => (
              <button
                key={brief.label}
                type="button"
                className="rounded-2xl border border-white/55 bg-white/35 px-3 py-3 text-left text-sm font-black text-ink/70 transition hover:-translate-y-0.5 hover:bg-white/60"
                onClick={() => applyBrief(brief)}
              >
                {brief.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-4">
            <FilterBlock title="Accords">
              <div className="flex flex-wrap gap-2">
                {accordSuggestions.map((accord) => {
                  const isSelected = selectedAccords.includes(accord);

                  return (
                    <button
                      key={accord}
                      className={`rounded-full border px-3 py-2 text-sm font-black capitalize transition ${
                        isSelected
                          ? "border-ink bg-ink text-milk shadow-glow"
                          : "border-white/55 bg-white/35 text-ink/65 hover:bg-white/60"
                      }`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleAccord(accord)}
                    >
                      {accord}
                    </button>
                  );
                })}
              </div>
            </FilterBlock>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectControl label="Mood" value={mood} onChange={setMood}>
                <option value="any">Any mood</option>
                {moodSuggestions.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </SelectControl>

              <SelectControl label="Occasion" value={occasion} onChange={setOccasion}>
                <option value="any">Any occasion</option>
                {occasionSuggestions.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </SelectControl>

              <SelectControl label="Price" value={budget} onChange={(value) => setBudget(value as FinderBudget)}>
                {budgetOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectControl>

              <SelectControl label="Identity" value={gender} onChange={(value) => setGender(value as FinderGender)}>
                {genderOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectControl>
            </div>

            <div className="rounded-[2rem] border border-white/50 bg-white/30 p-4 backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-ink/45">Catalog</p>
                  <h3 className="font-display text-2xl font-black tracking-[-0.04em]">
                    {data.total} matches from {data.databaseSize}
                  </h3>
                </div>
                <div
                  className="rounded-full bg-ink/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-ink/55"
                  aria-live="polite"
                >
                  {isLoading || isPending ? "Searching" : data.sourceLabel}
                </div>
              </div>

              {data.dataNotice ? <p className="mb-4 text-sm font-semibold leading-6 text-ink/55">{data.dataNotice}</p> : null}
              {data.sync ? (
                <p className="mb-4 rounded-xl border border-white/45 bg-white/45 px-3 py-2 text-xs font-black uppercase tracking-[0.15em] text-ink/55">
                  Sync {data.sync.status}
                  {data.sync.status === "syncing"
                    ? ` · ${data.sync.processedPrefixes}/${data.sync.totalPrefixes}`
                    : ""}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                {kindOptions.map((item) => (
                  <button
                    key={item.value}
                    className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                      kind === item.value
                        ? "border-ink bg-ink text-milk"
                        : "border-white/55 bg-white/35 text-ink/65 hover:bg-white/60"
                    }`}
                    type="button"
                    aria-pressed={kind === item.value}
                    onClick={() => setKind(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <SelectControl label="Sort by" value={sort} onChange={(value) => setSort(value as FinderSort)}>
                  {sortOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </SelectControl>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {selected ? (
              <PerfumeSocialCard fragrance={selected} />
            ) : (
              <div className="rounded-[2rem] border border-white/50 bg-white/35 p-8 text-center backdrop-blur-2xl">
                <p className="font-display text-2xl font-black tracking-[-0.04em]">Select a perfume.</p>
                <p className="mt-2 text-sm font-semibold text-ink/55">Search or loosen filters to load a fragrance card.</p>
              </div>
            )}

            {activeFilters.length ? (
              <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-white/50 bg-white/30 p-3 backdrop-blur-2xl">
                {activeFilters.slice(0, 9).map((filter) => (
                  <span key={filter} className="rounded-full bg-white/55 px-3 py-2 text-xs font-black capitalize text-ink/55">
                    {titleCase(filter)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          {data.results.length > 0 ? (
            <>
              {data.results.slice(0, visibleCount).map((fragrance, index) => (
                <FragranceResultCard
                  key={fragrance.id}
                  fragrance={fragrance}
                  index={index}
                  selected={selected?.id === fragrance.id}
                  onSelect={selectFragrance}
                />
              ))}

              {visibleCount < data.results.length ? (
                <button
                  className="rounded-[1.5rem] border border-white/50 bg-white/35 px-4 py-3 text-sm font-black text-ink/70 backdrop-blur-2xl transition hover:bg-white/55"
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => Math.min(current + RESULTS_BATCH_SIZE, data.results.length))
                  }
                >
                  Show more fragrances ({data.results.length - visibleCount} remaining)
                </button>
              ) : null}
            </>
          ) : (
            <div className="rounded-[2rem] border border-white/50 bg-white/35 p-8 text-center backdrop-blur-2xl">
              <p className="font-display text-2xl font-black tracking-[-0.04em]">No exact matches yet.</p>
              <p className="mt-2 text-sm font-semibold text-ink/55">
                Try removing one filter or using broader words like clean, sweet, woody, fresh, cozy, or luxury.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BubbleBurst({ active, fragrance }: { active: boolean; fragrance?: FragranceResult }) {
  if (!active || !fragrance) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2.5rem]">
      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={`${fragrance.id}-${index}`}
          className="bubble-pop absolute rounded-full border border-white/45 bg-white/35 shadow-glow backdrop-blur-xl"
          style={{
            left: `${12 + ((index * 19) % 74)}%`,
            top: `${18 + ((index * 31) % 58)}%`,
            width: `${1.2 + (index % 5) * 0.55}rem`,
            height: `${1.2 + (index % 5) * 0.55}rem`,
            background: `linear-gradient(145deg, ${fragrance.colorA}80, ${fragrance.colorB}55)`,
            animationDelay: `${index * 42}ms`,
          }}
        />
      ))}
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/50 bg-white/30 p-4 backdrop-blur-2xl">
      <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-ink/45">{title}</p>
      {children}
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 rounded-[1.5rem] border border-white/50 bg-white/30 p-3 backdrop-blur-2xl">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-ink/45">{label}</span>
      <select
        className="rounded-2xl border border-white/55 bg-milk/55 px-3 py-3 text-sm font-black text-ink outline-none focus:border-ink/30"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function titleCase(value: string) {
  return value
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
