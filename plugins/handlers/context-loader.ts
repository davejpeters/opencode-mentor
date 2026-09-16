/**
 * MAI-OpenCode Context Loader
 *
 * Loads CORE skill context for injection into chat system.
 * Equivalent to MAI's load-core-context.ts hook.
 *
 * Compatible with MAI v2.4 (The Algorithm embedded in CORE).
 *
 * @module context-loader
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import type { ContextResult } from "../adapters/types";
import { CORE_CONTEXT_PREFIX } from "../context-constants";
import { homedir } from "os";

/**
 * Get the OpenCode directory path
 *
 * In OpenCode, config lives in .config/opencode/ (not .config/opencode/)
 */
function getOpenCodeDir(): string {
  // Try current working directory first
  const cwd = process.cwd();

  if (existsSync(join(cwd, "skills", "core", "SKILL.md"))) {
    return cwd;
  }

  const homeDir = homedir()
  const configDir = join(homeDir, ".config");
  const opencodeDir = join(configDir, "opencode")

  if (existsSync(join(opencodeDir, "skills", "core", "SKILL.md"))) {
    return opencodeDir
  }

  return cwd
}

/**
 * Read a file safely, returning empty string on error
 */
function readFileSafe(filePath: string): string {
  try {
    if (!existsSync(filePath)) {
      return "";
    }
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    fileLogError(`Failed to read ${filePath}`, error);
    return "";
  }
}

/**
 * Load CORE skill context
 *
 * Reads:
 * - SKILL.md (skill definition)
 *
 * @returns ContextResult with the combined context string
 */
export async function loadContext(): Promise<ContextResult> {
  try {
    const opencodeDir = getOpenCodeDir();
    const coreSkillDir = join(opencodeDir, "skills", "core");

    fileLog(`Loading context from: ${coreSkillDir}`);

    // Check if CORE skill exists
    if (!existsSync(coreSkillDir)) {
      fileLog("CORE skill directory not found", "warn");
      return {
        context: "",
        success: false,
        error: "CORE skill not found",
      };
    }

    const contextParts: string[] = [];

    // 1. Load SKILL.md
    const skillPath = join(coreSkillDir, "SKILL.md");
    const skillContent = readFileSafe(skillPath);
    if (skillContent) {
      contextParts.push(`--- CORE SKILL ---\n${skillContent}`);
      fileLog("Loaded SKILL.md");
    }

    // 2. Load SYSTEM docs (if exists) - v2.4 compatible

    // 3. Load USER/TELOS context (if exists) - v2.4 compatible

    // 4. Load USER identity files - v2.4 compatible

    const context = `${CORE_CONTEXT_PREFIX}

${contextParts.join("\n\n")}

---
This context is active for this session.
</system-reminder>`;

    fileLog(
      `Context loaded successfully (${contextParts.length} parts, ${context.length} chars)`
    );

    return {
      context,
      success: true,
    };
  } catch (error) {
    fileLogError("Failed to load context", error);
    return {
      context: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
