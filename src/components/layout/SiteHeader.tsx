import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl animate-fade-up items-center justify-between rounded-full border border-white/45 bg-white/30 px-4 py-3 shadow-glass backdrop-blur-2xl">
      <Link className="flex items-center gap-3" href="/">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-black text-milk shadow-glow">
          F
        </div>
        <div>
          <p className="font-display text-base font-black tracking-tight">FragranceVC</p>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">scent finder</p>
        </div>
      </Link>

      <nav className="flex items-center gap-2 rounded-full border border-white/45 bg-white/35 p-1 text-sm font-black text-ink/62 backdrop-blur-xl">
        <Link className="rounded-full px-3 py-2 transition hover:bg-white/65 sm:px-4" href="/selector">
          Selector
        </Link>
        <Link className="hidden rounded-full px-3 py-2 transition hover:bg-white/65 sm:inline-flex sm:px-4" href="/how-built">
          How I Built This
        </Link>
      </nav>
    </header>
  );
}
