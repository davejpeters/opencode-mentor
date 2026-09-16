import { tool as conceptTool } from "@opencode-ai/plugin"
import { asToolResult } from "./runtime"
import type { ConceptNode } from "./types"
import { loadConceptGraph } from "./runtime"

function matchesText(concept: ConceptNode, text: string): boolean {
  const haystack = [concept.id, concept.title, concept.description, ...concept.tags].join(" ").toLowerCase()
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((term) => haystack.includes(term))
}

function prerequisiteClosure(conceptID: string, concepts: ConceptNode[], seen = new Set<string>()): Set<string> {
  const concept = concepts.find((item) => item.id === conceptID)
  if (!concept) return seen

  for (const prereq of concept.prerequisites) {
    if (seen.has(prereq)) continue
    seen.add(prereq)
    prerequisiteClosure(prereq, concepts, seen)
  }

  return seen
}

export const query = conceptTool({
  description: "Query concept prerequisites or related concepts from the local mentor concept graph",
  args: {
    conceptIDs: conceptTool.schema.array(conceptTool.schema.string()).optional(),
    text: conceptTool.schema.string().optional(),
    prerequisitesFor: conceptTool.schema.string().optional(),
  },
  async execute(args, context) {
    const graph = loadConceptGraph(context)
    const selected = new Set<string>()

    for (const id of args.conceptIDs ?? []) selected.add(id)

    if (args.text) {
      for (const concept of graph.concepts.filter((item) => matchesText(item, args.text!))) {
        selected.add(concept.id)
      }
    }

    if (args.prerequisitesFor) {
      selected.add(args.prerequisitesFor)
      for (const prereq of prerequisiteClosure(args.prerequisitesFor, graph.concepts)) selected.add(prereq)
    }

    const concepts = selected.size === 0 ? graph.concepts : graph.concepts.filter((concept) => selected.has(concept.id))
    const conceptIDs = new Set(concepts.map((concept) => concept.id))
    const edges = graph.edges.filter((edge) => conceptIDs.has(edge.from) && conceptIDs.has(edge.to))

    return asToolResult({
      concepts,
      conceptIDs: [...conceptIDs],
      edges,
      query: args,
      count: concepts.length,
    })
  },
})
