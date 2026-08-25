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

export interface Overview {
  project: ProjectMeta;
  run: RunStats | null;
  agents: Agent[];
  signals: Signal[];
  counts: { bugs: number; doubts: number; recommendations: number; lessons: number };
  activity: string[];
  live: boolean;        // true if scanned from a real project path, false if snapshot
}
