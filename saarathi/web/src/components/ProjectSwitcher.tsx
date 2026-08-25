"use client";

import { useRouter } from "next/navigation";
import type { ProjectMeta } from "@/lib/types";

// The project picker in the top bar. It writes the choice to a cookie that the
// server reads on the next render, so every page agrees on which project is in
// view. With one project configured there is nothing to pick, so it stays the
// plain chip it has always been.
export default function ProjectSwitcher({
  projects,
  currentId,
  cookieName,
}: {
  projects: ProjectMeta[];
  currentId: string;
  cookieName: string;
}) {
  const router = useRouter();
  const current = projects.find((p) => p.id === currentId) ?? projects[0];
  const title = current.path || "running on bundled snapshot";

  if (projects.length < 2) {
    return (
      <span className="proj" title={title}>
        <span className="dot" />
        <span>{current.id}</span>
      </span>
    );
  }

  return (
    <span className="proj" title={title}>
      <span className="dot" />
      <select
        aria-label="Project"
        value={current.id}
        onChange={(e) => {
          const value = encodeURIComponent(e.target.value);
          document.cookie = `${cookieName}=${value}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </span>
  );
}
