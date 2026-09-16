---
name: security-review
description: Use when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.
---

# Security Review Skill

This skill ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs

## Security Checklist

### 1. Secrets Management

#### ❌ NEVER Do This

```go
const apiKey = "sk-proj-xxxxx"  // Hardcoded secret
const dbPassword = "password123" // In source code
```

#### ✅ ALWAYS Do This

```go
const apiKey = os.Getenv("OPENAI_API_KEY")
const dbUrl = os.Getenv("DATABASE_URL")

// Verify secrets exist
if apiKey == "" {
  return errors.New('OPENAI_API_KEY not configured')
}
if dbUrl == "" {
  return errors.New('DATABASE_URL not configured')
}
```

#### Verification Steps

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] Production secrets in hosting platform (Vercel, Railway)

### 2. Input Validation

#### Always Validate User Input

```go
import (
        "fmt"
        "github.com/go-playground/validator/v10"
)

// Define validation schema
type CreateUserRequest struct {
  Email string `validate:"required,email"`
  Name  string `validate:"required,min=1,max=100"`
  Age   int    `validate:"gte=0,lte=150"`
}

// Global validator instance
var validate = validator.New()

func CreateUser(input CreateUserRequest) (interface{}, error) {
  // Validate struct
  err := validate.Struct(input)
  if err != nil {
    // Return validation errors
    return nil, err
  }

  // Logic to save to DB would go here
  // return db.Users.Create(input)
  return fmt.Sprintf("User %s created successfully", input.Name), nil
}
```

#### File Upload Validation

```go
func validateFileUpload(file *os.File) error {
  // 1. Size check (5MB max)
  const maxSize int64 = 5 * 1024 * 1024
  fileInfo, err := file.Stat()
  if err != nil {
    return fmt.Errorf("could not get file info: %w", err)
  }
  if fileInfo.Size() > maxSize {
    return errors.New("file too large (max 5MB)")
  }

  // 2. Type check (MIME type)
  // Note: In Go, we often use http.DetectContentType for raw bytes, 
  // but using file extension mapping is the standard approach for filenames.
  ext := strings.ToLower(filepath.Ext(fileInfo.Name()))
  mimeType := mime.TypeByExtension(ext)

  allowedTypes := map[string]bool{
    "image/jpeg": true,
    "image/png":  true,
    "image/gif":  true,
  }

  if !allowedTypes[mimeType] {
    return errors.New("invalid file type")
  }

  // 3. Extension check
  allowedExtensions := map[string]bool{
    ".jpg":  true,
    ".jpeg": true,
    ".png":  true,
    ".gif":  true,
  }

  if !allowedExtensions[ext] {
    return errors.New("invalid file extension")
  }

  return nil
}
```

#### Verification Steps

- [ ] All user inputs validated with schemas
- [ ] File uploads restricted (size, type, extension)
- [ ] No direct use of user input in queries
- [ ] Whitelist validation (not blacklist)
- [ ] Error messages don't leak sensitive info

### 3. SQL Injection Prevention

#### ❌ NEVER Concatenate SQL

```go
// VULNERABLE: String concatenation allows SQL Injection
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", userEmail)
db.Exec(query) 
```

#### ✅ ALWAYS Use Parameterized Queries

```go
// SECURE: Parameterized query
// The database driver handles escaping safely
query := "SELECT * FROM users WHERE email = $1"
row := db.QueryRow(query, userEmail)

var user User
err := row.Scan(&user.ID, &user.Email)
```

#### Verification Steps

- [ ] All database queries use parameterized queries
- [ ] No string concatenation in SQL
- [ ] ORM/query builder used correctly
- [ ] Supabase queries properly sanitized

### 4. Authentication & Authorization

#### JWT Token Handling

```go
import (
        "net/http"
        "time"
)

// ✅ CORRECT: httpOnly cookies
func setTokenCookie(w http.ResponseWriter, token string) {
  cookie := &http.Cookie{
    Name:     "token",
    Value:    token,
    HttpOnly: true,     // Prevents JavaScript access (XSS protection)
    Secure:   true,     // Requires HTTPS
    SameSite: http.SameSiteStrictMode,
    MaxAge:   3600,     // 1 hour
    Path:     "/",
  }
  http.SetCookie(w, cookie)
}
```

