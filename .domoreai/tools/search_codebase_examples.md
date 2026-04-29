# search_codebase Tool Documentation

## Overview
The `search_codebase` tool performs semantic search over the project's codebase using vector embeddings stored in the database. This allows you to find relevant code snippets, documentation, or implementations based on natural language queries.

## Purpose
Use this tool when you need to:
- Find code examples of specific functionality
- Locate where certain features are implemented
- Search for documentation or comments
- Discover similar code patterns
- Understand how certain APIs or libraries are used in the project

## Input Schema
```typescript
{
  query: string;        // Natural language search query
  limit?: number;       // Optional: Max results to return (default: 5)
}
```

## Examples

### Example 1: Finding Authentication Code
```typescript
// Search for authentication implementation
const authResults = await search_codebase({
  query: "user authentication and login flow",
  limit: 3
});

console.log(authResults);
// Returns relevant code chunks with file paths and similarity scores
```

### Example 2: Finding Database Queries
```typescript
// Find examples of database queries
const dbResults = await search_codebase({
  query: "prisma database queries for user data",
  limit: 5
});

// Process results
dbResults.split('---').forEach(chunk => {
  console.log('Found relevant code:', chunk);
});
```

### Example 3: API Endpoint Discovery
```typescript
// Locate API endpoint definitions
const apiResults = await search_codebase({
  query: "REST API endpoints for roles and permissions"
});

// The results include file paths and similarity scores
```

### Example 4: Finding Configuration
```typescript
// Search for configuration files
const configResults = await search_codebase({
  query: "environment variables and configuration setup",
  limit: 10
});
```

## Return Format
The tool returns a string containing search results formatted as:
```
File: /path/to/file.ts
Similarity: 0.8542
Content:
[Code chunk content]
---
File: /path/to/another/file.ts
Similarity: 0.7891
Content:
[Another code chunk]
---
```

## Best Practices

1. **Be Specific**: Use detailed queries for better results
   - ❌ "database"
   - ✅ "database connection pool configuration"

2. **Use Natural Language**: The tool understands context
   - "How to hash passwords"
   - "React component for displaying user profiles"
   - "Error handling in API routes"

3. **Adjust Limit**: Start with 5 results, increase if needed
   ```typescript
   await search_codebase({ query: "...", limit: 10 })
   ```

4. **Process Results**: Parse the formatted output
   ```typescript
   const results = await search_codebase({ query: "..." });
   const chunks = results.split('---').filter(Boolean);
   chunks.forEach(chunk => {
     // Extract file path, similarity, and content
     const [file, similarity, ...content] = chunk.split('\n');
     // Process each result
   });
   ```

## Notes

- Results are ranked by semantic similarity
- The tool searches pre-embedded code chunks
- Similarity scores range from 0 to 1 (higher is better)
- Results include file paths for easy navigation
- This is particularly useful for large codebases where grep/find might miss contextually similar code

## Common Use Cases

### Understanding New Codebase
```typescript
// Learn how a feature works
const results = await search_codebase({
  query: "websocket connection handling and message routing"
});
```

### Finding Examples
```typescript
// Find usage examples of a library
const examples = await search_codebase({
  query: "examples of using the trpc router with mutations"
});
```

### Debugging
```typescript
// Find error handling patterns
const errorHandling = await search_codebase({
  query: "try catch error handling and logging"
});
```

### Refactoring
```typescript
// Find all places using a specific pattern
const usages = await search_codebase({
  query: "direct database access without service layer",
  limit: 20
});
```
