# Ollama Deep Researcher MCP Server

## Overview
The Ollama Deep Researcher MCP server provides an interface for conducting deep research on topics using a combination of web search APIs (Tavily and Perplexity) and local LLM processing through Ollama. It uses langgraph for orchestrating the research workflow.

## Architecture

### Components

1. **MCP Server (TypeScript)**
   - Handles MCP protocol communication
   - Manages configuration and state
   - Coordinates with Python research module
   - Provides tools for research, status, and configuration

2. **Research Module (Python)**
   - Uses langgraph for workflow orchestration
   - Integrates with Ollama for local LLM processing
   - Handles web search through Tavily/Perplexity APIs
   - Processes and synthesizes research results

### Workflow
1. User initiates research through MCP client
2. Server validates configuration and API keys
3. Python module executes research workflow:
   - Generate search queries
   - Gather information from web
   - Synthesize results with local LLM
   - Iterate for deeper insights
4. Results are returned through MCP protocol

## Dependencies

### System Requirements
- Node.js (for running the MCP server)
- Python 3.10 or higher
- Compute (CPU/GPU) capable of running Ollama models
- At least 8GB of RAM for larger models

### TypeScript (MCP Server)
- @modelcontextprotocol/sdk
- Node.js standard libraries

### Python (Research Module)
- langgraph
- langchain-core
- langchain-ollama
- tavily-python
- pplx

Python dependencies can be installed using pip or uv:

For Windows:
```bash
# Using pip
pip install langgraph langchain-core langchain-ollama tavily-python pplx

# Or using uv (recommended)
uv pip install langgraph langchain-core langchain-ollama tavily-python pplx
```

For macOS/Linux:
```bash
# Using pip
pip3 install langgraph langchain-core langchain-ollama tavily-python pplx

# Or using uv (recommended)
uv pip install langgraph langchain-core langchain-ollama tavily-python pplx
```

## Configuration

The server is configured through the MCP client configuration file.

Required Environment Variables:
- `TAVILY_API_KEY`: For Tavily search API
- `PERPLEXITY_API_KEY`: For Perplexity search API
- `PYTHONPATH`: Path to the src directory for Python module imports
- `PYTHONUNBUFFERED`: Set to "1" to prevent Python output buffering

Example configuration for Windows:
```json
{
  "mcpServers": {
    "ollama-deep-researcher": {
      "command": "node",
      "args": ["C:\\path\\to\\build\\index.js"],
      "env": {
        "TAVILY_API_KEY": "your-tavily-key",
        "PERPLEXITY_API_KEY": "your-perplexity-key",
        "PYTHONPATH": "C:\\path\\to\\src",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

Example configuration for macOS/Linux:
```json
{
  "mcpServers": {
    "ollama-deep-researcher": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "TAVILY_API_KEY": "your-tavily-key",
        "PERPLEXITY_API_KEY": "your-perplexity-key",
        "PYTHONPATH": "/path/to/src",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

## Tools

### 1. research
Research any topic using web search and LLM synthesis.
```json
{
  "name": "research",
  "arguments": {
    "topic": "quantum computing basics"
  }
}
```

### 2. get_status
Get the current status of ongoing research.
```json
{
  "name": "get_status",
  "arguments": {
    "_dummy": "dummy"
  }
}
```

### 3. configure
Configure research parameters.
```json
{
  "name": "configure",
  "arguments": {
    "maxLoops": 3,
    "llmModel": "deepseek-r1:1.5b",
    "searchApi": "tavily"
  }
}
```

### Configuration Options

- **maxLoops**: Number of research iterations (1-5)
- **llmModel**: Ollama model to use (e.g., "deepseek-r1:1.5b", "llama3.2")
- **searchApi**: Search API to use ("perplexity" or "tavily")

## Error Handling

The server includes comprehensive error handling for:
- Missing or invalid API keys
- Python process failures
- Configuration validation
- Search API errors
- LLM processing issues

## Development

The project uses:
- TypeScript for MCP server implementation
- Python for research workflow
- uv for Python dependency management
- npm for TypeScript/Node.js management

### Building from Source

1. Ensure Node.js is properly installed and in your system PATH:
```bash
node --version  # Should display version number
```

2. Build the project:
```bash
npm run build
```

### Platform-Specific Considerations

Windows:
- Use backslashes in paths (or escape forward slashes)
- Python command is typically `python`
- Check PATH variables in System Properties

macOS/Linux:
- Use forward slashes in paths
- Python command is typically `python3`
- Set PATH in ~/.bashrc or ~/.zshrc

If you encounter "'node' is not recognized" errors:
1. Verify Node.js installation
2. Add Node.js to system PATH:
   - Windows: Edit system environment variables → Environment Variables → Path → Add Node.js installation directory
   - macOS/Linux: Usually handled by the installer
3. Restart your terminal/computer
