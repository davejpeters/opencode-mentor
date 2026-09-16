---
name: backend-patterns
description: Use when the learner is developing backend architecture patterns, API design, database optimization, and server-side best practices for Go API routes.
---

# Backend Development Patterns (Go)

Backend architecture patterns and best practices for scalable Go server-side applications.

---

## API Design Patterns

### RESTful API Structure

```http
GET    /markets
GET    /markets/{id}
POST   /markets
PUT    /markets/{id}
PATCH  /markets/{id}
DELETE /markets/{id}

GET /markets?status=active&sort=volume&limit=20&offset=0
```

---

### Repository Pattern

```go
type MarketRepository interface {
 FindAll(filters MarketFilters) ([]Market, error)
 FindByID(id string) (*Market, error)
 Create(m Market) (*Market, error)
 Update(id string, m Market) (*Market, error)
 Delete(id string) error
}

type PostgresMarketRepository struct {
 db *sql.DB
}

func (r *PostgresMarketRepository) FindAll(filters MarketFilters) ([]Market, error) {
 query := "SELECT id, name, status FROM markets WHERE 1=1"
 args := []any{}

 if filters.Status != "" {
  query += " AND status = $1"
  args = append(args, filters.Status)
 }

 rows, err := r.db.Query(query, args...)
 if err != nil {
  return nil, err
 }
 defer rows.Close()

 var markets []Market
 for rows.Next() {
  var m Market
  if err := rows.Scan(&m.ID, &m.Name, &m.Status); err != nil {
   return nil, err
  }
  markets = append(markets, m)
 }

 return markets, nil
}
```

---

### Service Layer Pattern

```go
type MarketService struct {
 repo MarketRepository
}

func NewMarketService(repo MarketRepository) *MarketService {
 return &MarketService{repo: repo}
}

func (s *MarketService) SearchMarkets(query string, limit int) ([]Market, error) {
 embedding, err := GenerateEmbedding(query)
 if err != nil {
  return nil, err
 }

 results := VectorSearch(embedding, limit)

 ids := extractIDs(results)
 markets, err := s.repo.FindByIDs(ids)
 if err != nil {
  return nil, err
 }

 return sortByScore(markets, results), nil
}
```

---

### Middleware Pattern (HTTP)

```go
func WithAuth(next http.Handler) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

  if token == "" {
   http.Error(w, "Unauthorized", http.StatusUnauthorized)
   return
  }

  user, err := VerifyToken(token)
  if err != nil {
   http.Error(w, "Invalid token", http.StatusUnauthorized)
   return
  }

  ctx := context.WithValue(r.Context(), "user", user)
  next.ServeHTTP(w, r.WithContext(ctx))
 })
}
```

---

## Database Patterns

### Query Optimization

```go
// ✅ GOOD
rows, err := db.Query("SELECT id, name, status FROM markets WHERE status=$1 LIMIT 10", "active")

// ❌ BAD
rows, err := db.Query("SELECT * FROM markets")
```

---

### N+1 Query Prevention

```go
// ❌ BAD
markets := getMarkets()
for i := range markets {
 user, _ := getUser(markets[i].CreatorID)
 markets[i].Creator = user
}
```

```go
// ✅ GOOD
markets := getMarkets()

ids := extractCreatorIDs(markets)
users := getUsers(ids)

userMap := make(map[string]User)
for _, u := range users {
 userMap[u.ID] = u
}

for i := range markets {
 markets[i].Creator = userMap[markets[i].CreatorID]
}
```

---

### Transaction Pattern

```go
func CreateMarketWithPosition(db *sql.DB, m Market, p Position) error {
 tx, err := db.Begin()
 if err != nil {
  return err
 }

 defer tx.Rollback()

 _, err = tx.Exec("INSERT INTO markets (id, name) VALUES ($1, $2)", m.ID, m.Name)
 if err != nil {
  return err
 }

 _, err = tx.Exec("INSERT INTO positions (id, market_id) VALUES ($1, $2)", p.ID, m.ID)
 if err != nil {
  return err
 }

 return tx.Commit()
}
```

