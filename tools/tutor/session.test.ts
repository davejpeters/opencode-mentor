import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createDefaultProfile, loadProfiles, saveProfiles } from "./runtime"
import { reflect } from "./session"

async function executeReflection(
  directory: string,
  args: Parameters<typeof reflect.execute>[0],
): Promise<Record<string, unknown>> {
  const result = await reflect.execute(args, { directory, sessionID: "context-session" } as never)
  if (typeof result === "string" || !result || !("output" in result)) {
    throw new Error("Expected a structured session reflection result.")
  }
  return JSON.parse(result.output)
}

async function withTempDirectory(run: (directory: string) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), "opencode-session-reflect-"))
  try {
    await run(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe("tutor_session_reflect", () => {
  test("rejects an empty reflection instead of persisting a fabricated summary", () => withTempDirectory(async (directory) => {
    await expect(executeReflection(directory, {
      learnerID: "empty-reflection-test",
      summary: "   ",
    })).rejects.toThrow("Reflection summary must not be empty.")

    expect(loadProfiles({ directory } as never)).not.toHaveProperty("empty-reflection-test")
  }))

  test("persists the complete reflection but returns only an acknowledgement", () => withTempDirectory(async (directory) => {
    const output = await executeReflection(directory, {
      learnerID: "reflection-test",
      sessionID: "reflection-session",
      summary: "  Learned how bounded tool results reduce context.  ",
      skillsObserved: ["context budgeting"],
      blockers: ["large historical payloads"],
      confidenceDelta: 0.25,
    })

    expect(output).toEqual({
      recorded: true,
      learnerID: "reflection-test",
      sessionID: "reflection-session",
      reflectionCount: 1,
      updatedAt: expect.any(String),
    })

    const stored = loadProfiles({ directory } as never)["reflection-test"].reflectionHistory[0]
    expect(stored).toMatchObject({
      sessionID: "reflection-session",
      summary: "Learned how bounded tool results reduce context.",
      skillsObserved: ["context budgeting"],
      blockers: ["large historical payloads"],
      confidenceDelta: 0.25,
    })
    expect(stored.timestamp).toEqual(expect.any(String))
  }))

  test("keeps only the latest fifty stored reflections", () => withTempDirectory(async (directory) => {
    const learnerID = "reflection-cap-test"
    const reflectionHistory = Array.from({ length: 50 }, (_, index) => ({
      sessionID: `existing-${index}`,
      summary: `Existing reflection ${index}`,
      skillsObserved: [],
      blockers: [],
      timestamp: "2026-01-01T00:00:00.000Z",
    }))
    const profile = createDefaultProfile(learnerID, { directory } as never, { reflectionHistory })
    saveProfiles({ directory } as never, { [learnerID]: profile })

    const output = await executeReflection(directory, {
      learnerID,
      sessionID: "new-reflection",
      summary: "Newest reflection",
    })
    const stored = loadProfiles({ directory } as never)[learnerID].reflectionHistory

    expect(output.reflectionCount).toBe(50)
    expect(stored).toHaveLength(50)
    expect(stored[0].sessionID).toBe("existing-1")
    expect(stored[49].sessionID).toBe("new-reflection")
  }))

  test("does not duplicate the acknowledgement in tool metadata", () => withTempDirectory(async (directory) => {
    const result = await reflect.execute(
      { learnerID: "metadata-test", summary: "Compact result" },
      { directory, sessionID: "metadata-session" } as never,
    )

    expect(result).not.toHaveProperty("metadata")
  }))
})
