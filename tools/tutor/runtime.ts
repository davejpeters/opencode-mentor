import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { ToolResult } from "@opencode-ai/plugin"
import { join, resolve } from "node:path"
import os from "node:os"
import type {
  ConceptMastery,
  ConceptNode,
  EvidenceEvent,
  Exercise,
  LearnerLevel,
  LearnerProfile,
  NextAction,
  ProgressionEvent,
} from "./types"

export interface ToolContextLike {
  agent?: string
  sessionID?: string
  messageID?: string
  directory?: string
  worktree?: string
}

// change to repo name (ToolContext.prototype.directory)
export const DEFAULT_PROJECT_ID = getProjectRoot().split("/").slice(-1)[0] || "local-project"
export const DEFAULT_LANGUAGE = "go"

export function nowISO(): string {
  return new Date().toISOString()
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

export function getProjectRoot(context?: ToolContextLike): string {
  return resolve(context?.directory ?? context?.worktree ?? process.cwd())
}

export function resolveLearnerID(learnerID?: string): string {
  const explicitLearnerID = learnerID?.trim()
  if (explicitLearnerID) return explicitLearnerID

  try {
    const username = os.userInfo().username.trim()
    if (username) return username
  } catch {
    // Fall through to environment fallbacks for restricted runtimes
  }
  return process.env.USER?.trim() || process.env.LOGNAME?.trim() || process.env.USERNAME?.trim() || "default"
}

export function getStateDir(context?: ToolContextLike): string {
  return join(getProjectRoot(context), ".opencode", "mentor")
}

export function ensureStateDir(context?: ToolContextLike): string {
  const dir = getStateDir(context)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function statePath(context: ToolContextLike | undefined, filename: string): string {
  return join(ensureStateDir(context), filename)
}

export function readJSON<T>(context: ToolContextLike | undefined, filename: string, fallback: T): T {
  const file = statePath(context, filename)
  if (!existsSync(file)) return fallback

  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch (error) {
    ; (globalThis as any).console?.warn?.(`Failed to parse mentor state file ${file}; using fallback state.`, error)
    return fallback
  }
}

export function writeJSON<T>(context: ToolContextLike | undefined, filename: string, value: T): T {
  const file = statePath(context, filename)
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  return value
}

export function defaultConceptMastery(timestamp = nowISO()): ConceptMastery {
  return {
    mastery: 0,
    attempts: 0,
    successes: 0,
    failures: 0,
    hintsUsed: 0,
    lastSeenAt: timestamp,
    evidence: [],
  }
}

export function createDefaultProfile(
  learnerID: string,
  context?: ToolContextLike,
  overrides: Partial<LearnerProfile> = {},
): LearnerProfile {
  const timestamp = nowISO()
  return {
    learnerID,
    projectID: overrides.projectID ?? DEFAULT_PROJECT_ID,
    projectPath: getProjectRoot(context),
    preferredLanguage: overrides.preferredLanguage ?? DEFAULT_LANGUAGE,
    currentGoal: overrides.currentGoal ?? null,
    level: overrides.level ?? "novice",
    concepts: overrides.concepts ?? {},
    misconceptions: overrides.misconceptions ?? {},
    activeCurriculumPath: overrides.activeCurriculumPath ?? [],
    preferredExerciseFormats: overrides.preferredExerciseFormats ?? ["explain", "quiz", "code"],
    reflectionHistory: overrides.reflectionHistory ?? [],
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

export function loadProfiles(context?: ToolContextLike): Record<string, LearnerProfile> {
  return readJSON<Record<string, LearnerProfile>>(context, "learner_profiles.json", {})
}

export function saveProfiles(context: ToolContextLike | undefined, profiles: Record<string, LearnerProfile>) {
  return writeJSON(context, "learner_profiles.json", profiles)
}

export function getProfile(learnerID: string, context?: ToolContextLike): LearnerProfile {
  const profiles = loadProfiles(context)
  if (!profiles[learnerID]) {
    profiles[learnerID] = createDefaultProfile(learnerID, context)
    saveProfiles(context, profiles)
  }
  return profiles[learnerID]
}

export function saveProfile(profile: LearnerProfile, context?: ToolContextLike): LearnerProfile {
  const profiles = loadProfiles(context)
  profiles[profile.learnerID] = { ...profile, updatedAt: nowISO() }
  saveProfiles(context, profiles)
  return profiles[profile.learnerID]
}

function mergeStringArray(base: string[] = [], incoming: string[] = []): string[] {
  return [...new Set([...base, ...incoming].filter(Boolean))]
}

export function mergeProfilePatch(profile: LearnerProfile, patch: Partial<LearnerProfile>): LearnerProfile {
  const next: LearnerProfile = {
    ...profile,
    ...patch,
    learnerID: profile.learnerID,
    projectID: patch.projectID ?? profile.projectID,
    projectPath: patch.projectPath ?? profile.projectPath,
    concepts: { ...profile.concepts, ...(patch.concepts ?? {}) },
    misconceptions: { ...profile.misconceptions, ...(patch.misconceptions ?? {}) },
    activeCurriculumPath: patch.activeCurriculumPath ?? profile.activeCurriculumPath,
    preferredExerciseFormats: patch.preferredExerciseFormats ?? profile.preferredExerciseFormats,
    reflectionHistory: patch.reflectionHistory ?? profile.reflectionHistory,
    createdAt: profile.createdAt,
    updatedAt: nowISO(),
  }

  return next
}

export function recordEvidence(
  profile: LearnerProfile,
  conceptIDs: string[],
  event: Omit<EvidenceEvent, "timestamp" | "concepts"> & { timestamp?: string; concepts?: string[] },
): LearnerProfile {
  const timestamp = event.timestamp ?? nowISO()
  const next = mergeProfilePatch(profile, {})

  for (const conceptID of conceptIDs.filter(Boolean)) {
    const current = next.concepts[conceptID] ?? defaultConceptMastery(timestamp)
    const attempts = current.attempts + 1
    const successes = current.successes + (event.outcome === "success" ? 1 : 0)
    const failures = current.failures + (event.outcome === "stuck" ? 1 : 0)
    const outcomeDelta = event.outcome === "success" ? 0.18 : event.outcome === "partial" ? 0.06 : -0.08
    const eventHintsUsed = Math.max(event.hintsUsed ?? 0, 0)
    const hintsUsed = current.hintsUsed + eventHintsUsed
    const independencePenalty = Math.min(eventHintsUsed * 0.02, 0.08)

    next.concepts[conceptID] = {
      ...current,
      attempts,
      successes,
      failures,
      hintsUsed,
      mastery: clamp(current.mastery + outcomeDelta - independencePenalty),
      lastSeenAt: timestamp,
      nextReviewAt: nextReviewAt(timestamp, next.concepts[conceptID]?.mastery ?? 0),
      evidence: [
        ...current.evidence,
        {
          sessionID: event.sessionID,
          agent: event.agent,
          outcome: event.outcome,
          concepts: event.concepts ?? conceptIDs,
          timestamp,
          note: event.note,
          hintsUsed: eventHintsUsed,
        },
      ].slice(-30),
    }
  }

  next.level = inferLearnerLevel(next)
  next.updatedAt = timestamp
  return next
}

function nextReviewAt(timestamp: string, mastery: number): string {
  const base = new Date(timestamp).getTime()
  const days = mastery >= 0.8 ? 14 : mastery >= 0.55 ? 7 : 2
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
}

export function inferLearnerLevel(profile: LearnerProfile): LearnerLevel {
  const conceptValues = Object.values(profile.concepts)
  if (conceptValues.length === 0) return "novice"

  const average = conceptValues.reduce((sum, concept) => sum + concept.mastery, 0) / conceptValues.length
  const totalAttempts = conceptValues.reduce((sum, concept) => sum + concept.attempts, 0)
  const successfulConcepts = conceptValues.filter((concept) => concept.successes > 0).length
  const advancedPractice = conceptValues.some((concept) =>
    concept.mastery >= 0.7 && concept.evidence.some((event) => event.outcome === "success" && event.agent === "drill-instructor"),
  )
  const lowHintDependence = conceptValues.every((concept) => concept.attempts === 0 || concept.hintsUsed / concept.attempts <= 2)

  if (average >= 0.8 && totalAttempts >= 6 && successfulConcepts >= 2 && advancedPractice && lowHintDependence) return "competent"
  if (average >= 0.45 && totalAttempts >= 3) return "practicing"
  return "novice"
}

export function defaultConceptGraph(): { concepts: ConceptNode[]; edges: { from: string; to: string; relation: "prerequisite" | "related" }[] } {
  const concepts: ConceptNode[] = [
    {
      id: "program-flow",
      title: "Program Flow",
      description: "Understanding how execution moves through variables, branches, loops, and functions.",
      tags: ["fundamentals"],
      difficulty: 1,
      prerequisites: [],
    },
    {
      id: "functions",
      title: "Functions",
      description: "Breaking behavior into named, reusable units with inputs and outputs.",
      tags: ["fundamentals"],
      difficulty: 1,
      prerequisites: ["program-flow"],
    },
    {
      id: "data-modeling",
      title: "Data Modeling",
      description: "Representing domain concepts with structs, objects, records, and schemas.",
      tags: ["design"],
      difficulty: 2,
      prerequisites: ["functions"],
    },
    {
      id: "interfaces",
      title: "Interfaces",
      description: "Designing behavior contracts that let code depend on capabilities instead of concrete types.",
      tags: ["go", "design"],
      difficulty: 3,
      prerequisites: ["functions", "data-modeling"],
    },
    {
      id: "testing",
      title: "Testing",
      description: "Using automated checks to prove behavior and protect future changes.",
      tags: ["quality"],
      difficulty: 2,
      prerequisites: ["functions"],
    },
    {
      id: "debugging",
      title: "Debugging",
      description: "Finding root causes by comparing expected behavior to observed behavior.",
      tags: ["quality"],
      difficulty: 2,
      prerequisites: ["program-flow"],
    },
    {
      id: "architecture-boundaries",
      title: "Architecture Boundaries",
      description: "Separating responsibilities so systems stay understandable and changeable.",
      tags: ["architecture"],
      difficulty: 4,
      prerequisites: ["interfaces", "testing"],
    },
  ]

  const edges = concepts.flatMap((concept) =>
    concept.prerequisites.map((prereq) => ({ from: prereq, to: concept.id, relation: "prerequisite" as const })),
  )

  return { concepts, edges }
}

export function loadConceptGraph(context?: ToolContextLike) {
  return readJSON(context, "concept_graph.json", defaultConceptGraph())
}

export function loadExercises(context?: ToolContextLike): Record<string, Exercise> {
  return readJSON<Record<string, Exercise>>(context, "exercises.json", {})
}

export function saveExercises(context: ToolContextLike | undefined, exercises: Record<string, Exercise>) {
  return writeJSON(context, "exercises.json", exercises)
}

export function getConceptByID(conceptID: string, context?: ToolContextLike): ConceptNode | undefined {
  return loadConceptGraph(context).concepts.find((concept) => concept.id === conceptID)
}

export function masteryFor(profile: LearnerProfile, conceptID: string): number {
  return profile.concepts[conceptID]?.mastery ?? 0
}

export function findFirstUnmetRequiredConcept(
  profile: LearnerProfile,
  targetConceptID?: string,
  context?: ToolContextLike,
): string | undefined {
  const graph = loadConceptGraph(context)
  const candidateIDs = targetConceptID
    ? collectPrerequisiteConceptIDs(targetConceptID, graph.concepts)
    : graph.concepts.map((concept) => concept.id)

  const unmet = candidateIDs
    .filter((conceptID) => (profile.concepts[conceptID]?.attempts ?? 0) > 0)
    .map((conceptID) => ({ conceptID, mastery: masteryFor(profile, conceptID) }))
    .filter((item) => item.mastery < 0.55)

  return unmet[0]?.conceptID
}

function findUnknownRequiredConcept(
  profile: LearnerProfile,
  targetConceptID: string,
  context?: ToolContextLike,
): string | undefined {
  const graph = loadConceptGraph(context)
  return collectPrerequisiteConceptIDs(targetConceptID, graph.concepts)
    .find((conceptID) => (profile.concepts[conceptID]?.attempts ?? 0) === 0)
}

function collectPrerequisiteConceptIDs(targetConceptID: string, concepts: ConceptNode[]): string[] {
  const selected = new Set<string>()
  const visiting = new Set<string>()

  function visit(conceptID: string) {
    if (selected.has(conceptID) || visiting.has(conceptID)) return
    const concept = concepts.find((item) => item.id === conceptID)
    if (!concept) return

    visiting.add(conceptID)
    for (const prerequisite of concept.prerequisites) visit(prerequisite)
    visiting.delete(conceptID)
    selected.add(conceptID)
  }

  const target = concepts.find((concept) => concept.id === targetConceptID)
  for (const prerequisite of target?.prerequisites ?? []) visit(prerequisite)
  return [...selected]
}

function needsFocusedRemediation(profile: LearnerProfile, conceptID: string): boolean {
  const concept = profile.concepts[conceptID]
  if (!concept || concept.attempts < 2) return false

  return concept.evidence.slice(-3).filter((event) => event.outcome === "stuck").length >= 2
}

export function chooseNextAction(profile: LearnerProfile, event: ProgressionEvent, context?: ToolContextLike): NextAction {
  if (event.kind === "design_question") {
    return { agent: "architect", action: "explain-tradeoffs", reason: "The learner is asking about structure or system design." }
  }

  if (event.kind === "solution_submitted") {
    return { agent: "reviewer", action: "critique-code", reason: "Submitted work should be assessed before more implementation." }
  }

  if (event.kind === "stuck") {
    return { agent: "mentor", action: "diagnose-and-hint", conceptID: event.conceptID, reason: "The learner needs diagnosis before more code." }
  }

  if (event.kind === "exercise_graded" && event.passed === false) {
    return {
      agent: "drill-instructor",
      action: "generate-remediation-drill",
      conceptID: event.conceptID,
      reason: "The last exercise did not pass, so the next step should be smaller practice.",
    }
  }

  if (event.kind === "assignment_request" && (!event.conceptID || !getConceptByID(event.conceptID, context))) {
    return {
      agent: "mentor",
      action: "diagnose-assignment",
      reason: "The assignment target must resolve to a known concept before checking prerequisites or designing practice.",
    }
  }

  const nextConcept = findFirstUnmetRequiredConcept(profile, event.conceptID, context)
  if (nextConcept) {
    return {
      agent: "mentor",
      action: "teach-prerequisite",
      conceptID: nextConcept,
      reason: "A required concept is below the mastery threshold and needs explanation before practice.",
    }
  }

  const unknownPrerequisite = event.conceptID
    ? findUnknownRequiredConcept(profile, event.conceptID, context)
    : undefined
  if (unknownPrerequisite) {
    return {
      agent: "mentor",
      action: "diagnose-prerequisite",
      conceptID: unknownPrerequisite,
      reason: "A required concept has no learner evidence, so understanding must be checked before teaching it.",
    }
  }

  if (event.kind === "assignment_request") {
    if (needsFocusedRemediation(profile, event.conceptID!)) {
      return {
        agent: "drill-instructor",
        action: "generate-remediation-drill",
        conceptID: event.conceptID,
        reason: "Recent evidence contains repeated stuck outcomes for the target skill after its prerequisites were met.",
      }
    }

    return {
      agent: "mentor",
      action: "design-guided-assignment",
      conceptID: event.conceptID,
      reason: "The learner has the required foundations and is ready for an assignment-guided practical task.",
    }
  }

  return {
    agent: "mentor",
    action: "guided-practice",
    conceptID: event.conceptID,
    reason: "The learner is ready for a guided practice step without receiving an implementation.",
  }
}

export function textIncludesAny(text: string, signals: string[]): string[] {
  const lower = text.toLowerCase()
  return signals.filter((signal) => lower.includes(signal.toLowerCase()))
}

export function mergeMisconceptions(
  profile: LearnerProfile,
  conceptID: string,
  misconceptions: string[],
): LearnerProfile {
  if (misconceptions.length === 0) return profile

  const current = profile.misconceptions[conceptID] ?? []
  return mergeProfilePatch(profile, {
    misconceptions: {
      ...profile.misconceptions,
      [conceptID]: mergeStringArray(current, misconceptions),
    },
  })
}

export function asToolResult<T>(data: T): ToolResult {
  return {
    output: JSON.stringify(data, null, 2),
  }
}
