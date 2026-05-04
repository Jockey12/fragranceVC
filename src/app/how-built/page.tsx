import Link from "next/link";

import SiteHeader from "@/components/layout/SiteHeader";

const prompts = [
  {
    title: "Initial Build",
    prompt:
      "Build me a Fragrance/perfume finder, the user selects how/what they want to smell like and It searches through an API/database of all the perfumes that smell like that and can be sorted by Dupe vs original, Price, Popularity. The website must be built in, React or Nextjs. Tailwind css. The website must be Modern and sleek looking, like iOS glass.",
  },
  {
    title: "Full Catalog + Detail Card",
    prompt:
      "I want to have all perfumes, Please use the optimal database for it. Please make the website well structured and Please make the perfumes selectable and show a Card like the Fragrantica Card. Also if its possible have the perfume be a 3d object and make it rotatable. Please push project to GitHub when finished.",
  },
  {
    title: "Final Structure",
    prompt:
      "Scratch the 360 rotating 3d fragrance. I want the Fragrance selector in another section, add a link to the fragrance selector on the main header, make the home page pretty, add a 'How I Built This' page showing the prompts I used. Use an api to get every fragrance info, whether from fragrantica or any public database.",
  },
];

const buildNotes = [
  "Next.js App Router provides separate pages for the landing page, fragrance selector, and build notes.",
  "Tailwind CSS handles the iOS-glass visual system with translucent panels, soft gradients, and rounded controls.",
  "The fragrance API layer prefers PostgreSQL full-catalog search when `DATABASE_URL` is configured, otherwise uses Fragella live API when `FRAGELLA_API_KEY` is configured, and falls back to the local starter catalog for development.",
  "Fragrantica scraping is not implemented because its current terms prohibit unauthorized automated access and unofficial API usage.",
];

export default function HowBuiltPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-16 h-72 w-72 rounded-full bg-citron/45 blur-3xl" />
        <div className="absolute right-[8%] top-28 h-96 w-96 rounded-full bg-sage/30 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <SiteHeader />

        <section className="grid gap-8 py-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex rounded-full border border-white/45 bg-white/30 px-4 py-2 text-sm font-bold text-ink/70 shadow-glass backdrop-blur-2xl">
              Process
            </p>
            <h1 className="font-display text-5xl font-black leading-[0.9] tracking-[-0.08em] sm:text-7xl">
              How I built this.
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-ink/62">
              This page documents the prompts and the engineering choices behind FragranceVC.
            </p>
            <Link
              className="mt-8 inline-flex rounded-full bg-ink px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-milk shadow-glow"
              href="/selector"
            >
              Try the selector
            </Link>
          </div>

          <div className="grid gap-4">
            {prompts.map((item, index) => (
              <article
                key={item.title}
                className="animate-fade-up rounded-[2rem] border border-white/50 bg-white/35 p-5 shadow-glass backdrop-blur-2xl"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <p className="text-sm font-black uppercase tracking-[0.22em] text-ink/42">{item.title}</p>
                <p className="mt-3 text-base font-semibold leading-7 text-ink/68">{item.prompt}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 pb-12 md:grid-cols-2">
          {buildNotes.map((note) => (
            <div key={note} className="rounded-[2rem] border border-white/50 bg-white/30 p-5 shadow-glass backdrop-blur-2xl">
              <p className="text-base font-semibold leading-7 text-ink/64">{note}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