#### Authorization Checks

```go
import (
        "encoding/json"
        "net/http"
)

func DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
  // Assume requesterID is retrieved from the context (populated by auth middleware)
  requesterID := r.Context().Value("userID").(string)
  targetUserID := r.URL.Query().Get("id")

  // 1. Verify Authorization
  requester, err := db.Users.FindUnique(requesterID)
  if err != nil || requester.Role != "admin" {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusForbidden)
    json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
    return
  }

  // 2. Proceed with deletion
  err = db.Users.Delete(targetUserID)
  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }

  w.WriteHeader(http.StatusOK)
}
```

#### Row Level Security (Supabase)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only view their own data
CREATE POLICY "Users view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
  WITH CHECK (id = auth.uid()); 
```

#### Verification Steps

- [ ] Tokens stored in httpOnly cookies (not localStorage)
- [ ] Authorization checks before sensitive operations
- [ ] Row Level Security enabled in Supabase
- [ ] Role-based access control implemented
- [ ] Session management secure

### 5. XSS Prevention

#### Sanitize HTML

```go
import (
        "fmt"
        "github.com/microcosm-cc/bluemonday"
        "html/template"
)

func renderUserContent(htmlInput string) template.HTML {
  // 1. Initialize the policy
  // StrictPolicy is a good starting point, or create a custom one
  p := bluemonday.NewPolicy()

  // Add allowed tags
  p.AllowElements("b", "i", "em", "strong", "p")

  // By default, AllowElements does not allow any attributes.

  // 2. Sanitize
  clean := p.Sanitize(htmlInput)

  // 3. Return as template.HTML to indicate it is "safe" for the template engine
  return template.HTML(clean)
}
```

#### Content Security Policy

```go
func SecurityHeaders() gin.HandlerFunc {
  return func(c *gin.Context) {
    csp := "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com;"

    c.Writer.Header().Set("Content-Security-Policy", csp)
    c.Next()
  }
}

// In main():
// r := gin.Default()
// r.Use(SecurityHeaders())
```

#### Verification Steps

- [ ] User-provided HTML sanitized
- [ ] CSP headers configured
- [ ] No unvalidated dynamic content rendering
- [ ] React's built-in XSS protection used

### 6. CSRF Protection

#### CSRF Tokens

```go
package main

import (
 "encoding/json"
 "net/http"
)

// Assume this is your CSRF validation logic
func verifyCSRF(token string) bool {
 // Implementation: compare token against stored session/secret
 return token == "expected-token-value"
}

func HandlePost(w http.ResponseWriter, r *http.Request) {
 token := r.Header.Get("X-CSRF-Token")

 if !verifyCSRF(token) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(http.StatusForbidden)
  json.NewEncoder(w).Encode(map[string]string{"error": "Invalid CSRF token"})
  return
 }

 // Process request
}
```

#### SameSite Cookies

```go
import "net/http"

func SetSessionCookie(w http.ResponseWriter, sessionId string) {
 cookie := http.Cookie{
  Name:     "session",
  Value:    sessionId,
  HttpOnly: true,
  Secure:   true, // Requires HTTPS
  SameSite: http.SameSiteStrictMode,
  Path:     "/",
 }

 http.SetCookie(w, &cookie)
}
```

#### Verification Steps

- [ ] CSRF tokens on state-changing operations
- [ ] SameSite=Strict on all cookies
- [ ] Double-submit cookie pattern implemented

### 7. Rate Limiting

#### API Rate Limiting

```go
package main

import (
  "net/http"
  "github.com/didip/tollbooth/v7"
  "github.com/didip/tollbooth/v7/limiter"
)

...
  // --- Standard API Rate Limiting ---
  // 100 requests per 15 minutes (calculated as requests per second)
  // 100 / 900 seconds = ~0.11 requests per second
  lmt := tollbooth.NewLimiter(0.11, &limiter.ExpirableOptions{DefaultExpirationTTL: 15 * 60 * 1000000000})
  lmt.SetMessage("Too many requests")


  // Routes
  http.Handle("/api/", tollbooth.LimitFuncHandler(lmt, func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("API Response"))
  }))
