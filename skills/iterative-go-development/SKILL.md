---
name: iterative-go-development
description: Use when implementing code and refactoring, architecturing or designing systems, process and workflow improvements, error handling and validation. Provide tehniques to avoid over-engineering and apply iterative improvements.
---

# Kaizen: Continuous Improvement

Apply continuous improvement mindset - suggest small iterative improvements, error-proof designs, follow established patterns, avoid over-engineering; automatically applied to guide quality and simplicity

## Overview

Small improvements, continuously. Error-proof by design. Follow what works. Build only what's needed.

**Core principle:** Many small improvements beat one big change. Prevent errors at design time, not with fixes.

## When to Use

**Always applied for:**

- Code implementation and refactoring
- Architecture and design decisions
- Process and workflow improvements
- Error handling and validation

**Philosophy:** Quality through incremental progress and prevention, not perfection through massive effort.

## The Four Pillars

### 1. Continuous Improvement (Kaizen)

Small, frequent improvements compound into major gains.

#### Principles

**Incremental over revolutionary:**

- Make smallest viable change that improves quality
- One improvement at a time
- Verify each change before next
- Build momentum through small wins

**Always leave code better:**

- Fix small issues as you encounter them
- Refactor while you work (within scope)
- Update outdated comments
- Remove dead code when you see it

**Iterative refinement:**

- First version: make it work
- Second pass: make it clear
- Third pass: make it efficient
- Don't try all three at once

<Good>

```go
type Item struct {
        Price    float64
        Quantity int
}

// Iteration 1: Make it work
// Basic C-style loop
func CalculateTotalV1(items []Item) float64 {
        total := 0.0
        for i := 0; i < len(items); i++ {
                total += items[i].Price * float64(items[i].Quantity)
        }
        return total
}

// Iteration 2: Make it clear (refactor)
// Using 'range' is the idiomatic "clear" way in Go 
func CalculateTotalV2(items []Item) float64 {
        var total float64
        for _, item := range items {
                total += item.Price * float64(item.Quantity)
        }
        return total
}

// Iteration 3: Make it robust (add validation)
// Go handles errors by returning them as a second value
func CalculateTotalV3(items []Item) (float64, error) {
        if len(items) == 0 {
                return 0, nil
        }

        var total float64
        for _, item := range items {
                if item.Price < 0 || item.Quantity < 0 {
                        return 0, errors.New("price and quantity must be non-negative")
                }
                total += item.Price * float64(item.Quantity)
        }

        return total, nil
}
```

Each step is complete, tested, and working
</Good>

<Bad>

```go
// Trying to do everything at once
func CalculateTotal(items []Item) (float64, error) {
    // Validate, filter, calculate, and handle edge cases all together
    if items == nil || len(items) == 0 {
        return 0, nil
    }

    var total float64
    for _, item := range items {
        // Validation mixed with business logic
        if item.Price < 0 {
            return 0, errors.New("negative price")
        }
        if item.Quantity < 0 {
            return 0, errors.New("negative quantity")
        }

        // Filtering mixed with processing
        if item.Quantity > 0 {
            // Imagine more logic here: logging, analytics, currency conversion...
            log.Printf("Processing item %s", item.ID)
            
            lineItemTotal := item.Price * float64(item.Quantity)
            total += lineItemTotal
        }
    }
    
    // Hard to test this specific logic in isolation
    return total, nil
}
```

Overwhelming, error-prone, hard to verify
</Bad>

#### In Practice

**When implementing features:**

1. Start with simplest version that works
2. Add one improvement (error handling, validation, etc.)
3. Test and verify
4. Repeat if time permits
5. Don't try to make it perfect immediately

**When refactoring:**

- Fix one smell at a time
- Commit after each improvement
- Keep tests passing throughout
- Stop when "good enough" (diminishing returns)

**When reviewing code:**

- Suggest incremental improvements (not rewrites)
- Prioritize: critical → important → nice-to-have
- Focus on highest-impact changes first
- Accept "better than before" even if not perfect

### 2. Poka-Yoke (Error Proofing)

