import { tool } from "@opencode-ai/plugin"
import { isDeepStrictEqual } from "node:util"
import { asToolResult, getProfile, mergeProfilePatch, recordEvidence, resolveLearnerID, saveProfile } from "./runtime"
import type {
  ConceptMastery,
  ConceptMasteryView,
  ExerciseFormat,
  LearnerProfile,
  LearnerProfileChangeField,
  LearnerProfileView,
  LearnerProfileViewOptions,
  LearnerUpdateResult,
} from "./types"

const exerciseFormats: ExerciseFormat[] = ["code", "quiz", "explain"]
const allowedPatchFields = new Set([
  "projectID",
  "projectPath",
  "preferredLanguage",
  "currentGoal",
  "misconceptions",
  "activeCurriculumPath",
  "preferredExerciseFormats",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export function validateProfilePatch(patch: unknown): Partial<LearnerProfile> {
  if (!isRecord(patch)) throw new Error("Learner profile patch must be an object.")

  for (const key of Object.keys(patch)) {
    if (!allowedPatchFields.has(key)) throw new Error(`Unsupported learner profile patch field: ${key}`)
  }

  if (patch.projectID !== undefined && typeof patch.projectID !== "string") throw new Error("projectID must be a string.")
  if (patch.projectPath !== undefined && typeof patch.projectPath !== "string") throw new Error("projectPath must be a string.")
  if (patch.preferredLanguage !== undefined && typeof patch.preferredLanguage !== "string") throw new Error("preferredLanguage must be a string.")
  if (patch.currentGoal !== undefined && patch.currentGoal !== null && typeof patch.currentGoal !== "string") throw new Error("currentGoal must be a string or null.")
  if (patch.activeCurriculumPath !== undefined && !isStringArray(patch.activeCurriculumPath)) throw new Error("activeCurriculumPath must be an array of strings.")
  if (
    patch.preferredExerciseFormats !== undefined &&
    (!Array.isArray(patch.preferredExerciseFormats) || !patch.preferredExerciseFormats.every((format) => exerciseFormats.includes(format as ExerciseFormat)))
  ) {
    throw new Error("preferredExerciseFormats must contain only code, quiz, or explain.")
  }

  if (patch.misconceptions !== undefined) {
    if (!isRecord(patch.misconceptions)) throw new Error("misconceptions must be a record of string arrays.")
    for (const [conceptID, misconceptions] of Object.entries(patch.misconceptions)) {
      if (!conceptID || !isStringArray(misconceptions)) throw new Error("misconceptions must be a record of string arrays.")
    }
  }

  return patch as Partial<LearnerProfile>
}

function clampLimit(value: number | undefined, defaultValue: number, max: number): number {
  if (value === undefined) return defaultValue
  if (!Number.isFinite(value)) return defaultValue
  return Math.max(0, Math.min(Math.floor(value), max))
}

function uniqueRecent(items: string[], limit: number): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit)
}

function takeLast<T>(items: T[], limit: number): T[] {
  return limit === 0 ? [] : items.slice(-limit)
}

function toConceptMasteryView(concept: ConceptMastery, includeEvidence: boolean, evidenceLimit: number): ConceptMasteryView {
  const view: ConceptMasteryView = {
    mastery: concept.mastery,
    attempts: concept.attempts,
    successes: concept.successes,
    failures: concept.failures,
    hintsUsed: concept.hintsUsed,
    lastSeenAt: concept.lastSeenAt,
    nextReviewAt: concept.nextReviewAt,
    evidenceCount: concept.evidence.length,
  }

  if (includeEvidence) view.recentEvidence = takeLast(concept.evidence, evidenceLimit)
  return view
}

function requestedConceptIDs(profile: LearnerProfile, conceptIDs?: string[]): string[] {
  if (conceptIDs === undefined) return Object.keys(profile.concepts)
  return [...new Set(conceptIDs)].filter((conceptID) => profile.concepts[conceptID] !== undefined)
}

function summaryConceptIDs(profile: LearnerProfile, conceptIDs?: string[]): string[] {
  if (conceptIDs !== undefined) return requestedConceptIDs(profile, conceptIDs).slice(0, 5)

  const selected: string[] = []
  const append = (conceptID: string) => {
    if (profile.concepts[conceptID] && !selected.includes(conceptID) && selected.length < 5) selected.push(conceptID)
  }

  profile.activeCurriculumPath.forEach(append)
  Object.entries(profile.concepts)
    .filter(([, concept]) => concept.mastery < 0.7)
    .sort(([, left], [, right]) => left.mastery - right.mastery)
    .forEach(([conceptID]) => append(conceptID))
  Object.entries(profile.concepts)
    .sort(([, left], [, right]) => right.lastSeenAt.localeCompare(left.lastSeenAt))
    .forEach(([conceptID]) => append(conceptID))

  return selected
}

function selectMisconceptions(profile: LearnerProfile, conceptIDs: string[]): Record<string, string[]> {
  return Object.fromEntries(
    conceptIDs
      .filter((conceptID) => profile.misconceptions[conceptID] !== undefined)
      .map((conceptID) => [conceptID, profile.misconceptions[conceptID]]),
  )
}

