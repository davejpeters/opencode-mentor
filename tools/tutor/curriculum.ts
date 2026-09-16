import { tool as curriculumTool } from "@opencode-ai/plugin"
// import { asToolResult } from "./runtime"
import { asToolResult, chooseNextAction, getProfile, loadConceptGraph, masteryFor, resolveLearnerID } from "./runtime"

export const next = curriculumTool({
  description: "Pick the next concept and recommended agent based on learner profile and concept graph",
  args: {
    learnerID: curriculumTool.schema.string().optional(),
    goal: curriculumTool.schema.string().optional(),
    currentConceptID: curriculumTool.schema.string().optional(),
    eventKind: curriculumTool.schema
      .enum(["new_topic", "assignment_request", "stuck", "exercise_graded", "solution_submitted", "design_question"])
      .optional(),
    passed: curriculumTool.schema.boolean().optional(),
    score: curriculumTool.schema.number().min(0).max(1).optional(),
  },
  async execute(args, context) {
    const learnerID = resolveLearnerID(args.learnerID)
    const profile = getProfile(learnerID, context)
    const graph = loadConceptGraph(context)
    const eventKind = args.eventKind ?? (args.goal?.toLowerCase().includes("design") ? "design_question" : "new_topic")

    const action = chooseNextAction(
      profile,
      {
        kind: eventKind,
        conceptID: args.currentConceptID,
        passed: args.passed,
        score: args.score,
      },
      context,
    )

    const nextConceptID = action.action === "diagnose-assignment"
      ? undefined
      : action.conceptID ?? selectLowestMasteryConcept(profile, graph.concepts.map((concept) => concept.id))
    const concept = graph.concepts.find((item) => item.id === nextConceptID)

    return asToolResult({
      learnerID,
      goal: args.goal ?? profile.currentGoal ?? null,
      nextConceptID: nextConceptID ?? null,
      nextConceptTitle: concept?.title ?? nextConceptID ?? null,
      reason: action.reason ?? "Selected from learner profile and concept graph.",
      recommendedAgent: action.agent,
      recommendedAction: action.action,
      learnerLevel: profile.level,
      currentMastery: nextConceptID ? masteryFor(profile, nextConceptID) : null,
    })
  },
})

function selectLowestMasteryConcept(profile: ReturnType<typeof getProfile>, conceptIDs: string[]): string {
  const sorted = conceptIDs
    .map((conceptID) => ({ conceptID, mastery: masteryFor(profile, conceptID) }))
    .sort((a, b) => a.mastery - b.mastery)

  return sorted[0]?.conceptID ?? "program-flow"
}
