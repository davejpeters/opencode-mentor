/**
 * Tool: current-datetime
 * Description: Get the current date and time in ISO format and human-readable format
 * Created: 2026-01-01
 */
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Get the current date and time in ISO format and human-readable format",
  args: {
    format: tool.schema
      .string()
      .optional()
      .describe('Optional format type: iso, human, timestamp, or compact'),
  },
  /**
   * Execute function - returns current date and time in various formats
   */
  async execute(args) {
    const now = new Date()
    const format = args.format || 'full'

    if (format === 'iso') {
      return now.toISOString()
    }

    if (format === 'timestamp') {
      return now.getTime().toString()
    }

    if (format === 'compact') {
      return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    }

    // Default: full format with all representations
    return JSON.stringify({
      iso: now.toISOString(),
      human: now.toString(),
      timestamp: now.getTime().toString(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }, null, 2)
  },
})
