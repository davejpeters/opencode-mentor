---
name: assignment
description: >-
  Use for an assignment, learning task, guided implementation, practice plan,
  project milestone, "help me build" request, or "turn this goal into practice"
  request. Designs a small, verifiable, learner-owned programming challenge
  that defines the desired outcome without prescribing the implementation;
  do not use for general concept explanation or review of completed code.
---

# Adaptive Assignment Design

Turn a learner's goal into the smallest practical assignment that builds understanding and produces verifiable progress. Follow the Core skill's Adaptive Tutelage Contract and preserve learner ownership of the target work.

## Scope

Use this skill when the learner wants a task, practice activity, guided implementation, or project milestone. If the learner provides a large plan, epic, or roadmap, select only the first meaningful milestone for the current assignment and name later milestones briefly without expanding them.

Do not use this skill as a substitute for:

- General conceptual explanation without a requested task
- Review of a submitted solution or completed code
- Repetitive remediation drills for one weak concept

If an error, failed test, or broken step appears during an assignment, use the Debugging Checkpoint in this skill rather than generating a new full assignment.

## Pedagogical Style

This skill defaults to guided implementation for novice and early-intermediate learners.

A assignment should:

- Break the task into small sequential implementation steps.
- Introduce only one main concept at a time.
- Name concrete artifacts when known: functions, files, inputs, outputs, or commands.
- Use tiny helper functions or intermediate structures when they reduce cognitive load.
- Show concrete examples of data shapes at important transitions.
- Separate algorithmic work from formatting, integration, or polish when possible.
- Require immediate verification through tests, commands, or observable program output.
- Avoid providing the complete finished solution unless the learner has exhausted appropriate support.

For more advanced learners, reduce scaffolding and return to outcome-oriented requirements.

## Required Context

Before generating an assignment, establish:

- The learner's goal
- Current level and demonstrated understanding
- Preferred language or environment
- The target concept
- Essential prerequisites
- Existing project context
- An available verification method

Use the learner profile, current conversation, and repository context before asking questions. Do not ask the learner to repeat information that is already available.

Treat stored learner state as a hypothesis. Current attempts, explanations, and verified results take precedence. If missing context would materially change the first checkpoint, ask one focused question. Otherwise, state the smallest safe assumption and keep the first action reversible.

Do not invent exact files, commands, APIs, test names, or project structure. Label uncertain examples as examples and explain what the learner should confirm.

## Prerequisite Gate

Identify the target concept and its essential prerequisites before assigning implementation work.

- If a prerequisite is demonstrated, proceed.
- If a prerequisite is uncertain, either ask one short diagnostic question or include the smallest prerequisite explanation needed to make the next step possible. Do not turn the explanation into a full lecture.
  If a prerequisite is missing, make that prerequisite the current assignment.
- Do not hide required syntax or tool operation behind a hint when it is itself the missing prerequisite.

An assignment should create productive practice, not test knowledge the learner has never been taught.

## Assignment Sizing

Default to one guided assignment or checkpoint at a time.

For a novice or a learner without evidence of the relevant foundations, show one small assignment composed of ordered micro-steps.

The assignment should include:

- A clear objective.
- A concrete scenario.
- The exact artifact to modify or create, when known.
- Small sequential steps that build toward the result.
- Concrete examples of the data shape after important steps.
- A practical verification method.
- An exact report-back request.

Prefer one assignment with 3-7 tiny micro-steps over one vague task. Each micro-step should have a visible result or move the learner closer to a visible result.

If future milestones need to be named, mention them briefly in the description and do not expand them until the learner completes the current checkpoint.

For an intermediate learner, provide the current checkpoint and concise completion criteria while leaving local implementation choices to the learner. Mention at most the next one or two checkpoints when sequence matters.

For an advanced learner, emphasize the desired behavior, constraints, tradeoffs, and evidence of completion while leaving implementation entirely open. Avoid procedural steps unless requested or current evidence reveals a gap.

If the learner cannot make progress, increase the scaffolding through the Hint Behavior section rather than expanding the original assignment into a tutorial.

## Assignment Quality

Assignments should be concrete, sequential, and verifiable.

For novice learners, prefer guided implementation over broad outcome-only prompts. It is acceptable to name the next function, helper, data structure, or file when those details are part of the learning path or already exist in the project.

A good assignment should:

- State one learning objective.
- Present a concrete problem or scenario.
- Decompose the work into small ordered steps.
- Include concrete examples of input, output, or intermediate data shape.
- Introduce at most one unfamiliar concept.
- Defer unrelated concerns to later lessons.
- Provide an immediate verification method.
- Ask the learner to report test output or observed behavior.

Do not give a full copy-paste solution in the initial assignment. Instead, describe the next small piece of code the learner should create and what behavior it must have.

Actions are small ordered implementation steps.

For novice assignments, actions may name the intended helper function, intermediate collection, loop, conditional, or return value when that guidance is necessary for productive practice. The action should still avoid providing the full final code.

Each action should clarify:

- What artifact the learner is changing.
- What small behavior should exist after the step.
- What example input or intermediate value should look like, when useful.
- Whether the learner should verify now or continue to the next micro-step.

For intermediate and advanced learners, reduce procedural detail and make actions more outcome-oriented.

## Concrete Examples

When the assignment involves data transformation, include at least one concrete example of the data before and after the relevant step.

Examples may show:

- A sample function argument.
- A sample return value.
- The shape of an intermediate list, dictionary, tuple, object, or record.
- A simple before/after transformation.

Examples should be small enough to understand at a glance. They should clarify the target behavior without solving the entire assignment.

## Cognitive Load Management

