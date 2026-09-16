import { tool as sessionTool } from "@opencode-ai/plugin"
import type { LearnerReflection, SessionReflectionResult } from "./types"
import { asToolResult, getProfile, nowISO, resolveLearnerID, saveProfile } from "./runtime"

export const reflect = sessionTool({
  description: "Persist a short learning reflection for the current session",
  args: {
    learnerID: sessionTool.schema.string().optional(),
    sessionID: sessionTool.schema.string().optional(),
    summary: sessionTool.schema.string(),
    skillsObserved: sessionTool.schema.array(sessionTool.schema.string()).optional(),
    blockers: sessionTool.schema.array(sessionTool.schema.string()).optional(),
    confidenceDelta: sessionTool.schema.number().min(-1).max(1).optional(),
  },
  async execute(args, context) {
    const summary = args.summary.trim()
    if (!summary) throw new Error("Reflection summary must not be empty.")

    const learnerID = resolveLearnerID(args.learnerID)
    const profile = getProfile(learnerID, context)
    const reflection: LearnerReflection = {
      sessionID: args.sessionID ?? context.sessionID ?? "unknown-session",
      summary,
      skillsObserved: args.skillsObserved ?? [],
      blockers: args.blockers ?? [],
      confidenceDelta: args.confidenceDelta,
      timestamp: nowISO(),
    }

    const updated = saveProfile(
      {
        ...profile,
        reflectionHistory: [...profile.reflectionHistory, reflection].slice(-50),
      },
      context,
    )

    return asToolResult<SessionReflectionResult>({
      recorded: true,
      learnerID,
      sessionID: reflection.sessionID,
      reflectionCount: updated.reflectionHistory.length,
      updatedAt: updated.updatedAt,
    })
  },
})
