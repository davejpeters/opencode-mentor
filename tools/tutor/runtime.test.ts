import { describe, expect, test } from "bun:test"
import { chooseNextAction, createDefaultProfile, defaultConceptGraph, defaultConceptMastery, recordEvidence } from "./runtime"

function readyProfile() {
  const concepts = Object.fromEntries(
    defaultConceptGraph().concepts.map((concept) => [
      concept.id,
      { ...defaultConceptMastery(), mastery: 0.8, attempts: 3, successes: 3 },
    ]),
  )

  return createDefaultProfile("routing-test", undefined, { concepts })
}

describe("chooseNextAction", () => {
  test("diagnoses an assignment request without a target concept", () => {
    const action = chooseNextAction(createDefaultProfile("routing-test"), { kind: "assignment_request" })

    expect(action.agent).toBe("mentor")
    expect(action.action).toBe("diagnose-assignment")
    expect(action.conceptID).toBeUndefined()
  })

  test("diagnoses an assignment request with an unknown target concept", () => {
    const action = chooseNextAction(createDefaultProfile("routing-test"), {
      kind: "assignment_request",
      conceptID: "unknown-concept",
    })

    expect(action.agent).toBe("mentor")
    expect(action.action).toBe("diagnose-assignment")
  })

  test("diagnoses an assignment prerequisite with no learner evidence", () => {
    const action = chooseNextAction(createDefaultProfile("routing-test"), {
      kind: "assignment_request",
      conceptID: "functions",
    })

    expect(action.agent).toBe("mentor")
    expect(action.action).toBe("diagnose-prerequisite")
    expect(action.conceptID).toBe("program-flow")
  })

  test("teaches an assignment prerequisite after evidence shows a gap", () => {
    const profile = recordEvidence(createDefaultProfile("routing-test"), ["program-flow"], {
      sessionID: "prerequisite-gap",
      agent: "mentor",
      outcome: "stuck",
    })
    const action = chooseNextAction(profile, {
      kind: "assignment_request",
      conceptID: "functions",
    })

    expect(action.agent).toBe("mentor")
    expect(action.action).toBe("teach-prerequisite")
    expect(action.conceptID).toBe("program-flow")
  })

  test("diagnoses nested prerequisites from the foundation upward", () => {
    const action = chooseNextAction(createDefaultProfile("nested-routing-test"), {
      kind: "assignment_request",
      conceptID: "architecture-boundaries",
    })

    expect(action.action).toBe("diagnose-prerequisite")
    expect(action.conceptID).toBe("program-flow")
  })

  test("prioritizes an evidence-backed gap over unknown higher prerequisites", () => {
    const profile = recordEvidence(createDefaultProfile("mixed-routing-test"), ["program-flow"], {
      sessionID: "foundational-gap",
      agent: "mentor",
      outcome: "stuck",
    })
    const action = chooseNextAction(profile, {
      kind: "assignment_request",
      conceptID: "architecture-boundaries",
    })

    expect(action.action).toBe("teach-prerequisite")
    expect(action.conceptID).toBe("program-flow")
  })

  test("prioritizes a known foundational gap over a lower-scoring advanced gap", () => {
    const profile = createDefaultProfile("ordered-gap-test", undefined, {
      concepts: {
        "program-flow": { ...defaultConceptMastery(), mastery: 0.5, attempts: 2 },
        interfaces: { ...defaultConceptMastery(), mastery: 0.1, attempts: 2 },
      },
    })
    const action = chooseNextAction(profile, {
      kind: "assignment_request",
      conceptID: "architecture-boundaries",
    })

    expect(action.action).toBe("teach-prerequisite")
    expect(action.conceptID).toBe("program-flow")
  })

  test("routes an unmastered target to assignment when its prerequisites are ready", () => {
    const profile = createDefaultProfile("routing-test", undefined, {
      concepts: {
        "program-flow": { ...defaultConceptMastery(), mastery: 0.8, attempts: 3, successes: 3 },
      },
    })
    const action = chooseNextAction(profile, {
      kind: "assignment_request",
      conceptID: "functions",
    })

    expect(action.agent).toBe("mentor")
    expect(action.action).toBe("design-guided-assignment")
  })

  test("routes repeated evidence-backed assignment failures to Drill Instructor", () => {
    const profile = createDefaultProfile("routing-test", undefined, {
      concepts: {
        "program-flow": { ...defaultConceptMastery(), mastery: 0.8, attempts: 3, successes: 3 },
      },
    })
    const firstFailure = recordEvidence(profile, ["functions"], {
      sessionID: "routing-test-1",
      agent: "mentor",
      outcome: "stuck",
    })
    const secondFailure = recordEvidence(firstFailure, ["functions"], {
      sessionID: "routing-test-2",
      agent: "mentor",
      outcome: "stuck",
    })

    const action = chooseNextAction(secondFailure, {
      kind: "assignment_request",
      conceptID: "functions",
    })

    expect(action.agent).toBe("drill-instructor")
    expect(action.action).toBe("generate-remediation-drill")
  })

  test("routes failed exercises to Drill Instructor", () => {
    const action = chooseNextAction(readyProfile(), {
      kind: "exercise_graded",
      conceptID: "functions",
      passed: false,
    })

    expect(action.agent).toBe("drill-instructor")
    expect(action.action).toBe("generate-remediation-drill")
  })

  test("routes submitted solutions to Reviewer", () => {
    const action = chooseNextAction(readyProfile(), { kind: "solution_submitted" })

    expect(action.agent).toBe("reviewer")
    expect(action.action).toBe("critique-code")
  })
})
