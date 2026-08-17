"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/phrases", label: "Phrases", icon: "📚" },
  { href: "/drill", label: "Drill", icon: "🎯" },
  { href: "/roleplay", label: "Roleplay", icon: "💬" },
  { href: "/verbs", label: "Verbs", icon: "🔁" },
  { href: "/translate", label: "Translate", icon: "🔤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-around">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
