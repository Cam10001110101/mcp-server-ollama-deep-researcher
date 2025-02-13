# API Documentation

This document provides detailed documentation for the MCP tools provided by the Ollama Deep Researcher server.

## Tool: configure

Configure the research parameters and preferences for the research process.

### Input Schema
```typescript
{
  type: "object",
  properties: {
    llmModel: {
      type: "string",
      description: "Ollama model to use (e.g. llama3.2, deepseek-r1:8b)",
      optional: true
    },
    maxLoops: {
      type: "number",
      description: "Maximum number of research iterations",
      minimum: 1,
      maximum: 5,
      optional: true
    },
    searchApi: {
      type: "string",
      enum: ["perplexity", "tavily"],
      description: "Search provider selection",
      optional: true
    }
  }
}
```

### Example Usage

```json
{
  "llmModel": "deepseek-r1:8b",
  "maxLoops": 3,
  "searchApi": "tavily"
}
```

### Response Schema
```typescript
{
  type: "object",
  properties: {
    success: {
      type: "boolean",
      description: "Whether configuration was successful"
    },
    config: {
      type: "object",
      properties: {
        llmModel: { type: "string" },
        maxLoops: { type: "number" },
        searchApi: { type: "string" }
      }
    }
  }
}
```

### Error Handling
- Invalid model name: Returns error with available models
- Invalid maxLoops range: Returns error with valid range
- Invalid searchApi: Returns error with supported providers
- Missing API keys: Returns error indicating missing credentials

## Tool: research

Initiates and conducts research on a specified topic using iterative refinement.

### Input Schema
```typescript
{
  type: "object",
  properties: {
    topic: {
      type: "string",
      description: "Research subject to investigate",
      required: true
    }
  }
}
```

### Example Usage

```json
{
  "topic": "AI computer use and AI native desktop applications"
}
```

### Response Schema
```typescript
{
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["completed", "error"],
      description: "Final status of research"
    },
    research_findings: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Comprehensive research findings"
        },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              title: { type: "string" },
              relevance_score: { type: "number" }
            }
          }
        },
        key_insights: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  }
}
```

### Error Handling
- Empty/invalid topic: Returns validation error
- Research timeout: Returns timeout error with partial results
- API failures: Returns error with specific API failure details
- LLM errors: Returns error with model-specific issues

## Tool: get_status

Monitors the progress of ongoing research operations.

### Input Schema
```typescript
{
  type: "object",
  properties: {
    _dummy: {
      type: "string",
      const: "dummy",
      description: "No parameters needed"
    }
  },
  required: ["_dummy"],
  additionalProperties: false
}
```

### Example Usage

```json
{
  "_dummy": "dummy"
}
```

### Response Schema
```typescript
{
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["idle", "in_progress", "completed", "error"],
      description: "Current research status"
    },
    current_loop: {
      type: "number",
      description: "Current research iteration"
    },
    total_loops: {
      type: "number",
      description: "Total planned iterations"
    },
    current_stage: {
      type: "string",
      enum: ["analyzing", "searching", "summarizing", "reflecting"],
      description: "Current research stage"
    },
    last_update: {
      type: "string",
      format: "date-time",
      description: "Timestamp of last status update"
    }
  }
}
```

### Error Handling
- No active research: Returns idle status
- Research error: Returns error status with details
- System error: Returns error with system state information

## Error Codes and Messages

The server uses standardized error codes and messages:

### Configuration Errors (1xxx)
- 1001: Invalid model configuration
- 1002: Invalid max loops configuration
- 1003: Invalid search API configuration
- 1004: Missing API credentials

### Research Errors (2xxx)
- 2001: Invalid research topic
- 2002: Research timeout
- 2003: Search API failure
- 2004: LLM processing error

### System Errors (3xxx)
- 3001: Ollama connection error
- 3002: Memory constraint error
- 3003: System timeout
- 3004: Unexpected error

## Rate Limiting and Quotas

The server implements rate limiting based on:
- Search API quotas
- LLM processing capacity
- System resources

Default limits:
- Max concurrent research tasks: 1
- Max requests per minute: 60
- Max research loops per task: 5

## Best Practices

1. **Topic Formulation**
   - Be specific and focused
   - Include key aspects to research
   - Avoid overly broad topics

2. **Configuration**
   - Match model to complexity
   - Set appropriate loop count
   - Choose suitable search API

3. **Error Handling**
   - Implement proper retries
   - Handle partial results
   - Log all errors

4. **Resource Management**
   - Monitor system resources
   - Respect rate limits
   - Handle timeouts gracefully
