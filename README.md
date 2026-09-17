# MAI: Mentor AI Infrastructure for OpenCode

MAI is an opinionated [OpenCode](https://opencode.ai/) configuration for learning software development with AI. It is inspired by [Boot.dev](https://boot.dev/) and [PAI](https://github.com/danielmiessler/pai), with a mentor-first goal: use AI to strengthen reasoning and independent problem-solving, not merely to produce code quickly.

The default assistant a learning orchestrator that routes work to specialist agents. The prompts favor diagnosis, small hints, deliberate practice, review, verification, and gradually reduced support. This repository is configuration and an evolving experiment, not a claim that AI can replace teachers, experience, or independent judgment.

## Architecture

```text
OpenCode
  -> opencode.json and AGENTS.md
  -> mentor-orchestrator
  -> mentor | reviewer | architect | drill-instructor
  -> skills and project-aware tools
  -> local learner state and session reflection
```

- [opencode.json](opencode.json) selects the primary agent, loads plugins, configures Context7, and defines baseline permissions.
- [AGENTS.md](AGENTS.md) establishes the Rob identity and repository-wide operating rules.
- [agents](agents/) contains the orchestrator and specialist prompts.
- [core](skills/core/SKILL.md) supplies the shared tutoring policy at runtime.
- [tutor](tools/tutor.ts) exposes learner-profile, concept-graph, curriculum, exercise, grading, and reflection tools implemented under `tools/tutor/`.
- `plugins/context-loader.ts` injects the shared Core policy once per session.

## Agent Roles

| Agent               | Responsibility                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Mentor Orchestrator](agents/mentor-orchestrator.md) | Classifies requests, retrieves only relevant learner context, and delegates to a specialist. |
| [Mentor](agents/mentor.md) | Explains concepts, diagnoses errors, and gives the least help needed for progress. |
| [Reviewer](agents/reviewer.md) | Reviews submitted work for correctness, design, security, and learning evidence without rewriting it by default. |
| [Architect](agents/architect.md) | Explores system boundaries, data flow, constraints, and trade-offs. |
| [Drill Instructor](agents/drill-instructor.md) | Creates focused exercises, evaluates attempts, and adjusts difficulty from observed results. |

A pair-programmer prompt is included but disabled by default so the mentor-first workflow remains the primary path. OpenCode's built-in `explore` agent is used for codebase discovery where permitted.

## Pedagogy

- [PEDAGOGY](PEDAGOGY.md) explains the educational rationale and vocabulary.
- [core](skills/core/SKILL.md) is the operational source of truth for tutoring behavior.
- Role prompts in `agents/` specialize Core without replacing it.
- [assignment](skills/assignment/SKILL.md) defines learner-owned practice tasks; the other skills add focused workflows such as review, TDD, security, and Go development.

The central loop is **diagnose → teach → practice → assess → reflect → progress**. Assistance is calibrated to demonstrated work, and the system aims to fade scaffolding as the learner becomes more independent.

## Learner State

Runtime learner state is written inside each active project under `.opencode/mentor/`. It can contain learner identifiers, project paths, goals, evidence, misconceptions, exercises, and reflections. 

## Prerequisites and Setup

Prerequisites:

- A working OpenCode installation.
- [Bun](https://bun.sh/) for the TypeScript tools and plugins.
- Optional: [Context7 MCP](https://github.com/upstash/context7) network access for current library documentation, [beads](https://github.com/steveyegge/beads) for issue tracking, [graphify](https://github.com/Graphify-Labs/graphify) or [codegraph](https://github.com/colbymchenry/codegraph) for codebase discovery.

Back up any existing OpenCode configuration before installing. Then clone this repository as the global configuration and install its development dependency:

```bash
mv ~/.config/opencode ~/.config/opencode.backup
git clone https://github.com/davejpeters/opencode-mentor ~/.config/opencode
cd ~/.config/opencode
bun install
```

Review `opencode.json`, agent permissions, and plugin behavior before first use. Restart OpenCode after changing configuration, agents, skills, or plugins because those files are loaded at startup.

## Customization

Common starting points:

1. Change the Rob name and identity in `AGENTS.md`.
2. Adjust language and workflow rules under `rules/`.
3. Tune agent prompts and permissions in `agents/` and `opencode.json`.
4. Add, remove, or revise workflows under `skills/`.
5. Review defaults in `tools/tutor/runtime.ts`, including the preferred language and learner identifier strategy.
6. Disable integrations that are unavailable on your machine.
7. Add more skills, tools, agents, commands, and plugins.

## Safety Boundaries

The configuration combines prompt-level boundaries with OpenCode permissions and small defensive plugins:

- Shell commands generally require approval; a narrow set of read-only or verification commands is allowed explicitly.
- `plugins/env-protection.ts` blocks tool reads whose path contains `.env`.
- `plugins/safety-filter.ts` blocks shell commands containing `rm`.
- Agent permissions restrict editing, writing, shell use, and delegation by role.
- The mentor policy avoids complete target implementations while guided learning can still move the learner forward.
- OpenCode sharing is disabled in `opencode.json`.

These are guardrails, not a security sandbox. Inspect proposed commands and changes, keep secrets out of the repository, and tighten permissions for your environment.

## Optional Machine-Specific Integrations

- `plugins/notifications.ts` calls `notify-send` for idle-session and permission-request desktop notifications. It is intended for Linux desktops with a notification daemon; remove the plugin from `opencode.json` elsewhere.

The notification plugin tolerates command failures.