...
```

#### Expensive Operations

```go
  // --- Expensive Operations (Search) ---
  // 10 requests per 1 minute (10 / 60 = 0.166 req/sec)
  searchLmt := tollbooth.NewLimiter(0.166, &limiter.ExpirableOptions{DefaultExpirationTTL: 60 * 1000000000})
  searchLmt.SetMessage("Too many search requests")

  // Routes
  http.Handle("/api/search", tollbooth.LimitFuncHandler(searchLmt, func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Search Results"))
  }))
```

#### Verification Steps

- [ ] Rate limiting on all API endpoints
- [ ] Stricter limits on expensive operations
- [ ] IP-based rate limiting
- [ ] User-based rate limiting (authenticated)

### 8. Sensitive Data Exposure

#### Logging

In Go, we typically use the `log` package or structured loggers like `slog` (introduced in Go 1.21).

```go
// ❌ WRONG: Logging sensitive data
log.Printf("User login: %+v", map[string]string{"email": email, "password": password})
log.Printf("Payment: %+v", map[string]string{"cardNumber": cardNumber, "cvv": cvv})

// ✅ CORRECT: Redact sensitive data
log.Printf("User login: %+v", map[string]string{"email": email, "userId": userId})
log.Printf("Payment: %+v", map[string]string{"last4": card.Last4, "userId": userId})
```

#### Error Messages

In Go, you should never return the raw error string or stack trace to the client. Instead, log the detailed error server-side and return a generic message to the user.

```go
import (
 "encoding/json"
 "log"
 "net/http"
)

// ❌ WRONG: Exposing internal details
func Handler(w http.ResponseWriter, r *http.Request) {
 err := performSensitiveOperation()
 if err != nil {
  w.WriteHeader(http.StatusInternalServerError)
  // Never expose err.Error() directly to the client
  json.NewEncoder(w).Encode(map[string]string{
   "error": err.Error(),
  })
  return
 }
}

// ✅ CORRECT: Generic error messages
func Handler(w http.ResponseWriter, r *http.Request) {
 err := performSensitiveOperation()
 if err != nil {
  // Log the full error internally for debugging
  log.Printf("Internal error: %v", err)

  // Return a safe, generic message to the client
  w.WriteHeader(http.StatusInternalServerError)
  json.NewEncoder(w).Encode(map[string]string{
   "error": "An error occurred. Please try again.",
  })
  return
 }
}
```

#### Verification Steps

- [ ] No passwords, tokens, or secrets in logs
- [ ] Error messages generic for users
- [ ] Detailed errors only in server logs
- [ ] No stack traces exposed to users

### 9. Blockchain Security (Solana)

#### Wallet Verification

```go
package main

import (
 "crypto/ed25519"
 "encoding/base64"
)

func VerifyWalletOwnership(publicKeyStr, signatureStr, message string) bool {
 // Decode inputs
 pubKeyBytes, err := base64.StdEncoding.DecodeString(publicKeyStr)
 if err != nil || len(pubKeyBytes) != ed25519.PublicKeySize {
  return false
 }

 sigBytes, err := base64.StdEncoding.DecodeString(signatureStr)
 if err != nil || len(sigBytes) != ed25519.SignatureSize {
  return false
 }

 // Verify the Ed25519 signature
 return ed25519.Verify(pubKeyBytes, []byte(message), sigBytes)
}
```

#### Transaction Verification

```go
import (
 "context"
 "errors"
)

type Transaction struct {
 From   solana.PublicKey
 To     solana.PublicKey
 Amount uint64
}

