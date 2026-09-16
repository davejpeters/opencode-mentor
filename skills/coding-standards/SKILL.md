---
name: coding-standards
description: Use when questioning universal coding standards, best practices, and patterns for Go development.
---

# Coding Standards & Best Practices

Universal coding standards applicable across all Go projects.

## Code Quality Principles

### 1. Readability First

* Code is read more than written
* Use clear, idiomatic Go naming
* Prefer simple, obvious code over clever abstractions
* Follow standard Go formatting (`gofmt` / `go fmt`)

### 2. KISS (Keep It Simple, Stupid)

* Favor straightforward solutions
* Avoid unnecessary abstractions (especially early)
* Let the problem justify complexity

### 3. DRY (Don't Repeat Yourself)

* Extract reusable logic into functions or packages
* Avoid premature abstraction—duplicate first, abstract later if needed

### 4. YAGNI (You Aren't Gonna Need It)

* Don’t build for hypothetical use cases
* Add interfaces only when multiple implementations exist

---

## Go Language Standards

### Variable Naming

```go
// ✅ GOOD
marketSearchQuery := "election"
isUserAuthenticated := true
totalRevenue := 1000

// ❌ BAD
q := "election"
flag := true
x := 1000
```

---

### Function Naming

```go
// ✅ GOOD
func FetchMarketData(marketID string) {}
func CalculateSimilarity(a, b []float64) float64 {}
func IsValidEmail(email string) bool {}

// ❌ BAD
func Market(id string) {}
func Similarity(a, b []float64) {}
func Email(e string) {}
```

---

### Error Handling (CRITICAL)

Go does not use exceptions. You must handle errors explicitly.

```go
// ✅ GOOD
func FetchData(url string) ([]byte, error) {
 resp, err := http.Get(url)
 if err != nil {
  return nil, fmt.Errorf("request failed: %w", err)
 }
 defer resp.Body.Close()

 if resp.StatusCode != http.StatusOK {
  return nil, fmt.Errorf("bad status: %d", resp.StatusCode)
 }

 body, err := io.ReadAll(resp.Body)
 if err != nil {
  return nil, fmt.Errorf("read failed: %w", err)
 }

 return body, nil
}
```

```go
// ❌ BAD
func FetchData(url string) []byte {
 resp, _ := http.Get(url) // ignoring error
 body, _ := io.ReadAll(resp.Body)
 return body
}
```

---

### Immutability (Go Reality)

Go allows mutation. Use it intentionally.

```go
// ✅ GOOD: Controlled mutation
user.Name = "New Name"

// ✅ GOOD: Copy when needed
newSlice := append([]int{}, oldSlice...)

// ❌ BAD: Unclear side effects
func UpdateUser(u *User) {
 u.Name = "New Name" // document this behavior
}
```

Rule:

* Mutate locally
* Copy when sharing across boundaries

---

### Concurrency (Go Strength)

```go
// ✅ GOOD: Use goroutines + channels
func FetchAll() {
 results := make(chan string)

 go func() {
  results <- FetchUsers()
 }()

 go func() {
  results <- FetchMarkets()
 }()

 for i := 0; i < 2; i++ {
  fmt.Println(<-results)
 }
}
```

```go
// ❌ BAD: Uncontrolled goroutines (leaks)
go FetchUsers() // no sync, no handling
```

---

### Struct Design

```go
// ✅ GOOD
type Market struct {
 ID        string
 Name      string
 Status    string
 CreatedAt time.Time
}
```

```go
// ❌ BAD
type Market struct {
 A string
 B string
}
```

---

### Interfaces (Use Sparingly)

```go
// ✅ GOOD: Small, focused interface
type Reader interface {
 Read(p []byte) (n int, err error)
}
```

```go
// ❌ BAD: Premature abstraction
type MarketService interface {
 Get()
 Create()
 Update()
 Delete()
}
```

Rule:

* Define interfaces where they are used, not where they are implemented

---

## API Design (Go)

### REST API Conventions

```
GET    /markets
GET    /markets/{id}
POST   /markets
PUT    /markets/{id}
PATCH  /markets/{id}
DELETE /markets/{id}
```

---

### Response Structure

```go
type APIResponse[T any] struct {
 Success bool   `json:"success"`
 Data    *T     `json:"data,omitempty"`
 Error   string `json:"error,omitempty"`
}
```

```go
// ✅ SUCCESS
json.NewEncoder(w).Encode(APIResponse[[]Market]{
 Success: true,
 Data:    &markets,
})

// ❌ ERROR
json.NewEncoder(w).Encode(APIResponse[any]{
 Success: false,
 Error:   "invalid request",
})
```

---

### Input Validation

Use libraries or manual validation:

```go
func CreateMarket(req CreateMarketRequest) error {
 if req.Name == "" {
  return errors.New("name required")
 }
 return nil
}
```

---

## Project Structure

```
/cmd/app/            # entrypoint
/internal/           # private application code
/pkg/                # reusable packages
/api/                # handlers
/service/            # business logic
/repository/         # database logic
/model/              # structs
```

---

## File Naming

```
market.go
market_service.go
market_handler.go
```

Rules:

* lowercase
* no underscores unless needed
* descriptive

---

## Comments & Documentation

### When to Comment

```go
// ✅ GOOD: explain WHY
// exponential backoff to avoid hammering API
delay := time.Second * time.Duration(math.Pow(2, float64(retry)))

// ❌ BAD: obvious
// increment counter
count++
```

---

### GoDoc for Public APIs

```go
// FetchMarkets retrieves markets sorted by relevance.
// Returns error if upstream API fails.
func FetchMarkets(query string, limit int) ([]Market, error) {
 return nil, nil
}
```

---

## Performance Best Practices

### Avoid Allocations

```go
// ✅ GOOD
buf := make([]byte, 0, 1024)

// ❌ BAD
var buf []byte // grows repeatedly
```

---

### Database Queries

```go
// ✅ GOOD: select only needed fields
SELECT id, name FROM markets;

// ❌ BAD
SELECT * FROM markets;
```

---

## Testing Standards

### Test Structure

```go
func TestCalculateSimilarity(t *testing.T) {
 // Arrange
 a := []float64{1, 0}
 b := []float64{0, 1}

 // Act
 result := CalculateSimilarity(a, b)

 // Assert
 if result != 0 {
  t.Errorf("expected 0, got %f", result)
 }
}
```

---

### Test Naming

```go
func TestReturnsEmptyWhenNoMatch(t *testing.T) {}
func TestFailsWhenAPIKeyMissing(t *testing.T) {}
```

---

## Code Smell Detection

### 1. Long Functions

```go
// ❌ BAD
func Process() {
 // 100 lines
}

// ✅ GOOD
func Process() {
 data := validate()
 result := transform(data)
 save(result)
}
```

---

### 2. Deep Nesting

```go
// ❌ BAD
if user != nil {
 if user.IsAdmin {
  if market != nil {
   // ...
  }
 }
}
```

```go
// ✅ GOOD
if user == nil {
 return
}
if !user.IsAdmin {
 return
}
if market == nil {
 return
}
```

---

### 3. Magic Numbers

```go
// ❌ BAD
if retry > 3 {}

// ✅ GOOD
const maxRetries = 3
if retry > maxRetries {}
```
