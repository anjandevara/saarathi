"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Command" },
  { href: "/agents", label: "Agents" },
  { href: "/signals", label: "Signals" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav-row" aria-label="Primary">
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
