import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const globalPolicy = readFileSync(join(root, "AGENTS.md"), "utf8")
const core = readFileSync(join(root, "skills/core/SKILL.md"), "utf8")
const orchestrator = readFileSync(join(root, "agents/mentor-orchestrator.md"), "utf8")
const assignment = readFileSync(join(root, "skills/assignment/SKILL.md"), "utf8")
const mentor = readFileSync(join(root, "agents/mentor.md"), "utf8")
const reviewer = readFileSync(join(root, "agents/reviewer.md"), "utf8")
const drillInstructor = readFileSync(join(root, "agents/drill-instructor.md"), "utf8")
const architect = readFileSync(join(root, "agents/architect.md"), "utf8")

function markdownSection(document: string, heading: string, occurrence = 0): string {
  const lines = document.split("\n")
  const headingIndexes: number[] = []
  let inFence = false

  for (let index = 0; index < lines.length; index++) {
    if (/^\s*```/.test(lines[index])) {
      inFence = !inFence
      continue
    }
    if (!inFence && lines[index].trim() === heading) headingIndexes.push(index)
  }

  const start = headingIndexes[occurrence]
  if (start === undefined) throw new Error(`Missing heading occurrence ${occurrence}: ${heading}`)

  const headingMatch = heading.match(/^(#{1,6})\s+/)
  if (!headingMatch) throw new Error(`Invalid Markdown heading: ${heading}`)

  const level = headingMatch[1].length
  let end = lines.length
  inFence = false

  for (let index = start + 1; index < lines.length; index++) {
    if (/^\s*```/.test(lines[index])) {
      inFence = !inFence
      continue
    }
    const nextHeading = !inFence && lines[index].match(/^(#{1,6})\s+/)
    if (nextHeading && nextHeading[1].length <= level) {
      end = index
      break
    }
  }

  return lines.slice(start, end).join("\n")
}

function firstFencedBlock(section: string): string {
  const match = section.match(/```(?:\w+)?\n([\s\S]*?)```/)
  if (!match) throw new Error("Missing fenced block")
  return match[1]
}

function learnerFacingLabels(contract: string): string[] {
  return [
    ...[...contract.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim()),
    ...[...contract.matchAll(/^\s*(?:-\s+)?\*\*([^*]+?):\*\*/gm)].map((match) => match[1].trim()),
  ]
}

describe("learner-state prompt policy", () => {
  test("makes learner retrieval conditional, bounded, and non-repeating", () => {
    expect(core).toContain("Call `tutor_learner_get` at most once per user turn.")
    expect(core).toContain("Use `summary` mode by default.")
    expect(core).toContain("Use `detailed` mode only")
    expect(core).toContain("Do not retrieve learner state under the Non-Learning Fast Path.")
    expect(core).toContain("use its returned delta; do not retrieve the profile again in the same turn")
  })

  test("limits reflection persistence to meaningful learning interactions", () => {
    expect(core).toContain("Call `tutor_session_reflect` only after a meaningful learning interaction.")
  })

  test("gives the orchestrator a no-tool fast path", () => {
    expect(core).toContain("### Non-Learning Fast Path")
    expect(core).toContain("respond directly without learner-state retrieval, curriculum routing, delegation, or reflection.")
    expect(orchestrator).toContain("Apply Core's non-learning fast path")
    expect(orchestrator).not.toContain("simple requirement or pacing clarifications")
    expect(orchestrator).not.toContain("Before responding to any user input, you **must** call `tutor_learner_get`")
    expect(orchestrator).not.toContain("**Do not skip** `tutor_learner_get`")
  })

  test("keeps shared policy in Core instead of the orchestrator", () => {
    expect(orchestrator).toContain("Follow the injected Core skill as the canonical source")
    expect(orchestrator).toContain("Pass only relevant learner state")
    expect(orchestrator).toContain("Delegate with the smallest relevant context payload")
    expect(orchestrator).not.toContain("`tutor_learner_get` at most once per user turn")
    expect(orchestrator).not.toContain("`tutor_session_reflect` only after a meaningful learning interaction")
    expect(orchestrator).not.toContain("Evidence that can justify a learning-state update")
    expect(orchestrator).not.toContain("If Core context is unavailable")
    for (const duplicatedVocabulary of [
      "BELOW_ZPD",
      "IN_ZPD",
      "ABOVE_ZPD",
      "support level",
      "EXPOSED",
      "ASSISTED",
      "INDEPENDENT",
      "TRANSFERABLE",
    ]) {
      expect(orchestrator).not.toContain(duplicatedVocabulary)
    }
    expect(orchestrator).not.toContain("## Available Tools")
    expect(orchestrator).not.toContain("## Subagent Definitions")
    expect(core).toContain("exercise_graded failed -> Drill Instructor")
    expect(orchestrator.split("\n").length).toBeLessThan(80)
  })
})

describe("cross-file pedagogical policy", () => {
  test("keeps the global learner-ownership boundary above Core", () => {
    const generalInstructions = markdownSection(globalPolicy, "## General Instructions")
    const targetBoundary = markdownSection(core, "### Target-Solution Boundary")

    expect(generalInstructions).toContain("under no circumstances EVER provide full target implementations when guidance, scaffolding, or practice would enable the learner to proceed")
    expect(generalInstructions).toContain("provide the smallest concrete code fragment or implementation step needed to unblock them")

    const decisions = [
      "An explicit request for the complete target implementation is a request to leave guided mode.",
      "Leaving guided mode does not override higher-priority instructions.",
      "Whenever guidance, scaffolding, or practice could still enable progress, provide only the smallest permitted demonstration.",
      "If a complete target solution is permitted, explain its key decisions and retain a verification or explanation task.",
    ]
    let previousIndex = -1
    for (const decision of decisions) {
      const index = targetBoundary.indexOf(decision)
      expect(index).toBeGreaterThan(previousIndex)
      previousIndex = index
    }
  })

  test("keeps target-solution policy canonical in Core", () => {
    const targetBoundary = markdownSection(core, "### Target-Solution Boundary")
    const assignmentHints = markdownSection(assignment, "## Hint Behavior")

    expect(targetBoundary).toContain("While guided mode is active, corrected examples must remain isolated or analogous.")
    expect(assignmentHints).toContain("Requests for the target solution are governed exclusively by Core")
    expect(assignment).not.toContain("continuing to withhold it no longer has learning value")
    expect(mentor).not.toContain("Provide the target solution only when")
    expect(mentor).not.toMatch(/Do not (?:show|provide) (?:a )?corrected target implementation/)
    expect(drillInstructor).toContain("Core's target-solution boundary")
  })

  test("keeps Mentor aligned with Core support policy", () => {
    expect(mentor).toContain("Core support ladder and target-solution boundary")
    expect(mentor).toContain("While guided mode remains active, corrected examples must be isolated or analogous.")
    expect(mentor).toContain("Complete target correction follows Core's target-solution boundary.")
    expect(mentor).toContain("Productive struggle occurs when the learner has the prerequisites")
    expect(mentor).toContain("teach that prerequisite instead of withholding help")
    expect(mentor).not.toContain("prematurely")
    expect(mentor).not.toContain("Permitted teaching aids include")
  })

  test("keeps Drill Instructor aligned with Core practice policy", () => {
    expect(drillInstructor).toContain("Follow Core's Adaptive Tutelage Contract")
    expect(drillInstructor).toContain("one primary weakness")
    expect(drillInstructor).toContain("attempt unaided retrieval before reteaching")
    expect(drillInstructor).toContain("Use Core's support levels when coaching a failed attempt")
    expect(drillInstructor).toContain("completion problem or an analogous worked example only at the support level Core permits")
    expect(drillInstructor).toContain("Interleave related concepts only when the surrounding concepts are already familiar")
    expect(drillInstructor).toContain("Core's target-solution boundary")
    expect(drillInstructor).toContain("only incomplete scaffolds")
  })

  test("uses Reviewer findings as formative assessment", () => {
    expect(reviewer).toContain("Treat review as formative assessment")
    expect(reviewer).toContain("A successful implementation is evidence of behavior, not by itself proof of understanding")
    expect(reviewer).toContain("ask the learner to articulate one consequential design decision")
    expect(reviewer).toContain("Do not require articulation when it would add ceremony without useful evidence")
    expect(reviewer).toContain("recommend one independent variation")
    expect(reviewer).toContain("transfer remains unproven")
  })

  test("keeps Architect calibrated and focused on design", () => {
    expect(architect).toContain("Follow Core's Adaptive Tutelage Contract")
    expect(architect).toContain("support calibrated to demonstrated ability")
    expect(architect).toContain("articulate one important boundary or trade-off decision")
    expect(architect).toContain("**Focus on Structure:**")
    expect(architect).toContain("**Avoid Code:**")
    expect(architect).not.toContain("Junior Software Engineers")
    expect(architect).not.toContain("support levels")
  })

  test("keeps the canonical support ladder in Core", () => {
    const adaptiveSupport = markdownSection(core, "### Adaptive Support")
    const entries = [...adaptiveSupport.matchAll(/^(\d+)\. \*\*([^*]+):\*\* (.+)$/gm)]

    expect(entries).toHaveLength(9)
    expect(entries.map((entry) => Number(entry[1]))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(entries.map((entry) => entry[2])).toEqual([
      "Independent attempt",
      "Elicit reasoning",
      "Conceptual clue",
      "Relevant pointer",
      "Structural guidance",
      "Syntax or tooling clue",
      "Analogous worked example",
      "Target-specific pseudocode",
      "Smallest target implementation fragment",
    ])

    expect(entries[5][3]).toContain("syntax, command, or API detail")
    expect(entries[6][3]).toContain("outside the learner's target problem")
    expect(entries[7][3]).toContain("without executable target code")
    expect(entries[8][3]).toContain("leaving integration and substantive decisions to the learner")

    expect(adaptiveSupport).toContain("they are not mandatory sequential turns")
    expect(adaptiveSupport).toContain("Select the lowest level likely to enable productive progress")
    expect(adaptiveSupport).not.toContain("complete target implementation")
  })

  test("keeps assignment support selection delegated to Core", () => {
    const hintBehavior = markdownSection(assignment, "## Hint Behavior")

    expect(hintBehavior).toContain("begins at Core Level 0")
    expect(hintBehavior).toContain("Core's Adaptive Support policy")
    expect(hintBehavior).toContain("Core's repeated-attempt reassessment rule")
    expect(hintBehavior).toContain("Requests for the target solution are governed exclusively by Core")
    expect(hintBehavior).not.toMatch(/^\d+\. \*\*[^*]+:\*\*/gm)
  })

  test("allows missing prerequisite syntax and tooling to bypass support escalation", () => {
    const calibration = markdownSection(core, "### Calibration")
    const adaptiveSupport = markdownSection(core, "### Adaptive Support")
    const prerequisiteGate = markdownSection(assignment, "## Prerequisite Gate")
    const hintBehavior = markdownSection(assignment, "## Hint Behavior")

    expect(calibration).toContain("If it is missing, teach or practice that prerequisite before advancing")
    expect(adaptiveSupport).toContain("Teach missing prerequisite syntax, API knowledge, or tool operation immediately rather than withholding it as a hint")
    expect(prerequisiteGate).toContain("Do not hide required syntax or tool operation behind a hint")
    expect(hintBehavior).toContain("If syntax or tool operation is a missing prerequisite, teach that prerequisite before issuing the target assignment")
  })

  test("does not treat confidence alone as mastery evidence", () => {
    const evidencePriority = markdownSection(core, "### Evidence Priority")
    const assignmentCompletion = markdownSection(assignment, "## Assignment Completion")

    expect(evidencePriority).toContain("Confidence, agreement, response length, and statements such as \"I understand\" are not sufficient evidence of mastery")
    expect(assignmentCompletion).toContain("Update learner evidence only from demonstrated behavior, not confidence or agreement")
  })

  test("requires a less-supported variation before recording transfer", () => {
    const scaffoldFading = markdownSection(core, "### Scaffold Fading")
    const masteryEvidence = markdownSection(core, "### Mastery Evidence")
    const assignmentCompletion = markdownSection(assignment, "## Assignment Completion")

    expect(scaffoldFading).toContain("Ask for an independent variation after success")
    expect(masteryEvidence).toContain("Reduce support and vary the context before treating capability as independent or transferable")
    expect(assignmentCompletion).toContain("different surface form")
    expect(assignmentCompletion).toContain("Reduce scaffolding for that variation and assess the learner's result before recording transfer")
  })

  test("keeps internal pedagogy terms out of required learner-facing labels", () => {
    const assignmentTemplate = firstFencedBlock(markdownSection(assignment, "## Assignment Output Format"))
    const outputContracts = [
      assignmentTemplate,
      markdownSection(drillInstructor, "### Output Format for Exercises"),
      markdownSection(reviewer, "### Output Format"),
      markdownSection(architect, "### Interaction Format"),
    ]
    const labels = outputContracts.flatMap(learnerFacingLabels)
    const internalTerms = [
      /(?:BELOW|IN|ABOVE)_ZPD/,
      /\bZPD\b/,
      /Adaptive Tutelage Contract/i,
      /Core Level \d/i,
      /support ladder/i,
      /formative assessment/i,
      /mastery evidence/i,
      /\b(?:EXPOSED|ASSISTED|INDEPENDENT|TRANSFERABLE)\b/,
    ]

    for (const label of labels) {
      for (const term of internalTerms) expect(label).not.toMatch(term)
    }
  })

  test("uses one unambiguous assignment action format", () => {
    expect(assignment).toContain("- `## Actions`")
    expect(assignment).toContain("## Actions\n")
    expect(assignment).toContain("Actions are outcome-oriented checkpoints")
    expect(assignment).toContain("must not reveal target abstractions, control flow, syntax, or procedure")
    expect(assignment).not.toContain("`Description` and `Steps` output format")
  })

  test("routes conceptual review findings through the orchestrator", () => {
    expect(reviewer).toContain("return it to the orchestrator")
    expect(reviewer).toContain("Mentor for explanation")
    expect(reviewer).toContain("Drill Instructor only when evidence shows")
  })

  test("guarantees bounded learner state for assignment delegation", () => {
    expect(orchestrator).toContain("obtain the bounded learner summary unless it is already available this turn")
    expect(orchestrator).toContain("verbatim original request")
  })
})
