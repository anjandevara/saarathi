"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The project's sections. Runs, Failures, Bugs, Traceability, and Docs join
// this list as they are built; nothing else in the chrome has to change.
const sections = [
  { href: "/", label: "Overview" },
  { href: "/agents", label: "Agents" },
  { href: "/test-cases", label: "Test cases" },
  { href: "/data-fixtures", label: "Data and fixtures" },
  { href: "/signals", label: "Signals" },
];

// The per-project rail, persistent chrome on every screen. Reports is a global
// view, so no section is marked active there, which is the honest answer rather
// than highlighting one that is not open.
export default function Rail() {
  const pathname = usePathname();
  return (
    <nav className="rail" aria-label="Project sections">
      {sections.map((s) => {
        const active = s.href === "/" ? pathname === "/" : pathname.startsWith(s.href);
        return (
          <Link key={s.href} href={s.href} aria-current={active ? "page" : undefined}>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
