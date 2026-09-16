# Go Project Rules

## Reading Documentation

CRITICAL: When you need to read documentation about a specific go package, method, or function, use `go doc` to find the relevant documentation. This will help you understand the context and purpose of the code.

Instructions:

- Use the `go doc` command to find documentation for a specific package, method, or function
- Use the `go help` command to find documentation for a specific command or flag
- Use the `go doc -all` command to find documentation for all packages in your project
- Use the `go doc -cmd` command to find documentation for all commands in your project
- Use the `go doc -src` command to find documentation for all packages in your project

## Code Linting

CRITICAL: When you need to lint your code, use the `go vet` command to check for common code issues. This will help you maintain code quality.

Instructions:

- Use the `go vet` command to check for common code issues
- Use the `go vet -printfuncs=Infof` command to check for common code issues and print the issues to the console
- Use the `go vet -printfuncs=Errorf` command to check for common code issues and print the issues to the console

## Code Coverage

CRITICAL: When you need to measure code coverage, use the `go test -cover` command to run tests with code coverage. This will help you ensure that your code is covered by tests.

Instructions:

- Use the `cover` bash function to run tests with code coverage and generate a coverage report.

```bash
cover () {
        local t=$(mktemp -t coverage.out.XXXXXX) 
        trap 'rm -f "$t"' EXIT
        echo "Running: go test $COVERFLAGS -coverprofile=$t $@"
        if go test $COVERFLAGS -coverprofile="$t" "$@" 2> /dev/null
        then
                go tool cover -func="$t"
        else
                echo "Tests failed or no test files found."
        fi
}
```

## Code Benchmarking

CRITICAL: When you need to benchmark your code, use the `go test -bench` command to run benchmarks for your code. This will help you measure the performance of your code.

Instructions:

- Use the `go test -bench` command to run benchmarks for your code
- Use the `go test -bench=.` command to run benchmarks for your code and print the results to the console
- Use the `go test -bench=. -benchmem` command to run benchmarks for your code and print the results to the console with memory usage information
