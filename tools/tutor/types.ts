export type LearnerLevel = "novice" | "practicing" | "competent"

export type MentorOrchestratorAgent =
  | "mentor"
  | "reviewer"
  | "architect"
  | "drill-instructor"

export type LearningOutcome = "success" | "partial" | "stuck"
export type ExerciseFormat = "code" | "quiz" | "explain"
export type ExerciseStatus = "generated" | "submitted" | "passed" | "failed"

export interface EvidenceEvent {
  sessionID: string
  agent: MentorOrchestratorAgent
  outcome: LearningOutcome
  concepts: string[]
  timestamp: string
  note?: string
  hintsUsed?: number
}

export interface ConceptMastery {
  mastery: number // 0.0 .. 1.0
  attempts: number
  successes: number
  failures: number
  hintsUsed: number
  lastSeenAt: string
  nextReviewAt?: string
  evidence: EvidenceEvent[]
}

export interface LearnerReflection {
  sessionID: string
  summary: string
  skillsObserved: string[]
  blockers: string[]
  confidenceDelta?: number
  timestamp: string
}

export interface LearnerProfile {
  learnerID: string
  projectID: string
  projectPath?: string
  preferredLanguage: string
  currentGoal?: string | null
  level: LearnerLevel
  concepts: Record<string, ConceptMastery>
  misconceptions: Record<string, string[]>
  activeCurriculumPath: string[]
  preferredExerciseFormats: ExerciseFormat[]
  reflectionHistory: LearnerReflection[]
  createdAt: string
  updatedAt: string
}

export interface LearnerProfileViewOptions {
  mode?: "summary" | "detailed"
  conceptIDs?: string[]
  reflectionLimit?: number
  evidenceLimit?: number
}

export interface ConceptMasteryView extends Omit<ConceptMastery, "evidence"> {
  evidenceCount: number
  recentEvidence?: EvidenceEvent[]
}

export type ConceptMasterySummary = Omit<ConceptMasteryView, "recentEvidence">

export interface LearnerProfileSummary {
  mode: "summary"
  learnerID: string
  preferredLanguage: string
  currentGoal?: string | null
  level: LearnerLevel
  focusConcepts: Record<string, ConceptMasterySummary>
  misconceptions: Record<string, string[]>
  activeCurriculumPath: string[]
  preferredExerciseFormats: ExerciseFormat[]
  lastSessionSummary?: string
  recentBlockers: string[]
  recentSkillsObserved: string[]
  updatedAt: string
}

export interface LearnerProfileDetail {
  mode: "detailed"
  learnerID: string
  preferredLanguage: string
  currentGoal?: string | null
  level: LearnerLevel
  concepts: Record<string, ConceptMasteryView>
  misconceptions: Record<string, string[]>
  activeCurriculumPath: string[]
  preferredExerciseFormats: ExerciseFormat[]
  reflectionHistory: LearnerReflection[]
  evidenceIncluded: boolean
  updatedAt: string
}

export type LearnerProfileView = LearnerProfileSummary | LearnerProfileDetail

export type LearnerProfileChangeField = keyof Pick<
  LearnerProfile,
  | "projectID"
  | "projectPath"
  | "preferredLanguage"
  | "currentGoal"
  | "misconceptions"
  | "activeCurriculumPath"
  | "preferredExerciseFormats"
>

export interface LearnerUpdateResult {
  learnerID: string
  changedFields: LearnerProfileChangeField[]
  affectedConceptIDs: string[]
  evidenceRecorded: boolean
  levelChange?: {
    from: LearnerLevel
    to: LearnerLevel
  }
  updatedAt: string
}

export interface SessionReflectionResult {
  recorded: true
  learnerID: string
  sessionID: string
  reflectionCount: number
  updatedAt: string
}

export interface ConceptNode {
  id: string
  title: string
  description: string
  tags: string[]
  difficulty: number // 1..5
  prerequisites: string[]
}

export interface ConceptEdge {
  from: string
  to: string
  relation: "prerequisite" | "related"
}

export interface Exercise {
  exerciseID: string
  conceptID: string
  title: string
  prompt: string
  difficulty: number
  format: ExerciseFormat
  expectedSignals: string[]
  hiddenSolutionNotes: string[]
  status: ExerciseStatus
  createdAt: string
  lastGradedAt?: string
}

export interface ExerciseGrade {
  exerciseID: string
  score: number
  passed: boolean
  feedback: string
  misconceptions: string[]
  matchedSignals: string[]
  missingSignals: string[]
  rubric: Record<string, number>
}

export type ProgressionEvent = {
  kind: "new_topic" | "assignment_request" | "stuck" | "exercise_graded" | "solution_submitted" | "design_question"
  conceptID?: string
  passed?: boolean
  score?: number
}

export interface NextAction {
  agent: MentorOrchestratorAgent
  action:
  | "explain-tradeoffs"
  | "critique-code"
  | "diagnose-and-hint"
  | "generate-remediation-drill"
  | "diagnose-prerequisite"
  | "teach-prerequisite"
  | "diagnose-assignment"
  | "design-guided-assignment"
  | "guided-practice"
  | "start-curriculum"
  conceptID?: string
  reason?: string
}
