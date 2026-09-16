import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { get, update, validateProfilePatch } from "./learner_profile"
import { createDefaultProfile, defaultConceptMastery, loadProfiles, saveProfiles } from "./runtime"

async function executeGet(
  directory: string,
  args: Parameters<typeof get.execute>[0],
): Promise<Record<string, any>> {
  const result = await get.execute(args, { directory } as never)
  if (typeof result === "string" || !result || !("output" in result)) {
    throw new Error("Expected a structured learner profile result.")
  }
  return JSON.parse(result.output)
}

async function executeUpdate(
  directory: string,
  args: Parameters<typeof update.execute>[0],
): Promise<Record<string, unknown>> {
  const result = await update.execute(args, { directory } as never)
  if (typeof result === "string" || !result || !("output" in result)) {
    throw new Error("Expected a structured learner update result.")
  }
  return JSON.parse(result.output)
}

async function withTempDirectory(run: (directory: string) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), "opencode-learner-update-"))
  try {
    await run(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function seedRichProfile(directory: string, learnerID = "profile-view-test") {
  const concepts = Object.fromEntries(Array.from({ length: 8 }, (_, index) => {
    const conceptID = `concept-${index}`
    const timestamp = `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`
    return [conceptID, {
      ...defaultConceptMastery(timestamp),
      mastery: index / 10,
      attempts: index + 1,
      evidence: Array.from({ length: 12 }, (_, evidenceIndex) => ({
        sessionID: `evidence-${index}-${evidenceIndex}`,
        agent: "mentor" as const,
        outcome: "success" as const,
        concepts: [conceptID],
        timestamp,
        note: `private evidence note ${index}-${evidenceIndex}`,
      })),
    }]
  }))
  const reflectionHistory = Array.from({ length: 50 }, (_, index) => ({
    sessionID: `reflection-${index}`,
    summary: `Reflection ${index}`,
    skillsObserved: [`skill-${index}`],
    blockers: [`blocker-${index}`],
    timestamp: `2026-02-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
  }))
  const profile = createDefaultProfile(learnerID, { directory } as never, {
    concepts,
    misconceptions: Object.fromEntries(Object.keys(concepts).map((conceptID) => [conceptID, [`misconception-${conceptID}`]])),
    activeCurriculumPath: ["concept-7"],
    reflectionHistory,
  })
  saveProfiles({ directory } as never, { [learnerID]: profile })
  return profile
}

describe("validateProfilePatch", () => {
  test("allows non-mastery profile preferences", () => {
    expect(validateProfilePatch({ currentGoal: "Learn functions", preferredLanguage: "go" })).toEqual({
      currentGoal: "Learn functions",
      preferredLanguage: "go",
    })
  })

  test.each(["level", "concepts", "reflectionHistory"])("rejects direct updates to evidence-derived field %s", (field) => {
    expect(() => validateProfilePatch({ [field]: {} })).toThrow(`Unsupported learner profile patch field: ${field}`)
  })
})

describe("tutor_learner_get", () => {
  test("returns a bounded summary by default without evidence details", () => withTempDirectory(async (directory) => {
    const profile = seedRichProfile(directory)
    const output = await executeGet(directory, { learnerID: profile.learnerID })

    expect(output.mode).toBe("summary")
    expect(Object.keys(output.focusConcepts)).toHaveLength(5)
    expect(Object.keys(output.focusConcepts)[0]).toBe("concept-7")
    expect(output.lastSessionSummary).toBe("Reflection 49")
    expect(output).not.toHaveProperty("reflectionHistory")
    expect(output).not.toHaveProperty("projectPath")
    expect(JSON.stringify(output)).not.toContain("private evidence note")
    for (const concept of Object.values(output.focusConcepts) as Record<string, unknown>[]) {
      expect(concept).not.toHaveProperty("recentEvidence")
    }
  }))

  test("bounds reflections and evidence in detailed mode", () => withTempDirectory(async (directory) => {
    const profile = seedRichProfile(directory)
    const output = await executeGet(directory, {
      learnerID: profile.learnerID,
      mode: "detailed",
      reflectionLimit: 10,
      evidenceLimit: 10,
    })
    const emptyHistory = await executeGet(directory, {
      learnerID: profile.learnerID,
      mode: "detailed",
      reflectionLimit: 0,
      evidenceLimit: 0,
    })

    expect(output.mode).toBe("detailed")
    expect(output.reflectionHistory).toHaveLength(10)
    expect(output.concepts["concept-0"].recentEvidence).toHaveLength(10)
    expect(output.evidenceIncluded).toBe(true)
    expect(output).not.toHaveProperty("projectPath")
    expect(output).not.toHaveProperty("createdAt")
    expect(emptyHistory.reflectionHistory).toEqual([])
    expect(emptyHistory.concepts["concept-0"].recentEvidence).toEqual([])
  }))

  test("scopes summary and detailed modes to requested concepts", () => withTempDirectory(async (directory) => {
    const profile = seedRichProfile(directory)
    const summary = await executeGet(directory, {
      learnerID: profile.learnerID,
      conceptIDs: ["concept-6"],
    })
    const detailed = await executeGet(directory, {
      learnerID: profile.learnerID,
      mode: "detailed",
      conceptIDs: ["concept-6"],
    })

    expect(Object.keys(summary.focusConcepts)).toEqual(["concept-6"])
    expect(Object.keys(summary.misconceptions)).toEqual(["concept-6"])
    expect(Object.keys(detailed.concepts)).toEqual(["concept-6"])
    expect(Object.keys(detailed.misconceptions)).toEqual(["concept-6"])
  }))

  test("creates a valid summary for a missing learner profile", () => withTempDirectory(async (directory) => {
    const output = await executeGet(directory, { learnerID: "missing-profile" })

    expect(output.mode).toBe("summary")
    expect(output.focusConcepts).toEqual({})
    expect(output.recentBlockers).toEqual([])
    expect(output.recentSkillsObserved).toEqual([])
    expect(loadProfiles({ directory } as never)).toHaveProperty("missing-profile")
  }))
})

describe("tutor_learner_update", () => {
  test("reports changed preference fields without returning the full profile", () => withTempDirectory(async (directory) => {
    const output = await executeUpdate(directory, {
      learnerID: "preference-test",
      patch: { preferredLanguage: "typescript" },
    })

    expect(output.changedFields).toEqual(["preferredLanguage"])
    expect(output.affectedConceptIDs).toEqual([])
    expect(output.evidenceRecorded).toBe(false)
    expect(output).not.toHaveProperty("concepts")
    expect(output).not.toHaveProperty("reflectionHistory")
    expect(output).not.toHaveProperty("misconceptions")
    expect(output).not.toHaveProperty("projectID")
    expect(output).not.toHaveProperty("projectPath")
  }))

  test("reports concepts affected by recorded evidence", () => withTempDirectory(async (directory) => {
    const output = await executeUpdate(directory, {
      learnerID: "evidence-test",
      patch: {},
      evidence: {
        conceptIDs: ["functions"],
        sessionID: "evidence-session",
        agent: "mentor",
        outcome: "success",
        note: "Explained function calls correctly.",
      },
    })

    expect(output.changedFields).toEqual([])
    expect(output.affectedConceptIDs).toEqual(["functions"])
    expect(output.evidenceRecorded).toBe(true)
  }))

  test("reports a learner level transition caused by evidence", () => withTempDirectory(async (directory) => {
    const mastery = {
      ...defaultConceptMastery("2026-01-01T00:00:00.000Z"),
      mastery: 0.4,
      attempts: 2,
      successes: 1,
    }
    const profile = createDefaultProfile("level-test", { directory } as never, {
      updatedAt: "2026-01-01T00:00:00.000Z",
      concepts: { functions: mastery },
    })
    saveProfiles({ directory } as never, { [profile.learnerID]: profile })

    const output = await executeUpdate(directory, {
      learnerID: profile.learnerID,
      patch: {},
      evidence: {
        conceptIDs: ["functions"],
        sessionID: "level-session",
        agent: "mentor",
        outcome: "success",
        note: "Applied functions independently.",
      },
    })

    expect(output.levelChange).toEqual({ from: "novice", to: "practicing" })
  }))

  test("does not rewrite the profile for a no-op patch", () => withTempDirectory(async (directory) => {
    const profile = {
      ...createDefaultProfile("no-op-test", { directory } as never),
      updatedAt: "2026-01-01T00:00:00.000Z",
    }
    saveProfiles({ directory } as never, { [profile.learnerID]: profile })

    const output = await executeUpdate(directory, {
      learnerID: profile.learnerID,
      patch: { currentGoal: null },
    })

    expect(output.changedFields).toEqual([])
    expect(output.affectedConceptIDs).toEqual([])
    expect(output.evidenceRecorded).toBe(false)
    expect(output.updatedAt).toBe(profile.updatedAt)
    expect(loadProfiles({ directory } as never)[profile.learnerID].updatedAt).toBe(profile.updatedAt)
  }))
})
