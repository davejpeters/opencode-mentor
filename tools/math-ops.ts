/**
 * File: math-ops
 * Tool count: 4
 */
import { tool } from "@opencode-ai/plugin"
import { asToolResult } from "./tutor/runtime"

export const add = tool({
  description: "Add two numbers",
  args: { a: tool.schema.number(), b: tool.schema.number() },
  /**
   * Returns: Result of the logic expression
   */
  async execute(args) {
    return asToolResult({ result: args.a + args.b })
  },
})

export const subtract = tool({
  description: "Subtract two numbers",
  args: { a: tool.schema.number(), b: tool.schema.number() },
  /**
   * Returns: Result of the logic expression
   */
  async execute(args) {
    return asToolResult({ result: args.a - args.b })
  },
})

export const multiply = tool({
  description: "Multiply two numbers",
  args: { a: tool.schema.number(), b: tool.schema.number() },
  /**
   * Returns: Result of the logic expression
   */
  async execute(args) {
    return asToolResult({ result: args.a * args.b })
  },
})

export const divide = tool({
  description: "Divide two numbers",
  args: { a: tool.schema.number(), b: tool.schema.number() },
  /**
   * Returns: Result of the logic expression
   */
  async execute(args) {
    return asToolResult({ result: args.a / args.b })
  },
})
