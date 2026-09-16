import type { Plugin } from "@opencode-ai/plugin"

export const SafetyFilterPlugin: Plugin = async (ctx) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash" && output.args.command.includes("rm -fr")) {
        throw new Error("Deletion commands are restricted in this environment.");
      }
    },
  }
}