func VerifyTransaction(ctx context.Context, client *rpc.Client, tx Transaction, expectedRecipient solana.PublicKey, maxAmount uint64) (bool, error) {
 // Verify recipient
 if tx.To != expectedRecipient {
  return false, errors.New("invalid recipient")
 }

 // Verify amount
 if tx.Amount > maxAmount {
  return false, errors.New("amount exceeds limit")
 }

 // Verify user has sufficient balance
 balance, err := client.GetBalance(ctx, tx.From, rpc.CommitmentFinalized)
 if err != nil {
  return false, err
 }

 // balance.Value is in lamports
 if balance.Value < tx.Amount {
  return false, errors.New("insufficient balance")
 }

 return true, nil
}
```

#### Verification Steps

- [ ] Wallet signatures verified
- [ ] Transaction details validated
- [ ] Balance checks before transactions
- [ ] No blind transaction signing

### 10. Dependency Security

#### Regular Updates

```bash
# Check for vulnerabilities
gosec -r && go vet ./...

# Fix automatically fixable issues
go fix

# Update dependencies
go mod tidy

# Check for outdated packages
go list -u -m -json all
```

#### Lock Files

```bash
# ALWAYS commit go.mod and go.sum
git add go.mod go.sum

# Use in CI/CD for reproducible builds
go mod tidy && go mod download && go mod verify 
```

#### Verification Steps

- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit clean)
- [ ] Lock files committed
- [ ] Dependabot enabled on GitHub
- [ ] Regular security updates

## Security Testing

### Automated Security Tests

```go
package security_test

import (
 "bytes"
 "net/http"
 "net/http/httptest"
 "testing"
)

// TestAuthentication requires authentication
func TestAuthentication(t *testing.T) {
 req := httptest.NewRequest("GET", "/api/protected", nil)
 w := httptest.NewRecorder()

 // Assuming 'handler' is your router or main controller
 MyRouter().ServeHTTP(w, req)

 if w.Code != http.StatusUnauthorized {
  t.Errorf("expected 401, got %d", w.Code)
 }
}

// TestAuthorization requires admin role
func TestAuthorization(t *testing.T) {
 req := httptest.NewRequest("GET", "/api/admin", nil)
 req.Header.Set("Authorization", "Bearer "+userToken)
 w := httptest.NewRecorder()

 MyRouter().ServeHTTP(w, req)

 if w.Code != http.StatusForbidden {
  t.Errorf("expected 403, got %d", w.Code)
 }
}

// TestInputValidation rejects invalid input
func TestInputValidation(t *testing.T) {
 payload := []byte(`{"email": "not-an-email"}`)
 req := httptest.NewRequest("POST", "/api/users", bytes.NewBuffer(payload))
 req.Header.Set("Content-Type", "application/json")
 w := httptest.NewRecorder()

 MyRouter().ServeHTTP(w, req)

 if w.Code != http.StatusBadRequest {
  t.Errorf("expected 400, got %d", w.Code)
 }
}

// TestRateLimiting enforces rate limits
func TestRateLimiting(t *testing.T) {
 // Note: Rate limiting is better tested against a running server
 // or using a library that supports time manipulation.
 server := httptest.NewServer(MyRouter())
 defer server.Close()

 foundRateLimit := false
 for i := 0; i < 101; i++ {
  res, _ := http.Get(server.URL + "/api/endpoint")
  if res.StatusCode == http.StatusTooManyRequests {
   foundRateLimit = true
   break
  }
 }

 if !foundRateLimit {
  t.Error("expected at least one 429 status code, but none found")
 }
}
```

## Pre-Deployment Security Checklist

Before ANY production deployment:

- [ ] **Secrets**: No hardcoded secrets, all in env vars
- [ ] **Input Validation**: All user inputs validated
- [ ] **SQL Injection**: All queries parameterized
- [ ] **XSS**: User content sanitized
- [ ] **CSRF**: Protection enabled
- [ ] **Authentication**: Proper token handling
- [ ] **Authorization**: Role checks in place
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **HTTPS**: Enforced in production
- [ ] **Security Headers**: CSP, X-Frame-Options configured
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Logging**: No sensitive data logged
- [ ] **Dependencies**: Up to date, no vulnerabilities
- [ ] **Row Level Security**: Enabled in Supabase
- [ ] **CORS**: Properly configured
- [ ] **File Uploads**: Validated (size, type)
- [ ] **Wallet Signatures**: Verified (if blockchain)

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

---

**Remember**: Security is not optional. One vulnerability can compromise the entire platform. When in doubt, err on the side of caution.