---

## Caching Strategies

### Cache-Aside Pattern (Redis)

```go
func GetMarket(ctx context.Context, id string) (*Market, error) {
 key := "market:" + id

 cached, err := redisClient.Get(ctx, key).Result()
 if err == nil {
  var m Market
  json.Unmarshal([]byte(cached), &m)
  return &m, nil
 }

 market, err := dbFindMarket(id)
 if err != nil {
  return nil, err
 }

 data, _ := json.Marshal(market)
 redisClient.Set(ctx, key, data, 5*time.Minute)

 return market, nil
}
```

---

## Error Handling Patterns

### Centralized Error Handling

```go
type APIError struct {
 Code    int
 Message string
}

func (e APIError) Error() string {
 return e.Message
}

func WriteError(w http.ResponseWriter, err error) {
 var apiErr APIError

 if errors.As(err, &apiErr) {
  http.Error(w, apiErr.Message, apiErr.Code)
  return
 }

 log.Println("unexpected error:", err)
 http.Error(w, "internal server error", http.StatusInternalServerError)
}
```

---

### Retry with Exponential Backoff

```go
func Retry(fn func() error, maxRetries int) error {
 var err error

 for i := 0; i < maxRetries; i++ {
  err = fn()
  if err == nil {
   return nil
  }

  time.Sleep(time.Duration(math.Pow(2, float64(i))) * time.Second)
 }

 return err
}
```

---

## Authentication & Authorization

### JWT Validation

```go
type Claims struct {
 UserID string `json:"user_id"`
 Role   string `json:"role"`
 jwt.RegisteredClaims
}

func VerifyToken(tokenStr string) (*Claims, error) {
 token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (any, error) {
  return []byte(os.Getenv("JWT_SECRET")), nil
 })

 if err != nil {
  return nil, err
 }

 claims, ok := token.Claims.(*Claims)
 if !ok || !token.Valid {
  return nil, errors.New("invalid token")
 }

 return claims, nil
}
```

---

### Role-Based Access Control

```go
var rolePermissions = map[string][]string{
 "admin":     {"read", "write", "delete"},
 "moderator": {"read", "write"},
 "user":      {"read"},
}

func HasPermission(role, permission string) bool {
 for _, p := range rolePermissions[role] {
  if p == permission {
   return true
  }
 }
 return false
}
```

---

## Rate Limiting

### Simple In-Memory Rate Limiter

```go
type RateLimiter struct {
 requests map[string][]time.Time
 mu       sync.Mutex
}

func (r *RateLimiter) Allow(key string, max int, window time.Duration) bool {
 r.mu.Lock()
 defer r.mu.Unlock()

 now := time.Now()
 reqs := r.requests[key]

 var filtered []time.Time
 for _, t := range reqs {
  if now.Sub(t) < window {
   filtered = append(filtered, t)
  }
 }

 if len(filtered) >= max {
  return false
 }

 filtered = append(filtered, now)
 r.requests[key] = filtered
 return true
}
```

---

## Background Jobs & Queues

### Worker Pool Pattern (Go-idiomatic)

```go
type Job struct {
 MarketID string
}

func worker(jobs <-chan Job) {
 for job := range jobs {
  process(job)
 }
}

func StartWorkerPool() chan<- Job {
 jobs := make(chan Job, 100)

 for i := 0; i < 5; i++ {
  go worker(jobs)
 }

 return jobs
}
```

---

## Logging & Monitoring

### Structured Logging

```go
type Logger struct{}

func (l Logger) Info(msg string, fields map[string]any) {
 entry := map[string]any{
  "level":     "info",
  "message":   msg,
  "timestamp": time.Now().UTC(),
 }

 for k, v := range fields {
  entry[k] = v
 }

 data, _ := json.Marshal(entry)
 fmt.Println(string(data))
}
```

---

## Final Principle

Go backend design is about:

- explicit flow (no magic)
- small, composable components
- predictable behavior under load

If your architecture feels like a framework is hiding things from you… you've already lost control.
