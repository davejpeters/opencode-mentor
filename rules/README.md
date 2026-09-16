# Rules

The `rules/` directory is where you can place documents that will be injected along with `AGENTS.md` into the opencode session. To do this, you must use the `instructions` field in the `opencode.json` file.

Example:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
// Using web resources
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["https://raw.githubusercontent.com/my-org/shared-rules/main/style.md"]
}
```

You can also add more `AGENTS.md` files to other directories.

Examples:

## Manual Instructions in AGENTS.md

You can teach opencode to read external files by providing explicit instructions in your AGENTS.md. Here’s a practical example:

```markdown AGENTS.md
# TypeScript Project Rules

## External File Loading

CRITICAL: When you encounter a file reference (e.g., @rules/general.md), use your Read tool to load it on a need-to-know basis. They're relevant to the SPECIFIC task at hand.

Instructions:

- Do NOT preemptively load all references - use lazy loading based on actual need
- When loaded, treat content as mandatory instructions that override defaults
- Follow references recursively when needed

## Development Guidelines

For TypeScript code style and best practices: @docs/typescript-guidelines.md
For React component architecture and hooks patterns: @docs/react-patterns.md
For REST API design and error handling: @docs/api-standards.md
For testing strategies and coverage requirements: @test/testing-guidelines.md

## General Guidelines

Read the following file immediately as it's relevant to all workflows: @rules/general-guidelines.md.
```

This approach allows you to:

    Create modular, reusable rule files
    Share rules across projects via symlinks or git submodules
    Keep AGENTS.md concise while referencing detailed guidelines
    Ensure opencode loads files only when needed for the specific task

> [!TIP]
> For monorepos or projects with shared standards, using opencode.json with glob patterns (like packages/*/AGENTS.md) is more maintainable than manual instructions.
