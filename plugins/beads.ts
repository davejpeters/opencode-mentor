/**
 * Runs bd prime on every new session creation.
 * Commented out to reduce context bloat and align mentor intent.
 * Use bd prime manually when needed.
 */

// import type { Plugin } from "@opencode-ai/plugin"
//
// export const BeadsPrimePlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
//   return {
//     event: async ({ event }) => {
//       // Prime with 'bd prime'
//       if (event.type === "session.created") {
//         await Bun.$`bd prime`
//       }
//     },
//   }
// }
