"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  ["Engines", "#engines"],
  ["How it works", "#how"],
  ["Fleet API", "#fleet"],
  ["Stack", "#stack"],
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={`flex w-full max-w-5xl items-center justify-between rounded-full px-3 py-2.5 transition-all duration-500 ${
          scrolled
            ? "border border-white/[0.08] bg-ink-950/70 shadow-glass backdrop-blur-2xl"
            : "border border-transparent bg-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 pl-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">Gridlock</span>
        </Link>

        <div className="hidden items-center gap-0.5 text-[13px] text-white/55 md:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-1.5 transition hover:bg-white/[0.05] hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/fleet-api"
            className="hidden rounded-full px-4 py-2 text-[13px] text-white/65 transition hover:text-white sm:inline-flex"
          >
            Docs
          </Link>
          <Link href="/dashboard" className="btn-accent !px-5 !py-2 text-[13px]">
            Launch Console
          </Link>
        </div>
      </nav>
    </header>
  );
}
