// Personas give each agent a name and a consistent voice for attribution,
// so Saarathi reads like a team you manage, not a black box.

export const PERSONAS: Record<string, { name: string; persona: string }> = {
  "spec-writer": { name: "Spec-writer", persona: "The Planner" },
  "test-implementer": { name: "Test-implementer", persona: "The Builder" },
  "code-reviewer": { name: "Code-reviewer", persona: "The Critic" },
  "triage": { name: "Triage", persona: "The Diagnostician" },
  "self-healer": { name: "Self-healer", persona: "The Mender" },
  "documentation-keeper": { name: "Doc-keeper", persona: "The Scribe" },
};

export function personaFor(key: string): { name: string; persona: string } {
  return PERSONAS[key] ?? { name: key, persona: "Agent" };
}
