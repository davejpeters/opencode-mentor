import type { Plugin } from "@opencode-ai/plugin"
import { CORE_CONTEXT_PREFIX } from "./context-constants"
import { loadContext } from "./handlers/context-loader"

export function appendContextOnce(system: string[], context: string): void {
  if (system.some((part) => part.startsWith(CORE_CONTEXT_PREFIX))) return
  system.push(context)
}

export const ContextLoaderPlugin: Plugin = async () => {
  return {
    "experimental.chat.system.transform": async (_input, output) => {
      if (output.system.some((part) => part.startsWith(CORE_CONTEXT_PREFIX))) return

      const result = await loadContext()
      if (result.success && result.context) {
        appendContextOnce(output.system, result.context)
      }
    },
  }
}
