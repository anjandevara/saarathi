import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { getCurrentProjectId, getReport } from "@/lib/data";
import { isReportView, resultText, VIEWS } from "@/lib/report";
import type { Period, ProjectLine, ReportView } from "@/lib/report";
import type { Signal } from "@/lib/types";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

function PeriodTable({ heading, periods }: { heading: string; periods: Period[] }) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>{heading}</th>
          <th className="num">Runs</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p.label} className={p.latest ? undefined : "no-run"}>
            <td>{p.label}</td>
            <td className="num">{p.runs}</td>
            <td>{resultText(p.latest)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SignalSection({ label, items }: { label: string; items: Signal[] }) {
  return (
    <section className="report-section">
      <h2 className="lbl">
        {label} ({items.length})
      </h2>
      {items.length ? (
        <ul className="report-list">
          {items.map((s, i) => (
            <li key={i}>{s.title}</li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">None.</div>
      )}
    </section>
  );
}

function ProjectTable({ projects }: { projects: ProjectLine[] }) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>Project</th>
          <th>Env</th>
          <th>Latest run</th>
          <th className="num">Bugs</th>
          <th className="num">Doubts</th>
          <th className="num">Recommendations</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr key={p.project.id} className={p.latest ? undefined : "no-run"}>
            <td>{p.project.name}</td>
            <td>{p.project.env}</td>
            <td>{p.live ? resultText(p.latest) : "path not found on this machine"}</td>
            <td className="num">{p.open ? p.open.bugs : "not read"}</td>
            <td className="num">{p.open ? p.open.doubts : "not read"}</td>
            <td className="num">{p.open ? p.open.recommendations : "not read"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const requested = (await searchParams).view;
  const view: ReportView = isReportView(requested) ? requested : "daily";
  const report = await getReport(view, await getCurrentProjectId());

  return (
    <main className="page-wrap report">
      <h1 className="page-h">Reports</h1>
      <p className="page-sub no-print">
        Built only from what Saarathi has already recorded. Run history is written when a suite runs
        and Saarathi reads the result, not continuously, so a period with no run says &quot;no run&quot;
        rather than showing a number nobody measured.
      </p>

      <nav className="nav-row report-tabs no-print" aria-label="Report views">
        {VIEWS.map((v) => (
          <Link
            key={v.view}
            href={`/reports?view=${v.view}`}
            aria-current={v.view === view ? "page" : undefined}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <div className="report-actions no-print">
        <a className="report-action" href={`/reports/export?view=${view}&project=${report.project.id}`}>
          Export markdown
        </a>
        <PrintButton />
      </div>

      <header className="report-head">
        <div className="lbl">
          {VIEWS.find((v) => v.view === view)?.label} report &middot; {report.project.name} ({report.project.env})
        </div>
        <p className="report-summary">{report.summary}</p>
      </header>

      {(view === "daily" || view === "weekly") && (
        <section className="report-section">
          <PeriodTable heading={view === "daily" ? "Day" : "Week"} periods={report.periods} />
        </section>
      )}

      {view === "pending" && report.pending && (
        <>
          <SignalSection label="Bugs" items={report.pending.bugs} />
          <SignalSection label="Doubts" items={report.pending.doubts} />
          <SignalSection label="Recommendations" items={report.pending.recommendations} />
        </>
      )}

      {view === "projects" && (
        <section className="report-section">
          <ProjectTable projects={report.projects} />
        </section>
      )}
    </main>
  );
}
