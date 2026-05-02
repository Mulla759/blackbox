import Link from "next/link";

export function SiteHeader({
  context,
}: {
  context?: string;
}) {
  return (
    <header className="border-b hairline">
      <div className="mx-auto max-w-[1400px] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-lg font-extrabold tracking-tight">
            LIFELINE
          </span>
          {context ? (
            <span className="text-eyebrow">{context}</span>
          ) : null}
        </Link>
        <nav className="flex items-center gap-6 text-eyebrow">
          <Link href="/me" className="hover:text-foreground">
            Individual
          </Link>
          <Link href="/dispatcher" className="hover:text-foreground">
            Dispatcher
          </Link>
        </nav>
      </div>
    </header>
  );
}
