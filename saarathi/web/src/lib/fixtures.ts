import { promises as fs } from "node:fs";
import path from "node:path";
import type { DataAndFixtures, DataFile, DataFolder, DataUse, SpecFile } from "./types";

// Turns the spec parser's answer to "what does this test use" around into
// "what uses this file", and lists the data folders the project really has.
//
// The honest limit, stated here and on screen: the parser sees literal strings
// only, readFixture('...') and a path literal containing fixtures/. A file
// whose path is built at runtime is invisible to it. So a file with no
// recorded use is "not named by a literal path in any spec", which is not the
// same claim as "unused". Calling such a file dead would be exactly the
// confident-but-wrong claim this project refuses to make.

// Folders are reported only if they exist. This framework keeps its JSON data
// inside fixtures/, so a project without a data/ folder gets no data/ section
// rather than an empty one invented to satisfy a taxonomy.
const DATA_FOLDERS = ["fixtures", "data", "test-data", "testdata"];

export interface ScannedFile {
  rel: string; // path within its folder, e.g. "files/sample-resume.txt"
  bytes: number;
}

export interface ScannedFolder {
  path: string;
  files: ScannedFile[];
  emptySubfolders: string[];
}

function normalise(ref: string): string {
  return ref.replace(/^\.\//, "").trim();
}

/**
 * The inverter. Pure: scanned folders and parsed specs in, usage out.
 * Matching is exact on the path a spec would write. Nothing is matched on file
 * name alone, because two folders can hold the same name and a near-miss would
 * credit a file with a use it does not have.
 */
export function buildDataAndFixtures(specs: SpecFile[], folders: ScannedFolder[]): DataAndFixtures {
  // Every literal reference any spec makes, with where it was made.
  const references = new Map<string, DataUse[]>();
  const add = (ref: string, use: DataUse) => {
    const key = normalise(ref);
    references.set(key, [...(references.get(key) ?? []), use]);
  };
  for (const spec of specs) {
    for (const ref of spec.setupData) add(ref, { spec: spec.file, test: null });
    for (const test of spec.tests) {
      for (const ref of test.data) add(ref, { spec: spec.file, test: test.title });
    }
  }

  const matched = new Set<string>();
  const built: DataFolder[] = folders.map((folder) => {
    const files: DataFile[] = folder.files.map((file) => {
      // A spec may name the file relative to its folder, which is what
      // readFixture takes, or with the folder in front.
      const keys = [file.rel, `${folder.path}/${file.rel}`];
      const usedBy = keys.flatMap((k) => references.get(k) ?? []);
      for (const k of keys) if (references.has(k)) matched.add(k);
      return { path: `${folder.path}/${file.rel}`, ref: file.rel, bytes: file.bytes, usedBy };
    });
    return { path: folder.path, files, emptySubfolders: folder.emptySubfolders };
  });

  // The mirror of an orphan: a spec names a file that is not on disk. Worth
  // showing, because it is a broken test waiting to happen.
  const missing = [...references.keys()].filter((k) => !matched.has(k)).sort();

  // A fixture is code. Which specs import their test object from where.
  const modules = new Map<string, string[]>();
  for (const spec of specs) {
    for (const imported of spec.imports.filter((i) => i.kind === "fixture")) {
      modules.set(imported.from, [...(modules.get(imported.from) ?? []), spec.file]);
    }
  }
  const fixtureModules = [...modules.entries()]
    .map(([from, specFiles]) => ({ from, specs: specFiles }))
    .sort((a, b) => a.from.localeCompare(b.from));

  return { folders: built, fixtureModules, missing };
}

async function walk(root: string, sub = ""): Promise<{ files: ScannedFile[]; emptySubfolders: string[] }> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, sub), { withFileTypes: true });
  } catch {
    return { files: [], emptySubfolders: [] };
  }
  const files: ScannedFile[] = [];
  const emptySubfolders: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = sub ? `${sub}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const inner = await walk(root, rel);
      files.push(...inner.files);
      emptySubfolders.push(...inner.emptySubfolders);
      // A folder holding no data file is reported as itself, so a real folder
      // is never simply absent from the screen.
      if (inner.files.length === 0) emptySubfolders.push(rel);
      continue;
    }
    // A dotfile is a placeholder, not test data. fixtures/saved-state/.gitkeep
    // is the example: it explains the folder, it is not data a test reads.
    if (entry.name.startsWith(".")) continue;
    try {
      files.push({ rel, bytes: (await fs.stat(path.join(root, rel))).size });
    } catch {
      files.push({ rel, bytes: 0 });
    }
  }
  return { files, emptySubfolders };
}

/** The data folders this project actually has, with what is really in them. */
export async function scanDataFolders(dir: string): Promise<ScannedFolder[]> {
  const found: ScannedFolder[] = [];
  for (const name of DATA_FOLDERS) {
    const root = path.join(dir, name);
    try {
      if (!(await fs.stat(root)).isDirectory()) continue;
    } catch {
      continue; // not present in this project, so it is not reported at all
    }
    const { files, emptySubfolders } = await walk(root);
    found.push({ path: name, files, emptySubfolders });
  }
  return found;
}