Design systems that prevent errors at compile/design time, not runtime.

#### Principles

**Make errors impossible:**

- Type system catches mistakes
- Compiler enforces contracts
- Invalid states unrepresentable
- Errors caught early (left of production)

**Design for safety:**

- Fail fast and loudly
- Provide helpful error messages
- Make correct path obvious
- Make incorrect path difficult

**Defense in layers:**

1. Type system (compile time)
2. Validation (runtime, early)
3. Guards (preconditions)
4. Error boundaries (graceful degradation)

#### Type System Error Proofing

<Good>

```go
// Error: string status can be any value
type OrderBad struct {
    Status string // Can be "pending", "pnding", "DONE", anything!
    Total  float64
}

// Good: Custom type with constants (Enums)
type OrderStatus int

const (
    StatusPending OrderStatus = iota
    StatusProcessing
    StatusShipped
    StatusDelivered
)

// Better: States with associated data using Interfaces
// This makes it impossible to have a "Shipped" state without a tracking number
type OrderState interface {
    isOrderState() // Unexported method "seals" the interface
}

type PendingState struct {
    CreatedAt time.Time
}
func (PendingState) isOrderState() {}

type ShippedState struct {
    TrackingNumber string
    ShippedAt      time.Time
}
func (ShippedState) isOrderState() {}

type DeliveredState struct {
    DeliveredAt time.Time
    Signature   string
}
func (DeliveredState) isOrderState() {}

type Order struct {
    ID    string
    Total float64
    State OrderState
}
```

Type system prevents entire classes of errors
</Good>

#### Validation Error Proofing

<Good>

```go
// Error: Validation after use
func processPayment(amount float64) error {
    fee := amount * 0.03 // Used before validation!
    if amount <= 0 {
        return errors.New("invalid amount")
    }
    // ...
    return nil
}

// Good: Validate immediately (Fail Fast)
func processPayment(amount float64) error {
    if amount <= 0 {
        return errors.New("payment amount must be positive")
    }
    if amount > 10000 {
        return errors.New("payment exceeds maximum allowed")
    }
    
    fee := amount * 0.03
    // ... now safe to use
    return nil
}

// Better: Validation at boundary using a custom type
// In Go, we use unexported fields or constructor functions to enforce rules
type PositiveAmount struct {
    value float64
}

func NewPositiveAmount(n float64) (PositiveAmount, error) {
    if n <= 0 {
        return PositiveAmount{}, errors.New("must be positive")
    }
    return PositiveAmount{value: n}, nil
}

func (p PositiveAmount) Float64() float64 {
    return p.value
}

func processPayment(amount PositiveAmount) {
    // amount is guaranteed positive by its type constructor
    fee := amount.Float64() * 0.03
    // ... logic is safe and clean
}

// Validate at system boundary (e.g., HTTP handler)
func handlePaymentRequest(req PaymentRequest) {
    amount, err := NewPositiveAmount(req.Amount) // Validate once
    if err != nil {
        log.Println("Invalid input:", err)
        return
    }
    
    processPayment(amount) // Use everywhere safely
}
```

Validate once at boundary, safe everywhere else
</Good>

#### Guards and Preconditions

<Good>

```typescript
// Early returns prevent deeply nested code
const processUser = (user: User | null) => {
  if (!user) {
    logger.error('User not found');
    return;
  }
  
  if (!user.email) {
    logger.error('User email missing');
    return;
  }
  
  if (!user.isActive) {
    logger.info('User inactive, skipping');
    return;
  }
  
  // Main logic here, guaranteed user is valid and active
  sendEmail(user.email, 'Welcome!');
};
```

Guards make assumptions explicit and enforced
</Good>

#### Configuration Error Proofing

<Good>

```go
// Early returns prevent deeply nested code
func processUser(user *User) {
    if user == nil {
        log.Println("Error: User not found")
        return
    }
    
    if user.Email == "" {
        log.Println("Error: User email missing")
        return
    }
    
    if !user.IsActive {
        log.Println("Info: User inactive, skipping")
        return
    }
    
    // Main logic here, guaranteed user is valid and active
    // The "happy path" stays at the left margin
    sendEmail(user.Email, "Welcome!")
}
```

