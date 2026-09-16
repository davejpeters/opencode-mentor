import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { next } from "./curriculum"

describe("tutor_curriculum_next", () => {
  test("keeps the next concept unresolved while diagnosing an unknown assignment target", async () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-curriculum-"))
    let result

    try {
      result = await next.execute({
        learnerID: "curriculum-routing-test",
        eventKind: "assignment_request",
        currentConceptID: "unknown-concept",
      }, { directory } as never)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }

    if (typeof result === "string" || !result || !("output" in result)) {
      throw new Error("Expected a structured curriculum tool result.")
    }
    const output = JSON.parse(result.output)

    expect(output.recommendedAction).toBe("diagnose-assignment")
    expect(output.nextConceptID).toBeNull()
    expect(output.nextConceptTitle).toBeNull()
    expect(output.currentMastery).toBeNull()
  })
})