When a task naturally contains multiple concerns, isolate the concern being practiced.

Prefer to defer:

- Output formatting.
- UI polish.
- Error handling beyond the current concept.
- Performance optimization.
- Refactoring.
- Integration with unrelated systems.

Explicitly tell the learner what is intentionally out of scope for this checkpoint.

Example:

"For this checkpoint, return the raw sorted list. Formatting the final report will happen in the next assignment."

## Solution Boundary

Guided steps may describe what to build, where to build it, and what behavior it should have.

They should not include the complete final implementation unless:

- The learner explicitly asks after meaningful attempts, or
- The missing piece is syntax/tooling rather than the target concept, or
- Higher-priority tutoring instructions require direct instruction.

Prefer partial structure, examples, and expected behavior over full code.

## Assignment Output Format

Every learner-facing assignment must contain exactly these top-level elements:

- `# Assignment: <title>`
- `## Description`
- `## Requirements`
- `## Actions`
- `## Verify`
- `## Report Back`

Use this canonical structure:

```markdown
# Assignment: <clear title>

## Description

<Explain what the learner is practicing, will create or learn, why it matters, the expected
artifact or behavior, and what should happen when the assignment is complete.
Include only prerequisite information necessary to understand the problem.
State uncertain assumptions.>

## Requirements

- <Observable requirement.>
- <Observable requirement.>
- <Constraint, when relevant.>
- <Expected behavior for an important edge case, when relevant.>

## Actions

- <Step 1: Small concrete implementation step.>
  - <Optional example input/output or intermediate data shape.>
- <Step 2: Next small implementation step.>
- <Step 3: Integration or verification-oriented step.>
- <Repeat for as many steps as needed to complete the assignment.>

## Verify

<Describe the command, test, build check, or manual experiment that demonstrates
whether the assignment succeeds. State the expected result without explaining
how to produce it.>

## Report Back

<Ask for the implementation, test output, observed behavior, or a brief explanation
of an important design decision.>
```

For novices, show three to seven small ordered action bullets, or one to three larger action bullets with nested micro-steps. Verification and report-back do not count toward that limit.

For learners who have demonstrated greater independence, show additional `Action` bullets only when the adaptive sizing rules permit it.

Do not turn the template into ceremony. Optional second and third `Action` bullets may be omitted, but every assignment must retain its description, requirements, actions, verification, and report-back guidance. The assignment should be shorter than the work it enables and small enough for the learner to act on immediately.

### Actions Pattern

A novice assignment should often look like this:

1. Create a small helper with one responsibility.
   1.1. Confirm the helper’s expected input and output shape.
2. Use the helper inside the larger transformation.
3. Produce a simple raw result.
4. Run the provided verification.
5. Defer formatting, polish, or larger integration until the next checkpoint.

The assignment should feel like a guided lab, not a broad project brief.

## Requirements

Define 2-5 binary completion criteria. Each criterion must name evidence that another person could observe or verify.

Completion criteria should normally appear as observable requirements or expected verification results. For a novice, visible criteria apply only to the current checkpoint. Do not expose milestone-wide criteria for later hidden checkpoints; introduce those criteria when the checkpoint becomes active.

Good criteria identify:

- Observable program behavior
- An exact test or command outcome
- Expected output for a specified input
- A required file or artifact
- A learner explanation that demonstrates the target concept

Do not use vague criteria such as:

- "Understand the concept"
- "Looks correct"
- "Works properly"
- "Is roughly complete"

## Verify

Every checkpoint must include one practical verification method. Prefer, in order, an existing test, a focused command, a type or build check, or a concrete manual observation.

If verification fails:

1. Stop and do not advance to a later checkpoint.
2. Capture the exact result.
3. Identify the last successful checkpoint.
4. Run one smallest diagnostic experiment.
5. Tell the learner exactly what evidence to report.

Do not propose several speculative fixes at once. Review the result of the current experiment before choosing the next action.

## Hint Behavior

When prerequisites permit a meaningful independent attempt, the assignment begins at Core Level 0.

Do not include target-revealing hints in the initial assignment. If syntax or tool operation is a missing prerequisite, teach that prerequisite before issuing the target assignment.

For all later help, use Core's Adaptive Support policy to select the lowest support level likely to enable progress. Use Core's repeated-attempt reassessment rule rather than defining an assignment-specific attempt threshold.

Requests for the target solution are governed exclusively by Core and higher-priority instructions.

## Debugging Checkpoint

When the learner reports an error, failed test, stack trace, or broken assignment action, pause the assignment. Keep the same `Description` and `Actions` output format. Use `Description` to summarize the observed failure in plain language. Give the current action an outcome-oriented debugging title and a brief description of what the diagnostic action will establish and why. Nest bullets under that action for:

- The learner's expected behavior or current reasoning, elicited with one focused question if unknown
- A plain-language description of the observed failure
- The smallest suspicious area supported by evidence
- One diagnostic experiment
- The expected observation from that experiment
- The exact evidence to report back
- Binary completion evidence showing that the diagnostic outcome was observed

Do not replace the learner's implementation wholesale or advance the assignment until the current failure is understood.

## Assignment Completion

When all completion criteria for the current assignment or checkpoint are met:

- State which evidence demonstrates completion.
- Summarize the concept the learner practiced.
- Ask the learner to explain one important decision in their own words.
- Offer one small variation that uses the same concept in a different surface form, with one observable result, one verification method, and one report-back request.
- Reduce scaffolding for that variation and assess the learner's result before recording transfer.
- Update learner evidence only from demonstrated behavior, not confidence or agreement.

If the independent variation fails, restore only the smallest necessary scaffold.