Guards make assumptions explicit and enforced
</Good>

#### In Practice

**When designing APIs:**

- Use types to constrain inputs
- Make invalid states unrepresentable
- Return message instead of raw errors
- Document preconditions in types

**When handling errors:**

- Validate at system boundaries
- Use guards for preconditions
- Fail fast with clear messages
- Log context for debugging

**When configuring:**

- Required over optional with defaults
- Validate all config at startup
- Fail deployment if config invalid
- Don't allow partial configurations

### 3. Standardized Work

Follow established patterns. Document what works. Make good practices easy to follow.

#### Principles

**Consistency over cleverness:**

- Follow existing codebase patterns
- Don't reinvent solved problems
- New pattern only if significantly better
- Team agreement on new patterns

**Documentation lives with code:**

- README for setup and architecture
- AGENTS.md for AI coding conventions
- Comments for "why", not "what"
- Examples for complex patterns

**Automate standards:**

- Linters enforce style
- Type checks enforce contracts
- Tests verify behavior
- CI/CD enforces quality gates

#### Following Patterns

<Good>

```go
// Existing codebase pattern for API clients
type UserAPIClient struct {
    BaseURL string
}

func (c *UserAPIClient) GetUser(id string) (*User, error) {
    return c.fetch(fmt.Sprintf("/users/%s", id))
}

// New code follows the same pattern
type OrderAPIClient struct {
    BaseURL string
}

func (c *OrderAPIClient) GetOrder(id string) (*Order, error) {
    return c.fetch(fmt.Sprintf("/orders/%s", id))
}
```

Consistency makes codebase predictable
</Good>

<Bad>

```go
// Existing pattern uses structs and methods
type UserAPIClient struct { /* ... */ }
func (c *UserAPIClient) GetUser(id string) (*User, error) { /* ... */ }

// New code introduces different pattern without discussion
func GetOrder(id string) (*Order, error) {
    // Breaking consistency "because I prefer package-level functions"
    // This makes dependency injection and mocking harder to keep uniform
}
```

Inconsistency creates confusion
</Bad>

#### Error Handling Patterns

<Good>

```go
// Project standard: Return (T, error) for all recoverable errors
// and wrap errors with context as they bubble up.

// All services follow this pattern
func FetchUser(id string) (*User, error) {
    user, err := db.Users.FindByID(id)
    if err != nil {
        // Standard: Wrap internal error with context
        return nil, fmt.Errorf("repository error: %w", err)
    }
    
    if user == nil {
        // Standard: Use sentinel errors or specific messages
        return nil, errors.New("user not found")
    }
    
    return user, nil
}

// Callers follow the idiomatic Go pattern
user, err := FetchUser("123")
if err != nil {
    // Consistency: Check error before accessing value
    logger.Printf("Failed to fetch user: %v", err)
    return
}

// user is safe to use here
fmt.Println("Found user:", user.Name)
```

Standard pattern across codebase
</Good>

#### Documentation Standards

<Good>

```go
// Retry performs an operation multiple times with exponential backoff.
//
// Why: Network requests fail temporarily; retrying improves reliability.
// When to use: External API calls, database operations.
// When not to use: User input validation, internal function calls, or 
// non-idempotent operations (e.g., POSTing a payment).
//
// Example:
//      result, err := Retry(func() (User, error) {
//              return client.FetchUser("123")
//      }, RetryOptions{MaxAttempts: 3, BaseDelay: time.Second})
func Retry(operation func() (interface{}, error), options RetryOptions) (interface{}, error) {
    // Implementation...
}
```

Documents why, when, and how
</Good>

#### In Practice

**Before adding new patterns:**

- Search codebase for similar problems solved
- Check AGENTS.md for project conventions
- Discuss with team if breaking from pattern
- Update docs when introducing new pattern

**When writing code:**

- Match existing file structure
- Use same naming conventions
- Follow same error handling approach
- Import from same locations

**When reviewing:**

