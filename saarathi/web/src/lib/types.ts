// Shared types for the Saarathi data layer.

export type AgentState = "idle" | "on" | "work" | "wait";

export interface Agent {
  key: string;          // file-derived key, e.g. "triage"
  name: string;         // display name, e.g. "Triage"
  persona: string;      // attribution persona, e.g. "The Diagnostician"
  description: string;  // one line, from the agent file
  state: AgentState;    // live status
  statusLabel: string;  // short label, e.g. "idle", "approval"
}

export interface RunStats {
  number: number;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  health: number;       // percent 0..100
  at: string;           // ISO or human string
}

export type SignalKind = "bug" | "doubt" | "recommendation" | "lesson";

export interface Signal {
  kind: SignalKind;
  title: string;
  status: string;       // e.g. "open", "captured", "resolved"
  at?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  path: string;
  env: string;
}

// What a spec file imports, as written. `kind` is derived from the path, so a
// project laid out differently simply reports "other" rather than guessing.
export interface SpecImport {
  names: string[];   // the bindings imported, e.g. ["DemoPage"]
  from: string;      // the module specifier exactly as written in the file
  kind: "page" | "fixture" | "data" | "other";
}

export interface TestCase {
  title: string;         // the title with its tags removed, for reading
  tags: string[];        // e.g. ["@smoke", "@readOnly"], exactly as written
  requirement: string | null; // from @req(...), null when the spec has none
  steps: string[];       // test.step titles in order, the Given/When/Then
  pages: string[];       // page object classes this test actually uses
  data: string[];        // data files this test names, e.g. "test-data.json"
  line: number;          // 1-based line of the test in its file
}

export interface SpecFile {
  file: string;          // path relative to the project root
  suite: string | null;  // the test.describe title, null when there is none
  imports: SpecImport[];
  tests: TestCase[];
  setupData: string[];   // data the file's setup reads, shared by every test
  parsed: boolean;       // false when the file looks like a spec but yielded nothing
  note: string | null;   // why it could not be read, shown on screen
}

export interface Overview {
  project: ProjectMeta;
  run: RunStats | null;
  agents: Agent[];
  signals: Signal[];
  counts: { bugs: number; doubts: number; recommendations: number; lessons: number };
  activity: string[];
  live: boolean;        // true if scanned from a real project path, false if snapshot
}
