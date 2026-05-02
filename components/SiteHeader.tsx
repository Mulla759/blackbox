import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/90 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-[3.25rem] max-w-[1400px] items-center gap-6 px-4 sm:h-14 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-offset-4"
        >
          <span className="font-display text-[1.05rem] font-extrabold tracking-tight sm:text-lg">
            BLACKBOX
          </span>
          <span
            className="hidden h-2 w-2 shrink-0 bg-accent shadow-[0_0_0_1px_var(--border)] transition-[box-shadow] group-hover:shadow-[0_0_14px_color-mix(in_oklab,var(--accent)_55%,transparent)] sm:block"
            aria-hidden
          />
        </Link>

        <div className="hidden h-7 w-px shrink-0 bg-border sm:block" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            Disaster alerts · NWS feed
          </p>
        </div>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-sm px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground/90 hover:bg-card hover:text-foreground"
          >
            Live
          </Link>
          <Link
            href="/analytics"
            className="rounded-sm px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground/90 hover:bg-card hover:text-foreground"
          >
            Analytics
          </Link>
          <Link
            href="/wellness"
            className="rounded-sm px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground/90 hover:bg-card hover:text-foreground"
          >
            Call check
          </Link>
          <Link
            href="/dashboard"
            className="rounded-sm px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground/90 hover:bg-card hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
