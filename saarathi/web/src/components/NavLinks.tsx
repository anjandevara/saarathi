"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Global views only. The project's own sections live in the rail.
const items = [{ href: "/reports", label: "Reports" }];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav-row" aria-label="Primary">
      {items.map((it) => {
        const active = pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
