import type { Metadata } from "next";
import { getCurrentProjectId, getOverview } from "@/lib/data";

export const metadata: Metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

const DOT: Record<string, string> = {
  idle: "var(--faint)",
  on: "var(--accent)",
  work: "var(--info)",
  wait: "var(--warn)",
};

export default async function AgentsPage() {
  const o = await getOverview(await getCurrentProjectId());
  return (
    <main className="page-wrap">
      <h1 className="page-h">Agents</h1>
      <p className="page-sub">
        Six single-job agents that write, review, run, and heal the tests. Each has one clear
        responsibility and a persona, so their work reads like a team you manage, not a black box.
      </p>
      <div className="grid-cards">
        {o.agents.map((a) => (
          <article className="card" key={a.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: "50%", background: DOT[a.state], flex: "0 0 auto" }}
              />
              <span className="hud" style={{ fontWeight: 700, letterSpacing: "0.02em", fontSize: 16 }}>
                {a.name}
              </span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase" }}>
                {a.statusLabel}
              </span>
            </div>
            <div className="lbl" style={{ marginBottom: 10, color: "var(--accent-ink)" }}>
              {a.persona}
            </div>
            <p style={{ color: "var(--soft)", fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{a.description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
