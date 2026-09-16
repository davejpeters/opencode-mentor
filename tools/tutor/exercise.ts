import { tool as exerciseTool } from "@opencode-ai/plugin"
import { asToolResult } from "./runtime"
import type { Exercise, ExerciseFormat } from "./types"
import {
  getConceptByID,
  getProfile,
  loadExercises,
  mergeMisconceptions,
  nowISO,
  recordEvidence,
  saveExercises,
  saveProfile,
  textIncludesAny,
} from "./runtime"

function makeID(): string {
  const random = (globalThis as any).crypto
  return random && "randomUUID" in random
    ? random.randomUUID()
    : `exercise-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function expectedSignalsFor(conceptID: string): string[] {
  const signals: Record<string, string[]> = {
    "program-flow": ["step", "condition", "loop", "return"],
    functions: ["input", "return", "parameter", "responsibility"],
    "data-modeling": ["field", "type", "schema", "state"],
    interfaces: ["contract", "method", "implementation", "dependency"],
    testing: ["expected", "actual", "assert", "edge case"],
    debugging: ["symptom", "cause", "reproduce", "observe"],
    "architecture-boundaries": ["boundary", "responsibility", "dependency", "tradeoff"],
  }

  return signals[conceptID] ?? ["explain", "tradeoff", "example"]
}

function promptFor(conceptID: string, title: string, difficulty: number, format: ExerciseFormat): string {
  const base = `Practice concept: ${title}. ${conceptID}`

  if (format === "quiz") {
    return `${base}\n\nAnswer in 4-6 sentences: what problem does this concept solve, what is one common mistake, and how would you recognize that mistake in code?`
  }

  if (format === "explain") {
    return `${base}\n\nExplain this concept as if teaching a newer programmer. Include one analogy, one practical scenario, and one warning sign that shows the concept is being misused.`
  }

  return `${base}\n\nCreate an incomplete exercise scaffold for this concept at difficulty ${difficulty}/5. Include signatures, TODO placeholders, expected behavior notes, and test stubs or acceptance checks. Do not fill in the implementation; the learner must complete it.`
}

type GradeResult = {
  score: number
  passed: boolean
  feedback: string
  misconceptions: string[]
  matchedSignals: string[]
  missingSignals: string[]
  rubric: Record<string, number>
}

function includesAny(text: string, signals: string[]): boolean {
  const lower = text.toLowerCase()
  return signals.some((signal) => lower.includes(signal))
}

function scoreBoolean(value: boolean): number {
  return value ? 1 : 0
}

function average(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
}

function gradeQuizSubmission(exercise: Exercise, submission: string): GradeResult {
  const matchedSignals = textIncludesAny(submission, exercise.expectedSignals)
  const missingSignals = exercise.expectedSignals.filter((signal) => !matchedSignals.includes(signal))
  const rubric = {
    purpose: scoreBoolean(includesAny(submission, ["solve", "purpose", "helps", "useful", "because"])),
    mistake: scoreBoolean(includesAny(submission, ["mistake", "wrong", "bug", "confusing", "pitfall"])),
    recognition: scoreBoolean(includesAny(submission, ["recognize", "notice", "symptom", "sign", "when"])),
    conceptCoverage: matchedSignals.length / Math.max(exercise.expectedSignals.length, 1),
  }
  const score = average(Object.values(rubric))
  const passed = score >= 0.7 && rubric.purpose > 0 && rubric.mistake > 0 && rubric.recognition > 0

  return {
    score,
    passed,
    feedback: passed
      ? "Pass: the answer explains the concept, a likely mistake, and how to recognize it."
      : "Not yet: explain the concept's purpose, one common mistake, and how you would recognize that mistake.",
    misconceptions: passed ? [] : missingSignals.map((signal) => `Answer did not clearly address expected signal: ${signal}`),
    matchedSignals,
    missingSignals,
    rubric,
  }
}

function gradeExplainSubmission(exercise: Exercise, submission: string): GradeResult {
  const matchedSignals = textIncludesAny(submission, exercise.expectedSignals)
  const missingSignals = exercise.expectedSignals.filter((signal) => !matchedSignals.includes(signal))
  const rubric = {
    analogy: scoreBoolean(includesAny(submission, ["like", "similar", "imagine", "analogy"])),
    scenario: scoreBoolean(includesAny(submission, ["for example", "scenario", "when", "suppose"])),
    warningSign: scoreBoolean(includesAny(submission, ["warning", "misuse", "smell", "mistake", "avoid"])),
    conceptCoverage: matchedSignals.length / Math.max(exercise.expectedSignals.length, 1),
  }
  const score = average(Object.values(rubric))
  const passed = score >= 0.7 && rubric.analogy > 0 && rubric.scenario > 0 && rubric.warningSign > 0

  return {
    score,
    passed,
    feedback: passed
      ? "Pass: the explanation includes a useful mental model, a practical scenario, and a misuse warning."
      : "Not yet: include a mental model or analogy, a practical scenario, and a warning sign for misuse.",
    misconceptions: passed ? [] : missingSignals.map((signal) => `Explanation did not clearly address expected signal: ${signal}`),
    matchedSignals,
    missingSignals,
    rubric,
  }
}

function gradeCodeStubSubmission(exercise: Exercise, submission: string): GradeResult {
  const matchedSignals = textIncludesAny(submission, exercise.expectedSignals)
  const missingSignals = exercise.expectedSignals.filter((signal) => !matchedSignals.includes(signal))
  const hasTodo = includesAny(submission, ["todo", "your code here", "fill", "implement me", "placeholder"])
  const hasSignature = /\b(func|function|def|class|interface|type|struct)\b/.test(submission)
  const hasExpectation = includesAny(submission, ["expect", "assert", "should", "given", "when", "then"])
  const hasNotes = includesAny(submission, ["expected", "behavior", "constraint", "return", "input"])
  const likelyCompleteImplementation = /\breturn\s+[^\n;]+/.test(submission) && !hasTodo
  const rubric = {
    scaffold: scoreBoolean(hasSignature),
    placeholders: scoreBoolean(hasTodo),
    testStub: scoreBoolean(hasExpectation),
    behaviorNotes: scoreBoolean(hasNotes),
    incompleteByDesign: scoreBoolean(!likelyCompleteImplementation),
    conceptCoverage: matchedSignals.length / Math.max(exercise.expectedSignals.length, 1),
  }
  const score = average(Object.values(rubric))
  const passed = score >= 0.7 && rubric.scaffold > 0 && rubric.placeholders > 0 && rubric.incompleteByDesign > 0

  return {
    score,
    passed,
    feedback: passed
      ? "Pass: the scaffold gives the learner structure, TODOs, and validation cues without completing the solution."
      : "Not yet: provide an incomplete scaffold with signatures, TODO placeholders, behavior notes, and test stubs or acceptance checks.",
    misconceptions: passed
      ? []
      : [
        ...missingSignals.map((signal) => `Scaffold did not clearly address expected signal: ${signal}`),
        ...(likelyCompleteImplementation ? ["Scaffold appears to include a completed implementation instead of leaving work for the learner."] : []),
      ],
    matchedSignals,
    missingSignals,
    rubric,
  }
}

function gradeSubmission(exercise: Exercise, submission: string): GradeResult {
  if (exercise.format === "quiz") return gradeQuizSubmission(exercise, submission)
  if (exercise.format === "explain") return gradeExplainSubmission(exercise, submission)
  return gradeCodeStubSubmission(exercise, submission)
}

export const generate = exerciseTool({
  description: "Generate and persist a targeted exercise for a concept. Only generate incomplete scaffolds/signatures with specific TODOs validated by test-driven stubs.",
  args: {
    conceptID: exerciseTool.schema.string(),
    difficulty: exerciseTool.schema.number().min(1).max(5).optional(),
    format: exerciseTool.schema.enum(["code", "quiz", "explain"]).optional(),
  },
  async execute(args, context) {
    const concept = getConceptByID(args.conceptID, context)
    const difficulty = args.difficulty ?? concept?.difficulty ?? 2
    const format = (args.format ?? "explain") as ExerciseFormat
    const exercise: Exercise = {
      exerciseID: makeID(),
      conceptID: args.conceptID,
      title: concept?.title ?? args.conceptID,
      prompt: promptFor(args.conceptID, concept?.title ?? args.conceptID, difficulty, format),
      difficulty,
      format,
      expectedSignals: expectedSignalsFor(args.conceptID),
      hiddenSolutionNotes: [
        "This is heuristic grading, not a proof of correctness.",
        "Code-format exercises must remain incomplete scaffolds for the learner to finish.",
      ],
      status: "generated",
      createdAt: nowISO(),
    }

    const exercises = loadExercises(context)
    exercises[exercise.exerciseID] = exercise
    saveExercises(context, exercises)

    return asToolResult(exercise)
  },
})

export const grade = exerciseTool({
  description: "Grade an exercise attempt using simple local heuristics and update learner evidence when learnerID is supplied",
  args: {
    exerciseID: exerciseTool.schema.string(),
    submission: exerciseTool.schema.string(),
    rubricID: exerciseTool.schema.string().optional(),
    learnerID: exerciseTool.schema.string().optional(),
    hintsUsed: exerciseTool.schema.number().min(0).optional(),
  },
  async execute(args, context) {
    const exercises = loadExercises(context)
    const exercise = exercises[args.exerciseID]

    if (!exercise) {
      return asToolResult({
        exerciseID: args.exerciseID,
        score: 0,
        passed: false,
        feedback: "Exercise not found in .opencode/mentor/exercises.json.",
        misconceptions: ["The submitted exercise ID does not match a generated exercise."],
        matchedSignals: [],
        missingSignals: [],
        rubric: {},
      })
    }

    const grade = gradeSubmission(exercise, args.submission)

    exercises[exercise.exerciseID] = {
      ...exercise,
      status: grade.passed ? "passed" : "failed",
      lastGradedAt: nowISO(),
    }
    saveExercises(context, exercises)

    if (args.learnerID) {
      const profile = getProfile(args.learnerID, context)
      const hintsUsed = Math.max(args.hintsUsed ?? 0, 0)
      const withEvidence = recordEvidence(profile, [exercise.conceptID], {
        sessionID: context.sessionID ?? "unknown-session",
        agent: "drill-instructor",
        outcome: grade.passed ? "success" : grade.score >= 0.4 ? "partial" : "stuck",
        note: grade.feedback,
        hintsUsed,
      })
      const withMisconceptions = mergeMisconceptions(withEvidence, exercise.conceptID, grade.misconceptions)
      saveProfile(withMisconceptions, context)
    }

    return asToolResult({
      exerciseID: exercise.exerciseID,
      score: grade.score,
      passed: grade.passed,
      feedback: grade.feedback,
      misconceptions: grade.misconceptions,
      matchedSignals: grade.matchedSignals,
      missingSignals: grade.missingSignals,
      rubric: grade.rubric,
    })
  },
})
