---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
---

# Test-Driven Development Workflow (Go)

This enforces TDD using Go’s standard tooling and ecosystem.

---

## When to Activate

* Writing new features
* Fixing bugs
* Refactoring
* Adding API endpoints
* Building services or packages

---

## Core Principles

### 1. Tests BEFORE Code

Write tests first. Always.

### 2. Coverage Requirements

* Minimum 80% coverage (`go test -cover`)
* Edge cases covered
* Error paths tested
* Boundary conditions verified

---

## Test Types

### Unit Tests

* Pure functions
* Helpers
* Business logic

### Integration Tests

* HTTP handlers
* Database operations
* Service + repo interaction

### E2E Tests

* Full system behavior
* CLI / HTTP flows
* External dependencies

---

## TDD Workflow Steps

### Step 1: Write User Journeys

```
As a user, I want to search markets,
so I can find relevant results.
```

---

### Step 2: Generate Test Cases

```go
func TestSearchMarkets(t *testing.T) {
 t.Run("returns results for query", func(t *testing.T) {
  // test logic
 })

 t.Run("handles empty query", func(t *testing.T) {
  // edge case
 })

 t.Run("fallback when cache unavailable", func(t *testing.T) {
  // failure mode
 })

 t.Run("sorts by relevance", func(t *testing.T) {
  // behavior
 })
}
```

---

### Step 3: Run Tests (They SHOULD Fail)

```bash
go test ./...
```

If tests pass before implementation → your tests are weak.

---

### Step 4: Implement Minimal Code

```go
func SearchMarkets(query string) ([]Market, error) {
 return nil, nil // minimal stub
}
```

---

### Step 5: Run Tests Again

```bash
go test ./...
```

---

### Step 6: Refactor

* Improve naming
* Remove duplication
* Simplify logic

Tests must stay green.

---

### Step 7: Verify Coverage

```bash
go test -cover ./...
```

---

## Testing Patterns

---

### Unit Test Pattern (Table-Driven)

This is **core Go testing style**.

```go
func TestIsValidEmail(t *testing.T) {
 tests := []struct {
  name  string
  input string
  want  bool
 }{
  {"valid email", "test@example.com", true},
  {"invalid email", "bad-email", false},
  {"empty", "", false},
 }

 for _, tt := range tests {
  t.Run(tt.name, func(t *testing.T) {
   got := IsValidEmail(tt.input)
   if got != tt.want {
    t.Errorf("got %v, want %v", got, tt.want)
   }
  })
 }
}
```

---

### HTTP API Integration Test

```go
func TestGetMarkets(t *testing.T) {
 req := httptest.NewRequest(http.MethodGet, "/markets", nil)
 w := httptest.NewRecorder()

 handler := http.HandlerFunc(GetMarketsHandler)
 handler.ServeHTTP(w, req)

 resp := w.Result()

 if resp.StatusCode != http.StatusOK {
  t.Fatalf("expected 200, got %d", resp.StatusCode)
 }
}
```

---

### JSON Response Validation

```go
func TestGetMarketsResponse(t *testing.T) {
 req := httptest.NewRequest(http.MethodGet, "/markets", nil)
 w := httptest.NewRecorder()

 GetMarketsHandler(w, req)

 var body struct {
  Success bool     `json:"success"`
  Data    []Market `json:"data"`
 }

 json.NewDecoder(w.Body).Decode(&body)

 if !body.Success {
  t.Fatal("expected success=true")
 }
}
```

---

### E2E Pattern (HTTP Flow)

```go
func TestCreateMarketFlow(t *testing.T) {
 server := httptest.NewServer(setupRouter())
 defer server.Close()

 resp, err := http.Post(
  server.URL+"/markets",
  "application/json",
  strings.NewReader(`{"name":"Test Market"}`),
 )
 if err != nil {
  t.Fatal(err)
 }

 if resp.StatusCode != http.StatusCreated {
  t.Fatalf("expected 201, got %d", resp.StatusCode)
 }
}
```

---

## Test File Organization

```
internal/
├── market/
│   ├── service.go
│   ├── service_test.go
│   ├── repo.go
│   ├── repo_test.go
├── api/
│   ├── handler.go
│   ├── handler_test.go
```

Rules:

* tests live next to code
* `_test.go` suffix required

---

## Mocking External Services

Go prefers **interfaces over mocking frameworks**.

---

### Example: Mock Repository

```go
type MockRepo struct{}

func (m MockRepo) FindByID(id string) (*Market, error) {
 return &Market{ID: id, Name: "Test"}, nil
}
```

---

### Inject Into Service

```go
func TestService(t *testing.T) {
 repo := MockRepo{}
 service := NewMarketService(repo)

 result, err := service.Get("123")

 if err != nil {
  t.Fatal(err)
 }

 if result.ID != "123" {
  t.Errorf("unexpected result")
 }
}
```

---

## Coverage Verification

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

---

## Common Testing Mistakes

---

### ❌ WRONG: Testing internals

```go
// Don't inspect private fields
if obj.count != 5 { }
```

---

### ✅ CORRECT: Test behavior

```go
result := Increment(4)
if result != 5 {
 t.Fail()
}
```

---

### ❌ WRONG: Shared state

```go
var globalUser = createUser()
```

---

### ✅ CORRECT: Isolated tests

```go
func TestCreateUser(t *testing.T) {
 user := createUser()
}
```

---

### ❌ WRONG: Ignoring errors

```go
res, _ := doThing()
```

---

### ✅ CORRECT

```go
res, err := doThing()
if err != nil {
 t.Fatal(err)
}
```

---

## Continuous Testing

### Watch Mode (manual loop)

```bash
while true; do clear; go test ./...; sleep 1; done
```

---

### Pre-Commit Hook

```bash
go test ./... && go vet ./...
```

---

### CI Example

```yaml
- name: Run Tests
  run: go test -cover ./...
```

---

## Best Practices

1. Write tests first
2. Use table-driven tests
3. Keep tests deterministic
4. Prefer interfaces over mocks
5. Test error paths aggressively
6. Keep tests fast (<50ms for unit)
7. Avoid global state
8. Validate real outputs, not internals
9. Keep tests readable
10. Refactor tests too

---

## Success Metrics

* 80%+ coverage
* Fast execution
* Deterministic results
* No flaky tests
* Bugs caught before production

---

## Final Principle

In Go:

Tests are not decoration.

They are **the only thing preventing silent failure in a simple language that won’t protect you.**