- Check consistency with existing code
- Point to examples in codebase
- Suggest aligning with standards
- Update AGENTS.md if new standard emerges

### 4. Just-In-Time (JIT)

Build what's needed now. No more, no less. Avoid premature optimization and over-engineering.

#### Principles

**YAGNI (You Aren't Gonna Need It):**

- Implement only current requirements
- No "just in case" features
- No "we might need this later" code
- Delete speculation

**Simplest thing that works:**

- Start with straightforward solution
- Add complexity only when needed
- Refactor when requirements change
- Don't anticipate future needs

**Optimize when measured:**

- No premature optimization
- Profile before optimizing
- Measure impact of changes
- Accept "good enough" performance

#### YAGNI in Action

<Good>

```go
// Current requirement: Log errors to console
func logError(err error) {
    log.Printf("ERROR: %s", err.Error())
}

// Simple, meets current need
```

Simple, meets current need
</Good>

<Bad>

```go
// Over-engineered for "future needs"
type LogTransport interface {
        Write(level LogLevel, message string, meta *LogMetadata) error
}

type ConsoleTransport struct{}
func (ConsoleTransport) Write(level LogLevel, message string, meta *LogMetadata) error { return nil }

type FileTransport struct{}
func (FileTransport) Write(level LogLevel, message string, meta *LogMetadata) error { return nil }

type RemoteTransport struct{}
func (RemoteTransport) Write(level LogLevel, message string, meta *LogMetadata) error { return nil }

type Logger struct {
        transports   []LogTransport
        queue        []LogEntry
        rateLimiter  RateLimiter
        formatter    LogFormatter

        // 200+ lines of code for "maybe we'll need it"
}

func logError(err error) {
        // Too much complexity just to meet the current requirement.
        // Also introduces global singleton coupling.
        GetLogger().Log("error", err.Error())
}
```

Building for imaginary future requirements
</Bad>

**When to add complexity:**

- Current requirement demands it
- Pain points identified through use
- Measured performance issues
- Multiple use cases emerged

<Good>

```go
// Start simple
func FormatCurrency(amount float64) string {
        return fmt.Sprintf("$%.2f", amount)
}

// Requirement evolves: support multiple currencies
func FormatCurrencyWith(amount float64, currency string) string {
        symbols := map[string]string{
                "USD": "$",
                "EUR": "€",
                "GBP": "£",
        }
        return fmt.Sprintf("%s%.2f", symbols[currency], amount)
}

// Requirement evolves: support localization
// (If you truly need localization, add a dependency or a lookup mechanism here.)
func FormatCurrencyLocalized(amount float64, locale, currency string) string {
        // Simple placeholder: in real code you might integrate with a localization/i18n library.
        // For example, you'd apply number formatting rules per locale.
        switch locale {
        case "en-US":
                return fmt.Sprintf("%s%.2f", currencySymbol(currency, locale), amount)
        case "de-DE":
                // de-DE example: comma as decimal separator would require formatting rules
                return fmt.Sprintf("%s%.2f", currencySymbol(currency, locale), amount)
        default:
                return fmt.Sprintf("%s%.2f", currencySymbol(currency, locale), amount)
        }
}

func currencySymbol(currency, _ string) string {
        switch currency {
        case "USD":
                return "$"
        case "EUR":
                return "€"
        case "GBP":
                return "£"
        default:
                return ""
        }
}
```

Complexity added only when needed
</Good>

#### Premature Abstraction

<Bad>

```go
// One use case, but building generic framework (Go)

// Example of “massive abstraction” for a single-table need.

package main

import "context"

type BaseCRUDService[T any] interface {
        GetAll(ctx context.Context) ([]T, error)
        GetByID(ctx context.Context, id string) (T, error)
        Create(ctx context.Context, data map[string]any) (T, error) // Partial<T> analogue
        Update(ctx context.Context, id string, data map[string]any) (T, error)
        Delete(ctx context.Context, id string) error
}

// GenericRepository<T> { /* ~300 lines */ }
// QueryBuilder<T> { /* ~200 lines */ }
// ... building an entire ORM/query layer for a single table/use case

func main() {
        // Imagine we only need one table/use case, but we’re building:
        // - a generic repository
        // - a generic query builder
        // - generic CRUD service interfaces
        // for an uncertain future.
}
```

Massive abstraction for uncertain future
</Bad>

<Good>

```go
// Simple functions for current needs (Go)

// getUsers returns all users.
func getUsers(ctx context.Context, db DB) ([]User, error) {
        return db.QueryContext(ctx, "SELECT * FROM users")
}

// getUserByID returns a user by id, or nil if not found.
func getUserByID(ctx context.Context, db DB, id string) (*User, error) {
        row := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", id)

        var u User
        if err := row.Scan(&u.ID, &u.Name /* ... */); err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, nil
                }
                return nil, err
        }
        return &u, nil
}

// When pattern emerges across multiple entities, then abstract.
// Abstract only when pattern proven across 3+ cases.
```

Abstract only when pattern proven across 3+ cases
</Good>

#### Performance Optimization

<Good>

```go
// Performance Optimization (Go)

// Good: Simple approach
func filterActiveUsers(users []User) []User {
        active := make([]User, 0, len(users))
        for _, u := range users {
                if u.IsActive {
                        active = append(active, u)
                }
        }
        return active
}

// Benchmark shows: 50ms for 1000 users (acceptable)
// ✓ Ship it, no optimization needed

// Later: After profiling shows this is bottleneck
// Then optimize with indexed lookup or caching.
```

Optimize based on measurement, not assumptions
</Good>

<Bad>

```go
// Bad: Premature optimization
func filterActiveUsersPremature(users []User) []User {
        // "This might be slow, so let's cache and index"
        // (Example of adding complexity without evidence.)
        cache := make(map[bool][]User) // placeholder “complex” cache
        _ = cache

        // buildBTreeIndex(...) would be a large, unnecessary implementation here.
        // indexed := buildBTreeIndex(users, "isActive") // 100+ lines of code

        // Adds complexity, harder to maintain
        // No evidence it was needed
        // (Falls back to the simple logic just to return something.)
        out := make([]User, 0, len(users))
        for _, u := range users {
                if u.IsActive {
                        out = append(out, u)
                }
        }
        return out
}
```

Complex solution for unmeasured problem
</Bad>

#### In Practice

**When implementing:**

- Solve the immediate problem
- Use straightforward approach
- Resist "what if" thinking
- Delete speculative code

**When optimizing:**

- Profile first, optimize second
- Measure before and after
- Document why optimization needed
- Keep simple version in tests

**When abstracting:**

- Wait for 3+ similar cases (Rule of Three)
- Make abstraction as simple as possible
- Prefer duplication over wrong abstraction
- Refactor when pattern clear

## Integration with Commands

The Kaizen skill guides how you work. The commands provide structured analysis:

- **`/why`**: Root cause analysis (5 Whys)
- **`/cause-and-effect`**: Multi-factor analysis (Fishbone)
- **`/plan-do-check-act`**: Iterative improvement cycles
- **`/analyse-problem`**: Comprehensive documentation (A3)
- **`/analyse`**: Smart method selection (Gemba/VSM/Muda)

Use commands for structured problem-solving. Apply skill for day-to-day development.

## Red Flags

**Violating Continuous Improvement:**

- "I'll refactor it later" (never happens)
- Leaving code worse than you found it
- Big bang rewrites instead of incremental

**Violating Poka-Yoke:**

- "Users should just be careful"
- Validation after use instead of before
- Optional config with no validation

**Violating Standardized Work:**

- "I prefer to do it my way"
- Not checking existing patterns
- Ignoring project conventions

**Violating Just-In-Time:**

- "We might need this someday"
- Building frameworks before using them
- Optimizing without measuring

## Remember

**Kaizen is about:**

- Small improvements continuously
- Preventing errors by design
- Following proven patterns
- Building only what's needed

**Not about:**

- Perfection on first try
- Massive refactoring projects
- Clever abstractions
- Premature optimization

**Mindset:** Good enough today, better tomorrow. Repeat.
