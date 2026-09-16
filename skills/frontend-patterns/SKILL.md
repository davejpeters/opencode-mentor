---
name: frontend-patterns
description: Use when building modern frontend patterns focused on simplicity, server-driven UI, and performance. Use when building new frontend applications or refactoring existing ones to be more efficient and maintainable.
---

# Frontend Development Patterns

Modern frontend patterns focused on simplicity, server-driven UI, and performance.

---

## Core Philosophy

Before patterns, understand this shift:

* **React → Svelte**: less boilerplate, direct reactivity
* **Next.js → SvelteKit**: simpler routing + server logic
* **Client-heavy → HTMX/Templ**: move logic back to server
* **Hooks → Stores / plain functions**

If you’re writing lots of client JS…

you’re probably doing it wrong.

---

## Component Patterns (Svelte)

---

### Composition Over Inheritance

```svelte
<!-- Card.svelte -->
<script lang="ts">
 export let variant: 'default' | 'outlined' = 'default'
</script>

<div class="card card-{variant}">
 <slot />
</div>
```

```svelte
<!-- Usage -->
<Card>
 <h2>Title</h2>
 <p>Content</p>
</Card>
```

---

### Slot-Based Composition (Compound Alternative)

```svelte
<!-- Tabs.svelte -->
<script lang="ts">
 import { writable } from 'svelte/store'

 export const activeTab = writable('overview')
</script>

<div class="tabs">
 <slot />
</div>
```

```svelte
<!-- Tab.svelte -->
<script lang="ts">
 import { activeTab } from './Tabs.svelte'
 export let id: string
</script>

<button
 class:active={$activeTab === id}
 on:click={() => activeTab.set(id)}
>
 <slot />
</button>
```

---

## Server-Driven UI (HTMX + Templ)

---

### HTMX Pattern

```html
<button
 hx-get="/markets"
 hx-target="#market-list"
 hx-swap="innerHTML"
>
 Load Markets
</button>

<div id="market-list"></div>
```

---

### Templ Component (Go)

```go
templ MarketList(markets []Market) {
 <ul>
  for _, m := range markets {
   <li>{ m.Name }</li>
  }
 </ul>
}
```

---

### Handler Returning HTML

```go
func GetMarkets(w http.ResponseWriter, r *http.Request) {
 markets := fetchMarkets()

 templ.Handler(MarketList(markets)).ServeHTTP(w, r)
}
```

---

## State Management (Svelte)

---

### Simple Store Pattern

```typescript
import { writable } from 'svelte/store'

export const markets = writable([])
export const loading = writable(false)
```

---

### Derived State

```typescript
import { derived } from 'svelte/store'

export const activeMarkets = derived(markets, ($markets) =>
 $markets.filter(m => m.status === 'active')
)
```

---

### No Store Needed (Preferred)

```svelte
<script>
 let count = 0
</script>

<button on:click={() => count++}>
 {count}
</button>
```

Rule:

* Prefer local state
* Use stores only when shared

---

## Data Fetching Patterns

---

### SvelteKit Load Function

```typescript
export async function load({ fetch }) {
 const res = await fetch('/api/markets')
 const data = await res.json()

 return { markets: data }
}
```

---

### Progressive Enhancement (HTMX + Server)

Prefer:

```html
<form hx-post="/markets" hx-target="#result">
 <input name="name" />
 <button>Create</button>
</form>

<div id="result"></div>
```

Over client-heavy fetch logic.

---

## Performance Optimization

---

### Svelte Reactivity (No Memo Needed)

```svelte
<script>
 export let markets = []

 $: sorted = [...markets].sort((a, b) => b.volume - a.volume)
</script>
```

No `useMemo`. Compiler handles it.

---

### Code Splitting (SvelteKit)

```svelte
<script>
 import { onMount } from 'svelte'

 let Chart

 onMount(async () => {
  const module = await import('./Chart.svelte')
  Chart = module.default
 })
</script>

{#if Chart}
 <Chart />
{/if}
```

---

### List Virtualization (Manual)

```svelte
{#each visibleItems as item}
 <div>{item.name}</div>
{/each}
```

Keep lists small. Avoid over-engineering.

---

## Form Handling

---

### Native Forms + SvelteKit Actions

```svelte
<form method="POST">
 <input name="name" />
 <button>Create</button>
</form>
```

```ts
export const actions = {
 default: async ({ request }) => {
  const data = await request.formData()
  const name = data.get('name')

  // process
  return { success: true }
 }
}
```

---

### Validation (Client + Server)

```svelte
<script>
 let error = ''
</script>

{#if error}
 <p class="error">{error}</p>
{/if}
```

---

## Error Handling

---

### SvelteKit Error Page

```ts
import { error } from '@sveltejs/kit'

throw error(404, 'Not found')
```

---

### Error Boundary Equivalent

```svelte
{#if error}
 <p>{error.message}</p>
{:else}
 <Content />
{/if}
```

---

## HTMX Patterns (Important)

---

### Partial Updates

```html
<div hx-get="/markets" hx-trigger="load"></div>
```

---

### Form Submission Without JS

```html
<form hx-post="/submit" hx-target="#result">
 <input name="data" />
</form>
```

---

### Infinite Scroll

```html
<div
 hx-get="/markets?page=2"
 hx-trigger="revealed"
 hx-swap="afterend"
></div>
```

---

## Accessibility Patterns

---

### Keyboard Navigation

```svelte
<button
 on:keydown={(e) => {
  if (e.key === 'Enter') handleClick()
 }}
>
 Click
</button>
```

---

### Focus Management

```svelte
<script>
 import { onMount } from 'svelte'

 let el

 onMount(() => {
  el.focus()
 })
</script>

<div bind:this={el} tabindex="-1">
 Modal
</div>
```

---

## When to Use What

---

### Use SvelteKit When

* You need routing
* You need SSR
* You need client interactivity

---

### Use HTMX When

* UI can be server-rendered
* You want minimal JS
* You want simpler architecture

---

### Use Templ When

* Rendering HTML in Go
* Tight backend control
* No JS needed

---

## Final Principle

The best frontend is:

* minimal JS
* server-driven
* easy to reason about

If your frontend feels complex… you've drifted back into React thinking.
