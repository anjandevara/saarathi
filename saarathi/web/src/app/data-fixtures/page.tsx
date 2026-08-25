import type { Metadata } from "next";
import { getCurrentProjectId, getDataAndFixtures } from "@/lib/data";
import type { DataFile, DataFolder } from "@/lib/types";

export const metadata: Metadata = { title: "Data and fixtures" };
export const dynamic = "force-dynamic";

function size(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} kB`;
}

function File({ file }: { file: DataFile }) {
  const orphan = file.usedBy.length === 0;
  return (
    <article className={`test-row${orphan ? " orphan" : ""}`}>
      <div className="test-head">
        <span className="mono test-title">{file.path}</span>
        {orphan && <span className="tag unnamed">not named by any spec</span>}
        <span className="mono test-line">{size(file.bytes)}</span>
      </div>

      {orphan ? (
        <p className="none">No spec names this file by a literal path.</p>
      ) : (
        <ul className="steps">
          {file.usedBy.map((u, i) => (
            <li key={i}>
              {u.test ? (
                <>
                  {u.test} <span className="mono dim">in {u.spec}</span>
                </>
              ) : (
                <>
                  Read in the setup of <span className="mono dim">{u.spec}</span>, shared by every test in that file
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Folder({ folder }: { folder: DataFolder }) {
  const orphans = folder.files.filter((f) => f.usedBy.length === 0).length;
  return (
    <section className="card spec-card">
      <header className="spec-head">
        <div className="mono spec-file">{folder.path}/</div>
        <div className="mono spec-count">
          {folder.files.length} {folder.files.length === 1 ? "file" : "files"}
          {orphans > 0 && `, ${orphans} named by no spec`}
        </div>
      </header>

      {folder.emptySubfolders.length > 0 && (
        <div className="spec-imports">
          <div className="uses">
            <span className="lbl">Holds no data file</span>
            {folder.emptySubfolders.map((s) => (
              <span className="chip" key={s}>
                {folder.path}/{s}/
              </span>
            ))}
          </div>
        </div>
      )}

      {folder.files.length ? (
        folder.files.map((f) => <File key={f.path} file={f} />)
      ) : (
        <p className="none" style={{ padding: "14px 18px" }}>
          This folder exists but holds no data file.
        </p>
      )}
    </section>
  );
}

export default async function DataFixturesPage() {
  const id = await getCurrentProjectId();
  const result = await getDataAndFixtures(id);

  if (!result) {
    return (
      <main className="page-wrap">
        <h1 className="page-h">Data and fixtures</h1>
        <div className="empty-state">
          This project&apos;s folder is not on this machine, so its data and fixtures cannot be read.
        </div>
      </main>
    );
  }

  const { folders, fixtureModules, missing } = result;

  return (
    <main className="page-wrap">
      <h1 className="page-h">Data and fixtures</h1>
      <p className="page-sub">
        The folders this project really has, and which test names each file. Test data is the values
        a test feeds in. A fixture is the reusable stage it runs on, and is code, not JSON. This
        project keeps its data files inside <span className="mono">fixtures/</span> and its Playwright
        fixture in <span className="mono">base-test</span>, so that is how it is shown here.
      </p>

      {/* The limit of the heuristic, on the screen rather than in a comment. A
          reader who does not know this could mistake the orphan list for dead files. */}
      <p className="caveat">
        Usage is read from literal strings in the specs, <span className="mono">readFixture(&apos;...&apos;)</span> and
        path literals. A file whose path is built at runtime cannot be seen this way, so &quot;not named
        by any spec&quot; means exactly that, and not that the file is unused.
      </p>

      {folders.length === 0 ? (
        <div className="empty-state">
          This project has no data folder. Saarathi looks for fixtures, data, test-data, and testdata.
        </div>
      ) : (
        folders.map((f) => <Folder key={f.path} folder={f} />)
      )}

      <section className="card spec-card">
        <header className="spec-head">
          <div className="mono spec-file">Fixtures, as code</div>
          <div className="mono spec-count">
            {fixtureModules.length} {fixtureModules.length === 1 ? "module" : "modules"}
          </div>
        </header>
        {fixtureModules.length ? (
          fixtureModules.map((m) => (
            <article className="test-row" key={m.from}>
              <div className="test-head">
                <span className="mono test-title">{m.from}</span>
                <span className="mono test-line">
                  {m.specs.length} {m.specs.length === 1 ? "spec" : "specs"}
                </span>
              </div>
              <div className="uses">
                <span className="lbl">Imported by</span>
                {m.specs.map((s) => (
                  <span className="chip" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))
        ) : (
          <p className="none" style={{ padding: "14px 18px" }}>
            No spec imports its test object from a fixture module.
          </p>
        )}
      </section>

      {missing.length > 0 && (
        <section className="card spec-card">
          <header className="spec-head">
            <div className="mono spec-file">Named by a spec, not found on disk</div>
            <div className="mono spec-count">{missing.length}</div>
          </header>
          {missing.map((m) => (
            <article className="test-row" key={m}>
              <div className="test-head">
                <span className="mono test-title">{m}</span>
                <span className="tag unnamed">missing</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
