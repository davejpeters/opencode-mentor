---
name: project-guidelines
description: Use when creating new projects. Guidelines and best practices for a specific project. Use as a template for projects.
---

# Project Guidelines Skill (Go + Templ + HTMX Stack)

Template for real-world production projects.

---

## Architecture Overview

**Tech Stack:**

- **Frontend**: Go Templ, HTMX, Tailwind
- **Backend**: Go (net/http & echo)
- **Database**: PostgreSQL (prod) / SQLite (local/dev)
- **AI**: OpenAI API (structured outputs)
- **Deployment**: Hetzner (Docker / VPS)
- **Testing**:

  - `go test` (backend)
  - Playwright (E2E) <!-- ONLY IF NEEDED. BUT USUALLY NOT NEEDED -->

---

## System Architecture

```
┌──────────────────────────────────────────────┐
│                  Frontend                    │
│         Go Templ + HTMX + Tailwind           │
│  Deployed: Hetzner (Node adapter / static)   │
└──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                  Backend                     │
│               Go (HTTP API)                  │
│  Deployed: Hetzner VPS (Docker)              │
└──────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │Postgres  │   │ OpenAI   │   │  Redis   │
  │ /SQLite  │   │   API    │   │  Cache   │
  └──────────┘   └──────────┘   └──────────┘
```

---

## File Structure

```
project/
├── cmd/
│   └── server/             # Application entrypoint (main.go)
├── internal/               # Private application code
│   ├── api/                # HTTP handlers
│   ├── service/            # Business logic
│   ├── repository/         # DB access
│   ├── model/              # Domain structs (used by both backend and templates)
│   ├── auth/               # Auth logic
│   └── platform/           # Reusable internal packages (or pkg)
├── web/                    # Frontend assets
│   ├── templates/          # .templ files (pages/layouts)
│   ├── components/         # Reusable .templ components
│   ├── static/             # CSS, JS, Images, Favicons
│   └── utils/              # Frontend-specific logic (e.g., date formatters)
├── tests/                  # Integration tests
├── deploy/                 # Docker + infra configs
├── scripts/
└── docs/
```

### Recommended "Tooling" setup

To make this directory structure work efficiently:

1. **Air**: Configure it to watch `.templ` and `.go` files to restart the server automatically.
2. **Taskfile / Makefile**: Create a command like `task/make dev` that runs:
   - `templ generate --watch` (in one terminal)
   - `air` (in another)
3. **HTMX**: Add it via `<script>` tag in your `base_layout.templ`. This will provide the "Single Page Application" feel without complex state management.

---

## Code Patterns

---

### API Response Format (Go)

```go
type APIResponse[T any] struct {
 Success bool   `json:"success"`
 Data    *T     `json:"data,omitempty"`
 Error   string `json:"error,omitempty"`
}
```

---

### Frontend API Calls

```go
import (
 "bytes"
 "encoding/json"
 "fmt"
 "net/http"
)

// Response structure
type APIResponse[T any] struct {
 Success bool   `json:"success"`
 Data    *T     `json:"data,omitempty"`
 Error   string `json:"error,omitempty"`
}

func FetchApi[T any](endpoint string, method string, body interface{}) (*APIResponse[T], error) {
 url := fmt.Sprintf("/api%s", endpoint)

 var buf bytes.Buffer
 if body != nil {
  if err := json.NewEncoder(&buf).Encode(body); err != nil {
   return nil, err
  }
 }

 req, err := http.NewRequest(method, url, &buf)
 if err != nil {
  return nil, err
 }
 req.Header.Set("Content-Type", "application/json")

 client := &http.Client{}
 resp, err := client.Do(req)
 if err != nil {
  return &APIResponse[T]{Success: false, Error: err.Error()}, nil
 }
 defer resp.Body.Close()

 if resp.StatusCode < 200 || resp.StatusCode >= 300 {
  return &APIResponse[T]{Success: false, Error: fmt.Sprintf("HTTP %d", resp.StatusCode)}, nil
 }

 var data T
 if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
  return &APIResponse[T]{Success: false, Error: "failed to decode response"}, nil
 }

 return &APIResponse[T]{Success: true, Data: &data}, nil
}
```

Since Templ is for HTML, you would call this function inside your Go handler _before_ passing data to the template.

```go
func UserHandler(w http.ResponseWriter, r *http.Request) {
    // Call our API client
    result, _ := FetchApi[User]("/users/1", "GET", nil)

    // Pass the result to the Templ component
    component := MyTemplate(result.Data)
    component.Render(r.Context(), w)
}
```

---

### OpenAI Integration (Go)

```go
type AnalysisResult struct {
 Summary    string   `json:"summary"`
 KeyPoints  []string `json:"key_points"`
 Confidence float64  `json:"confidence"`
}

func AnalyzeWithOpenAI(content string) (*AnalysisResult, error) {
 reqBody := map[string]any{
  "model": "gpt-4.1",
  "messages": []map[string]string{
   {"role": "user", "content": content},
  },
 }

 body, _ := json.Marshal(reqBody)

 req, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(body))
 req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))
 req.Header.Set("Content-Type", "application/json")

 resp, err := http.DefaultClient.Do(req)
 if err != nil {
  return nil, err
 }
 defer resp.Body.Close()

 var result map[string]any
 json.NewDecoder(resp.Body).Decode(&result)

 // Extract response (simplified)
 return &AnalysisResult{
  Summary: "parsed result",
 }, nil
}
```

