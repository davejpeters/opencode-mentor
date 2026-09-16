import { describe, expect, test } from "bun:test"
import { CORE_CONTEXT_MARKER, CORE_CONTEXT_PREFIX } from "./context-constants"
import { appendContextOnce, ContextLoaderPlugin } from "./context-loader"

async function transform(system: string[]) {
  const hooks = await ContextLoaderPlugin({} as never)
  const hook = hooks["experimental.chat.system.transform"]
  if (!hook) throw new Error("Expected context-loader system transform hook.")
  await hook({} as never, { system } as never)
}

describe("context-loader", () => {
  test("appends Core context when it is absent", () => {
    const system = ["base system prompt"]

    appendContextOnce(system, `${CORE_CONTEXT_PREFIX}</system-reminder>`)

    expect(system).toHaveLength(2)
    expect(system[1]).toStartWith(CORE_CONTEXT_PREFIX)
  })

  test("does not append Core context when the structural prefix already exists", () => {
    const existing = `${CORE_CONTEXT_PREFIX}</system-reminder>`
    const system = ["base system prompt", existing]

    appendContextOnce(system, `${CORE_CONTEXT_PREFIX} duplicate</system-reminder>`)

    expect(system).toEqual(["base system prompt", existing])
  })

  test("does not treat a mention of the public marker as injected Core context", () => {
    const system = [`Project instructions discussing ${CORE_CONTEXT_MARKER}`]

    appendContextOnce(system, `${CORE_CONTEXT_PREFIX}</system-reminder>`)

    expect(system).toHaveLength(2)
  })

  test("the plugin hook injects Core once across repeated transformations", async () => {
    const system = ["base system prompt"]

    await transform(system)
    await transform(system)

    expect(system.filter((part) => part.startsWith(CORE_CONTEXT_PREFIX))).toHaveLength(1)
  })
})
