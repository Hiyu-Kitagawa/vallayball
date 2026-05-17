"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "カレンダー" },
  { href: "/summary", label: "集計" },
  { href: "/gyms", label: "体育館" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-white/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 sm:max-w-5xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-court-green text-sm font-black text-white">
              V
            </span>
            <span>
              <span className="block text-base font-bold leading-5 text-court-navy">Volley Plan</span>
              <span className="block text-[11px] font-semibold text-slate-500">練習予定調整</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5 sm:max-w-5xl sm:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-2 text-center text-xs font-bold transition ${
                  active ? "bg-court-navy text-white" : "text-slate-500 hover:bg-court-sky hover:text-court-green"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="mx-auto hidden max-w-5xl px-6 pb-6 sm:block">
        <div className="flex gap-2">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                  active ? "bg-court-navy text-white" : "bg-white text-slate-600 hover:bg-court-sky hover:text-court-green"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