---

### State Pattern

**Recommendation:** If you are building a full-stack Go app, stop trying to maintain "Frontend Stores." Use **Database/Service-layer state** and let **HTMX** swap the HTML fragments when the state changes. This is much more robust for server-side rendered Go apps.

```go
import "net/http"

func UserHandler(w http.ResponseWriter, r *http.Request) {
 // 1. Loading State (can be rendered immediately)
 renderTemplate(w, LoadingComponent())

 // 2. Fetch Data
 data, err := service.FetchUser()
 if err != nil {
  // 3. Error State
  renderTemplate(w, ErrorComponent(err))
  return
 }

 // 4. Success State
 renderTemplate(w, UserComponent(data))
}
```

---

## Testing Requirements

---

### Backend (`go test`)

```bash
go test ./...
go test -cover ./...
```

---

### Backend Test Example

```go
func TestGetMarkets(t *testing.T) {
 req := httptest.NewRequest("GET", "/markets", nil)
 w := httptest.NewRecorder()

 GetMarketsHandler(w, req)

 if w.Code != http.StatusOK {
  t.Fatalf("expected 200, got %d", w.Code)
 }
}
```

---

### Frontend Testing

```bash
go test ./...
go test -cover ./...
```

```go
package web_test

import (
 "bytes"
 "context"
 "testing"

 "myproject/web/components" // Import your templ component

 "github.com/PuerkitoBio/goquery"
)

func TestWorkspaceComponent(t *testing.T) {
 // 1. Render the component to a buffer
 buffer := new(bytes.Buffer)
 component := components.Workspace() // Your Templ component
 err := component.Render(context.Background(), buffer)
 if err != nil {
  t.Fatalf("failed to render component: %v", err)
 }

 // 2. Load the HTML into goquery for easy selection
 doc, err := goquery.NewDocumentFromReader(buffer)
 if err != nil {
  t.Fatalf("failed to parse HTML: %v", err)
 }

 // 3. Perform assertions (equivalent to screen.getByRole('main'))
 mainElement := doc.Find("main")

 if mainElement.Length() == 0 {
  t.Error("expected <main> element to be in the document, but it was not found")
 }
}
```

---

### Browser Testing (`vitest-browser-svelte`)

Used for DOM + browser APIs.

---

### E2E (Playwright)

```go
package e2e

import (
 "testing"

 "github.com/playwright-community/playwright-go"
 "github.com/stretchr/testify/require"
)

func TestUserCanCreateItem(t *testing.T) {
 // 1. Setup Playwright (standard boilerplate)
 pw, err := playwright.Run()
 require.NoError(t, err)

 browser, err := pw.Chromium.Launch()
 require.NoError(t, err)
 defer browser.Close()

 page, err := browser.NewPage()
 require.NoError(t, err)

 // 2. Perform actions
 _, err = page.Goto("http://localhost:8080")
 require.NoError(t, err)

 err = page.Click("text=New Item")
 require.NoError(t, err)

 // 3. Assertion
 locator := page.Locator("text=Created")
 visible, err := locator.IsVisible()
 require.NoError(t, err)
 require.True(t, visible, "Expected 'Created' message to be visible")
}
```

While Playwright-Go is powerful, it is often overkill if your goal is just to test UI flow. Many Go developers prefer:

- **For Integration**: `net/http/httptest` (testing the server directly).
- **For UI**: If you are using **HTMX** with your Templ components, you can often perform assertions by just checking the returned HTML fragments, which is much faster than spinning up a real Chromium browser for every test case.

---

## Deployment Workflow (Hetzner)

---

### Strategy

- Single VPS OR small cluster
- Docker Compose for orchestration
- Reverse proxy (Caddy or Nginx)

---

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] `npm run build` (frontend)
- [ ] `go build` (backend)
- [ ] No secrets in repo
- [ ] ENV documented
- [ ] DB migrations ready

---

### Deployment Example

```bash
# build images
docker build -t app-frontend ./frontend
docker build -t app-backend ./backend

# run
docker compose up -d
```

---

### Environment Variables

```bash
# frontend
PUBLIC_API_URL=https://api.example.com

# backend
DATABASE_URL=postgres://...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://...
```

---

## Critical Rules

1. No magic abstractions
2. TDD always
3. 80%+ coverage
4. Small focused files
5. No debug logs in prod
6. Explicit error handling (Go-style)
7. Validate all input
8. **No console.log** in production code
9. Prefer simplicity over frameworks

---

## Related Skills

- `coding-standards.md` - General coding best practices
- `backend-patterns.md` - API and database patterns
- `frontend-patterns.md` - React and Next.js patterns
- `tdd-workflow/` - Test-driven development methodology

---

## Final Principle

This stack is powerful because:

- Go = control + performance
- Go Templ + HTMX = minimal frontend overhead
- Postgres = reliable foundation
- OpenAI = intelligence layer

If the system becomes hard to reason about… you've added too much.
