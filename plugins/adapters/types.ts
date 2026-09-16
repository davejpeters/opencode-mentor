/**
 * MAI-OpenCode Shared Types
 *
 * Common TypeScript interfaces for plugin handlers and adapters.
 *
 * @module types
 */

/**
 * Context loading result
 *
 * Returned by core.ts
 */
export interface ContextResult {
  /** The context string to inject */
  context: string;
  /** Whether loading was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Dangerous command patterns for security validation
 *
 * These patterns will trigger a BLOCK action
 */
export const DANGEROUS_PATTERNS = [
  // Destructive file operations
  /rm\s+-rf\s+\//,  // rm -rf / (any root-level deletion blocked)
  /rm\s+-rf\s+~\//,        // rm -rf ~/ (home)
  /rm\s+-rf\s+\*/,         // rm -rf * (wildcard)
  /rm\s+-rf\s+\.\./,       // rm -rf .. (parent traversal - any path starting with ..)
  /mkfs\./,
  /dd\s+if=.*of=\/dev\//,

  // System compromise
  /chmod\s+777\s+\//,
  /chown\s+-R\s+.*\s+\//,

  // Reverse shells
  /bash\s+-i\s+>&/,
  /nc\s+-e\s+\/bin\/(ba)?sh/,
  /python.*socket.*connect/,

  // Remote code execution
  /curl.*\|\s*(ba)?sh/,
  /wget.*\|\s*(ba)?sh/,

  // Credential theft
  /cat.*\.ssh\/id_/,
  /cat.*\.aws\/credentials/,
  /cat.*\.env/,
] as const;

/**
 * Warning command patterns for security validation
 *
 * These patterns will trigger a CONFIRM action
 */
export const WARNING_PATTERNS = [
  // Git operations that could be destructive
  /git\s+push\s+--force/,
  /git\s+reset\s+--hard/,

  // Package installs
  /npm\s+install\s+-g/,
  /pip\s+install/,

  // Docker operations
  /docker\s+rm/,
  /docker\s+rmi/,
] as const;
