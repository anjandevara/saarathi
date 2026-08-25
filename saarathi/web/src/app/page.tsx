import CommandCore from "@/components/CommandCore";
import { getOverview } from "@/lib/data";

// Always reflect the current project state (reads files at request time).
export const dynamic = "force-dynamic";

function Bar({ kind, label, value, total }: { kind: string; label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar">
      <div className="t">
        <span className="k">{label}</span>
        <span className="val">{value}</span>
      </div>
      <div className="track">
        <div className={`fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Home() {
  const o = await getOverview();
  const run = o.run;
  const health = run ? run.health : 0;

  return (
    <>
      <CommandCore health={health} />

      <div className="core-readout">
        <div className="inner">
          {run ? (
            <>
              <div className="big">
                {run.health}
                <span>%</span>
              </div>
              <div className="cap">
                <span className="lbl">Suite health</span>
              </div>
              <div className="sub2">
                last run &middot; {run.total} tests &middot; {run.passed} passing
              </div>
            </>
          ) : (
            <>
              <div className="big" style={{ fontSize: 30 }}>
                No run yet
              </div>
              <div className="sub2">Run your Playwright suite to populate this</div>
            </>
          )}
        </div>
      </div>

      <aside className="panel left" aria-label="System status">
        <div className="head">
          <span className="lbl">System Status</span>
          <span className="n">{o.live ? "LIVE" : "SNAPSHOT"}</span>
        </div>
        <div className="body">
          {run ? (
            <>
              <div className="metric">
                <span className="v">{run.passed}</span>
                <span className="u">/ {run.total} passed</span>
              </div>
              <div className="bars">
                <Bar kind="pass" label="Passed" value={run.passed} total={run.total} />
                <Bar kind="fail" label="Failed" value={run.failed} total={run.total} />
                <Bar kind="flaky" label="Flaky" value={run.flaky} total={run.total} />
              </div>
            </>
          ) : (
            <div className="empty-state">No test run recorded yet.</div>
          )}
        </div>
      </aside>

      <aside className="panel right" aria-label="Agents">
        <div className="head">
          <span className="lbl">Agents</span>
          <span className="n">{o.agents.length} CONFIGURED</span>
        </div>
        <div className="body" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {o.agents.length ? (
            o.agents.map((a) => (
              <div className="agent-row" key={a.key} title={a.persona}>
                <span className={`d ${a.state}`} />
                <span className="nm">{a.name}</span>
                <span className={`st ${a.state}`}>{a.statusLabel}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No agents found.</div>
          )}
        </div>
      </aside>

      <div className="dock">
        <div className="ticker">
          <span className="lbl">Activity</span>
          <div className="stream-wrap">
            <span className="stream" title={o.activity.join("   ·   ")}>{o.activity.join("   ·   ")}</span>
          </div>
        </div>
        <div className="counts">
          <div className="count">
            <div className={`v ${o.counts.bugs ? "warn" : "teal"}`}>{o.counts.bugs}</div>
            <div className="l">Bugs open</div>
          </div>
          <div className="count">
            <div className={`v ${o.counts.doubts ? "warn" : "teal"}`}>{o.counts.doubts}</div>
            <div className="l">Doubts</div>
          </div>
          <div className="count">
            <div className="v teal">{o.counts.recommendations}</div>
            <div className="l">Recs</div>
          </div>
          <div className="count">
            <div className="v teal">{o.counts.lessons}</div>
            <div className="l">Lessons</div>
          </div>
        </div>
      </div>
    </>
  );
}
