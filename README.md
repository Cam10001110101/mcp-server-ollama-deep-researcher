# Ollama Deep Researcher DXT Extension

## Overview

**Ollama Deep Researcher** is a Desktop Extension (DXT) that enables advanced topic research using web search and LLM synthesis, powered by a local MCP server. It supports configurable research parameters, status tracking, and resource access, and is designed for seamless integration with the DXT ecosystem.

- **Research any topic** using web search APIs (Tavily, Perplexity, Exa) and LLMs (Ollama, DeepSeek, etc.)
- **Configure** max research loops, LLM model, and search API
- **Track status** of ongoing research
- **Access research results** as resources via MCP protocol

## Features

- Implements the MCP protocol over stdio for local, secure operation
- Defensive programming: error handling, timeouts, and validation
- Logging and debugging via stderr
- Compatible with DXT host environments

## Directory Structure

```
.
├── manifest.json         # DXT manifest (see MANIFEST.md for spec)
├── src/
│   ├── index.ts         # MCP server entrypoint (Node.js, stdio transport)
│   └── assistant/       # Python research logic
│       └── run_research.py
├── README.md            # This documentation
└── ...
```

## Installation & Setup

1. **Clone the repository** and install dependencies:
   ```sh
   git clone <your-repo-url>
   cd mcp-server-ollama-deep-researcher
   npm install
   ```

2. **Install Python dependencies** for the assistant:
   ```sh
   cd src/assistant
   pip install -r requirements.txt
   # or use pyproject.toml/uv if preferred
   ```

3. **Set required environment variables** for web search APIs:
   - For Tavily: `TAVILY_API_KEY`
   - For Perplexity: `PERPLEXITY_API_KEY`
   - For Exa: `EXA_API_KEY` (Get yours at https://dashboard.exa.ai/api-keys)
   - Example:
     ```sh
     export TAVILY_API_KEY=your_tavily_key
     export PERPLEXITY_API_KEY=your_perplexity_key
     export EXA_API_KEY=your_exa_key
     ```

4. **Build the TypeScript server** (if needed):
   ```sh
   npm run build
   ```

5. **Run the extension locally for testing:**
   ```sh
   node dist/index.js
   # Or use the DXT host to load the extension per DXT documentation
   ```

## Usage

- **Research a topic:**
  - Use the `research` tool with `{ "topic": "Your subject" }`
- **Get research status:**
  - Use the `get_status` tool
- **Configure research parameters:**
  - Use the `configure` tool with any of: `maxLoops`, `llmModel`, `searchApi`

## Manifest

See `manifest.json` for the full DXT manifest, including tool schemas and resource templates. Follows [DXT MANIFEST.md](https://github.com/anthropics/dxt/blob/main/MANIFEST.md).

## Logging & Debugging

- All server logs and errors are output to `stderr` for debugging.
- Research subprocesses are killed after 5 minutes to prevent hangs.
- Invalid requests and configuration errors return clear, structured error messages.

## Security & Best Practices

- All tool schemas are validated before execution.
- API keys are required for web search APIs and are never logged.
- MCP protocol is used over stdio for local, secure communication.

## Testing & Validation

- Validate the extension by loading it in a DXT-compatible host.
- Ensure all tool calls return valid, structured JSON responses.
- Check that the manifest loads and the extension registers as a DXT.

## Troubleshooting

- **Missing API key:** Ensure `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, or `EXA_API_KEY` is set in your environment depending on which search API you're using.
- **Python errors:** Check Python dependencies and logs in `stderr`.
- **Timeouts:** Research subprocesses are limited to 5 minutes.

## Search API Comparison

- **Tavily:** Fast, comprehensive web search with raw content extraction
- **Perplexity:** AI-powered search with natural language summaries and citations
- **Exa:** Neural search engine optimized for semantic search with highlights

## References

- [DXT Architecture Overview](https://github.com/anthropics/dxt/blob/main/README.md)
- [DXT Manifest Spec](https://github.com/anthropics/dxt/blob/main/MANIFEST.md)
- [DXT Example Extensions](https://github.com/anthropics/dxt/tree/main/examples)
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)

---

