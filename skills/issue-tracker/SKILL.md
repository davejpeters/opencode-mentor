---
name: issue-tracker
description: Graph-aware triage and planning engine for Beads projects. Uses PageRank, critical path analysis, and dependency tracking to provide deterministic task prioritization.
license: MIT
compatibility: opencode
metadata:
  tool: bv
  engine: graph-analysis
  input_format: beads-jsonl
---

## What I do

- **Automated Triage:** Provide a comprehensive project overview including top picks, quick wins, and blockers using `bv --robot-triage`.
- **Dependency Planning:** Generate parallel execution tracks and identify items that unblock the most downstream work with `bv --robot-plan`.
- **Graph Insights:** Compute advanced metrics like PageRank, betweenness centrality, HITS, and k-core to identify high-impact tasks.
- **Health Monitoring:** Detect circular dependencies (cycles), priority misalignments, and stale issues.
- **Forecasting:** Predict ETAs and burndown rates based on dependency-aware scheduling.
- **Visual Export:** Generate Mermaid, DOT, or interactive HTML dependency graphs.

## When to use me

- Use this when working in a project containing a `.beads/beads.jsonl` file to determine "what to work on next."
- **Always** start a session or a new task phase by running `bv --robot-triage`.
- Use me to identify blockers before they stall a sprint.
- Use me to validate project hygiene (e.g., checking for cycles or missing dependencies).
- **CRITICAL:** You must only use flags prefixed with `--robot-`. Never run a bare `bv` command, as it launches an interactive TUI that will hang your execution environment.
- ~For agent-to-agent coordination (claiming work), use the `mcp-agent-mail` skill instead; this skill is strictly for triage and planning.~

## Implementation Notes

- **Two-Phase Analysis:** Be aware that Phase 1 metrics (degree, topo sort) are instant, while Phase 2 (PageRank, cycles) may take up to 500ms. Check the `status` field in the JSON output to ensure metrics are `computed`.
- **Filtering:** Use `--recipe actionable` to filter for items with no current blockers.
- **Output Parsing:** Pipe results to `jq` for specific data extraction (e.g., `bv --robot-triage | jq '.recommendations[0]'`).

### Using bv as an AI sidecar

`bv` is a graph-aware triage engine for Beads projects (.beads/beads.jsonl). Instead of parsing JSONL or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**Scope boundary:** `bv` handles *what to work on* (triage, priority, planning). For agent-to-agent coordination (messaging, work claiming, file reservations), use ~[MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail)~ (*currently unavailable*).

**⚠️ CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` launches an interactive TUI that blocks your session.**

#### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:

- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

`bv --robot-triage`        # THE MEGA-COMMAND: start here
`bv --robot-next`          # Minimal: just the single top pick + claim command

#### Other Commands

**Planning:**

| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with `unblocks` lists |
| `--robot-priority` | Priority misalignment detection with confidence |

**Graph Analysis:**

| Command | Returns |
|---------|---------|
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS (hubs/authorities), eigenvector, critical path, cycles, k-core, articulation points, slack |
| `--robot-label-health` | Per-label health: `health_level` (healthy\|warning\|critical), `velocity_score`, `staleness`, `blocked_count` |
| `--robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| `--robot-label-attention [--attention-limit=N]` | Attention-ranked labels by: (pagerank × staleness × block_impact) / velocity |

**History & Change Tracking:**

| Command | Returns |
|---------|---------|
| `--robot-history` | Bead-to-commit correlations: `stats`, `histories` (per-bead events/commits/milestones), `commit_index` |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles introduced/resolved |

**Other Commands:**

| Command | Returns |
|---------|---------|
| `--robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| `--robot-forecast <id\|all>` | ETA predictions with dependency-aware scheduling |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |
| `--export-graph <file.html>` | Self-contained interactive HTML visualization |

#### Scoping & Filtering

`bv --robot-plan --label backend`              # Scope to label's subgraph
`bv --robot-insights --as-of HEAD~30`          # Historical point-in-time
`bv --recipe actionable --robot-plan`          # Pre-filter: ready to work (no blockers)
`bv --recipe high-impact --robot-triage`       # Pre-filter: top PageRank scores
`bv --robot-triage --robot-triage-by-track`    # Group by parallel work streams
`bv --robot-triage --robot-triage-by-label`    # Group by domain

#### Understanding Robot Output

**All robot JSON includes:**

- `data_hash` — Fingerprint of source beads.jsonl (verify consistency across calls)
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`; contains ref and resolved SHA

**Two-phase analysis:**

- **Phase 1 (instant):** degree, topo sort, density — always available immediately
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles — check `status` flags

**For large graphs (>500 nodes):** Some metrics may be approximated or skipped. Always check `status`.

#### jq Quick Reference

`bv --robot-triage | jq '.quick_ref'`                        # At-a-glance summary
`bv --robot-triage | jq '.recommendations[0]'`               # Top recommendation
`bv --robot-plan | jq '.plan.summary.highest_impact'`        # Best unblock target
`bv --robot-insights | jq '.status'`                         # Check metric readiness
`bv --robot-insights | jq '.Cycles'`                         # Circular deps (must fix!)
`bv --robot-label-health | jq '.results.labels[] | select(.health_level == "critical")'`

**Performance:** Phase 1 instant, Phase 2 async (500ms timeout). Prefer `--robot-plan` over `--robot-insights` when speed matters. Results cached by data hash.

Use `bv` instead of parsing beads.jsonl—it computes PageRank, critical paths, cycles, and parallel tracks deterministically.