function toLearnerProfileView(profile: LearnerProfile, options: LearnerProfileViewOptions = {}): LearnerProfileView {
  const mode = options.mode ?? "summary"
  const reflectionLimit = clampLimit(options.reflectionLimit, 5, 10)
  const evidenceLimit = clampLimit(options.evidenceLimit, 3, 10)

  if (mode === "detailed") {
    const conceptIDs = requestedConceptIDs(profile, options.conceptIDs)
    return {
      mode,
      learnerID: profile.learnerID,
      preferredLanguage: profile.preferredLanguage,
      currentGoal: profile.currentGoal,
      level: profile.level,
      concepts: Object.fromEntries(conceptIDs.map((conceptID) => [
        conceptID,
        toConceptMasteryView(profile.concepts[conceptID], true, evidenceLimit),
      ])),
      misconceptions: selectMisconceptions(profile, conceptIDs),
      activeCurriculumPath: profile.activeCurriculumPath,
      preferredExerciseFormats: profile.preferredExerciseFormats,
      reflectionHistory: takeLast(profile.reflectionHistory, reflectionLimit),
      evidenceIncluded: true,
      updatedAt: profile.updatedAt,
    }
  }

  const conceptIDs = summaryConceptIDs(profile, options.conceptIDs)
  const recentReflections = takeLast(profile.reflectionHistory, 5).reverse()

  return {
    mode,
    learnerID: profile.learnerID,
    preferredLanguage: profile.preferredLanguage,
    currentGoal: profile.currentGoal,
    level: profile.level,
    focusConcepts: Object.fromEntries(conceptIDs.map((conceptID) => [
      conceptID,
      toConceptMasteryView(profile.concepts[conceptID], false, 0),
    ])),
    misconceptions: selectMisconceptions(profile, conceptIDs),
    activeCurriculumPath: profile.activeCurriculumPath,
    preferredExerciseFormats: profile.preferredExerciseFormats,
    recentBlockers: uniqueRecent(recentReflections.flatMap((reflection) => reflection.blockers), 5),
    recentSkillsObserved: uniqueRecent(recentReflections.flatMap((reflection) => reflection.skillsObserved), 5),
    lastSessionSummary: profile.reflectionHistory[profile.reflectionHistory.length - 1]?.summary,
    updatedAt: profile.updatedAt,
  }
}

export const get = tool({
  description: "Get a bounded learner profile. Summary mode is the compact default; use detailed mode only for progress diagnosis or grading history.",
  args: {
    learnerID: tool.schema.string().optional(),
    mode: tool.schema.enum(["summary", "detailed"]).optional(),
    conceptIDs: tool.schema.array(tool.schema.string()).max(50).optional(),
    reflectionLimit: tool.schema.number().min(0).max(10).optional(),
    evidenceLimit: tool.schema.number().min(0).max(10).optional(),
  },
  async execute({ learnerID, mode, conceptIDs, reflectionLimit, evidenceLimit }, context) {
    const resolvedLearnerID = resolveLearnerID(learnerID)
    const profile = getProfile(resolvedLearnerID, context)
    return asToolResult(toLearnerProfileView(profile, {
      mode,
      conceptIDs,
      reflectionLimit,
      evidenceLimit,
    }))
  }
})

export const update = tool({
  description: "Update learner preferences or record a learning-state change backed by observed evidence",
  args: {
    learnerID: tool.schema.string().optional(),
    patch: tool.schema.object({}).loose(),
    evidence: tool.schema.object({
      conceptIDs: tool.schema.array(tool.schema.string()).min(1),
      sessionID: tool.schema.string(),
      agent: tool.schema.enum(["mentor", "reviewer", "architect", "drill-instructor"]),
      outcome: tool.schema.enum(["success", "partial", "stuck"]),
      note: tool.schema.string(),
      hintsUsed: tool.schema.number().min(0).optional(),
    }).optional(),
  },
  async execute({ learnerID, patch, evidence }, context) {
    const resolvedLearnerID = resolveLearnerID(learnerID)
    const current = getProfile(resolvedLearnerID, context)
    const validatedPatch = validateProfilePatch(patch)
    if (validatedPatch.misconceptions !== undefined && !evidence) {
      throw new Error("Misconception updates require observed evidence.")
    }

    const patched = mergeProfilePatch(current, validatedPatch)
    const changedFields = (Object.keys(validatedPatch) as LearnerProfileChangeField[])
      .filter((field) => !isDeepStrictEqual(current[field], patched[field]))
    const evidenceConceptIDs = [...new Set((evidence?.conceptIDs ?? []).filter(Boolean))]
    const affectedConceptIDs = [...new Set([
      ...evidenceConceptIDs,
      ...Object.keys(validatedPatch.misconceptions ?? {}),
    ])]
    const evidenceRecorded = evidence !== undefined && evidenceConceptIDs.length > 0

    if (changedFields.length === 0 && !evidenceRecorded) {
      return asToolResult<LearnerUpdateResult>({
        learnerID: resolvedLearnerID,
        changedFields,
        affectedConceptIDs,
        evidenceRecorded,
        updatedAt: current.updatedAt,
      })
    }

    const updated = evidence && evidenceConceptIDs.length > 0
      ? recordEvidence(patched, evidenceConceptIDs, {
        sessionID: evidence.sessionID,
        agent: evidence.agent,
        outcome: evidence.outcome,
        note: evidence.note,
        hintsUsed: evidence.hintsUsed,
      })
      : patched

    const saved = saveProfile(updated, context)
    return asToolResult<LearnerUpdateResult>({
      learnerID: resolvedLearnerID,
      changedFields,
      affectedConceptIDs,
      evidenceRecorded,
      levelChange: current.level === saved.level
        ? undefined
        : { from: current.level, to: saved.level },
      updatedAt: saved.updatedAt,
    })
  }
})
