import type { Metadata } from "next";
import { getCurrentProjectId, getOverview, getHistory, isDbLive } from "@/lib/data";
import type { SignalKind } from "@/lib/types";

export const metadata: Metadata = { title: "Signals" };
export const dynamic = "force-dynamic";

const GROUPS: { kind: SignalKind; label: string; color: string }[] = [
  { kind: "bug", label: "Bugs", color: "var(--warn)" },
  { kind: "doubt", label: "Doubts", color: "var(--warn)" },
  { kind: "recommendation", label: "Recommendations", color: "var(--info)" },
  { kind: "lesson", label: "Lessons", color: "var(--accent)" },
];

export default async function SignalsPage() {
  const id = await getCurrentProjectId();
  const o = await getOverview(id);
  const history = getHistory(id);

  return (
    <main className="page-wrap">
      <h1 className="page-h">Signals</h1>
      <p className="page-sub">
        Everything the agents record about this project: open bugs, unresolved doubts,
        recommendations, and the engineering lessons already locked in as guardrails.
      </p>

      {GROUPS.map((g) => {
        const items = o.signals.filter((s) => s.kind === g.kind);
        return (
          <section key={g.kind} style={{ marginBottom: 28 }}>
            <div className="lbl" style={{ marginBottom: 12, color: g.color }}>
              {g.label} ({items.length})
            </div>
            {items.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((s, i) => (
                  <div className="card" key={i} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13.5, color: "var(--soft)" }}>{s.title}</span>
                    <span
                      className="mono"
                      style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", flex: "0 0 auto" }}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Nothing here. That is a good thing.</div>
            )}
          </section>
        );
      })}

      <section>
        <div className="lbl" style={{ marginBottom: 12 }}>
          Run history{isDbLive() ? "" : " (local database unavailable on this runtime)"}
        </div>
        {history.length ? (
          <div className="card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>When</th>
                  <th style={{ padding: "6px 8px" }}>Total</th>
                  <th style={{ padding: "6px 8px" }}>Passed</th>
                  <th style={{ padding: "6px 8px" }}>Failed</th>
                  <th style={{ padding: "6px 8px" }}>Health</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} style={{ color: "var(--soft)" }}>
                    <td style={{ padding: "6px 8px" }}>
                      {Number.isNaN(new Date(r.at).getTime()) ? r.at : new Date(r.at).toLocaleString()}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{r.total}</td>
                    <td style={{ padding: "6px 8px" }}>{r.passed}</td>
                    <td style={{ padding: "6px 8px" }}>{r.failed}</td>
                    <td style={{ padding: "6px 8px" }}>{r.health}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No runs recorded yet.</div>
        )}
      </section>
    </main>
  );
}
