import type { Metadata } from "next";
import { getCurrentProjectId, getOverview, getSpecs } from "@/lib/data";
import type { SpecFile, TestCase } from "@/lib/types";

export const metadata: Metadata = { title: "Test cases" };
export const dynamic = "force-dynamic";

function Uses({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="uses">
      <span className="lbl">{label}</span>
      {items.map((i) => (
        <span className="chip" key={i}>
          {i}
        </span>
      ))}
    </div>
  );
}

function Test({ test }: { test: TestCase }) {
  return (
    <article className="test-row">
      <div className="test-head">
        <span className="test-title">{test.title}</span>
        {test.tags.map((t) => (
          <span className={`tag ${t.replace("@", "")}`} key={t}>
            {t}
          </span>
        ))}
        <span className="mono test-line">line {test.line}</span>
      </div>

      {test.requirement && (
        <div className="uses">
          <span className="lbl">Requirement</span>
          <span className="chip">{test.requirement}</span>
        </div>
      )}

      {test.steps.length ? (
        <ol className="steps">
          {test.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : (
        <p className="none">No steps written in this test.</p>
      )}

      <Uses label="Pages" items={test.pages} />
      <Uses label="Data" items={test.data} />
    </article>
  );
}

// Spelled out rather than pluralised, because "data" has no plural and
// deriving one gives "Datas".
const IMPORT_LABELS = [
  { kind: "page", label: "Pages" },
  { kind: "fixture", label: "Fixtures" },
  { kind: "data", label: "Data" },
  { kind: "other", label: "Other imports" },
] as const;

function Spec({ spec }: { spec: SpecFile }) {
  return (
    <section className="card spec-card">
      <header className="spec-head">
        <div className="mono spec-file">{spec.file}</div>
        {spec.suite && <div className="spec-suite">{spec.suite}</div>}
        <div className="mono spec-count">
          {spec.tests.length} {spec.tests.length === 1 ? "test" : "tests"}
        </div>
      </header>

      {spec.note && <p className="note">{spec.note}</p>}

      <div className="spec-imports">
        {IMPORT_LABELS.map(({ kind, label }) => (
          <Uses key={kind} label={label} items={spec.imports.filter((i) => i.kind === kind).map((i) => i.from)} />
        ))}
        <Uses label="Setup data" items={spec.setupData} />
      </div>

      {spec.tests.map((t) => (
        <Test key={`${t.line}-${t.title}`} test={t} />
      ))}
    </section>
  );
}

export default async function TestCasesPage() {
  const id = await getCurrentProjectId();
  const [specs, overview] = await Promise.all([getSpecs(id), getOverview(id)]);
  const total = specs.reduce((n, s) => n + s.tests.length, 0);
  const unparsed = specs.filter((s) => !s.parsed);

  return (
    <main className="page-wrap">
      <h1 className="page-h">Test cases</h1>
      <p className="page-sub">
        Read from the project&apos;s spec files, not from a catalog. Every title, tag, step, and
        import below is in the code right now. A file that cannot be read says so rather than
        appearing as a spec with no tests.
      </p>

      {specs.length ? (
        <>
          <p className="report-summary" style={{ marginBottom: 24 }}>
            {specs.length} {specs.length === 1 ? "spec" : "specs"}, {total}{" "}
            {total === 1 ? "test" : "tests"} in {overview.project.name}.
            {unparsed.length > 0 && ` ${unparsed.length} could not be read.`}
          </p>
          {specs.map((s) => (
            <Spec key={s.file} spec={s} />
          ))}
        </>
      ) : (
        <div className="empty-state">
          {overview.live
            ? "No spec files found where this project's Playwright config says its tests live."
            : "This project's folder is not on this machine, so its specs cannot be read."}
        </div>
      )}
    </main>
  );
}
