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
   - Optional: `LANGSMITH_API_KEY`, `LANGSMITH_TRACING=true`, `OLLAMA_BASE_URL` (defaults to `http://localhost:11434`)
   - Example:
     ```sh
     export TAVILY_API_KEY=your_tavily_key
     export PERPLEXITY_API_KEY=your_perplexity_key
     export EXA_API_KEY=your_exa_key
     ```
   - **Prefer not to keep plaintext keys on disk?** See [Optional: secure secrets with 1Password](#optional-secure-secrets-with-1password) below.

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

## Optional: secure secrets with 1Password

If you use [1Password](https://1password.com), you can keep plaintext API keys off your disk and out of your AI coding agent's context. This is **opt-in and additive** — the plaintext setup above keeps working unchanged. Prerequisites: 1Password for Mac or Linux, the `op` CLI (`brew install --cask 1password-cli`), and `sqlite3`.

Create **one** 1Password Environment holding these eight variables (the four keys are secret; the rest are non-secret config):

| Variable | Secret? |
|---|---|
| `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `EXA_API_KEY`, `LANGSMITH_API_KEY` | yes |
| `OLLAMA_BASE_URL`, `LANGSMITH_TRACING`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT` | no |

You can import an existing `.env` directly when creating the Environment. Once it exists, choose any of the three mechanisms below (A is the AI-coding pattern; B is 1Password's recommended MCP launch; C is a fallback for hosts that can't run `op`).

### A. Mounted `.env` + validation hook (keeps plaintext out of the LLM context)

1Password Environments mount a local `.env` as a UNIX named pipe (FIFO): contents are streamed on demand to authorized readers and **never stored on disk**. A Claude Code `PreToolUse` hook validates the mount before the agent runs shell commands.

1. In the 1Password desktop app, open your Environment → **Destinations → Local `.env` file → Choose file path → `.env` → Mount**. Verify with `cat .env` (approves via Touch ID; auth lasts until 1Password locks).
2. `.1password/environments.toml` (committed) tells the hook which paths to validate — already set to `mount_paths = [".env"]`.
3. Install the validation hook locally:
   ```sh
   git clone https://github.com/1Password/agent-hooks /tmp/agent-hooks
   /tmp/agent-hooks/install.sh --agent claude-code --target-dir .
   ```
   This creates `.claude/claude-code-1password-hooks-bundle/` and `.claude/settings.json` (both gitignored). The hook is **fail-open**: if 1Password or `sqlite3` is unavailable it allows execution, so non-1Password contributors are unaffected.
4. Test it: `echo '{"command":"echo test","workspace_roots":["'"$PWD"'"]}' | .claude/claude-code-1password-hooks-bundle/bin/run-hook.sh 1password-validate-mounted-env-files` → `{"permission":"allow"}` while unlocked, `deny` with fix instructions when locked.

### B. `op run --environment` for the MCP server launch

Copy `.mcp.json.1password.example` → `.mcp.json` (gitignored), replace `<ENVIRONMENT_ID>` with your Environment ID, and your MCP host will resolve secrets at launch via `op run`. Non-secret config stays in the `env` block; secrets are injected from the Environment. The template uses the full path `/opt/homebrew/bin/op` because GUI-launched hosts (e.g. Claude Desktop) don't inherit your shell `$PATH` — adjust if your `op` lives elsewhere (`which op`).

### C. `op inject` template for `.mcp.json`

For MCP hosts that can't use `op run`, copy `.mcp.json.template` → a working file, replace `<vault>` with your vault name, then materialize the `{{ op://... }}` references into real values:

```sh
op inject -i .mcp.json.template -o .mcp.json
```

`op inject` writes the output with filemode `0600`. `.mcp.json` is gitignored. Recompile after rotating secrets in 1Password. (Requires `op` CLI with standard item/vault support; the `op run --environment` form in option B additionally requires 1Password Environments beta.)

### Docker

`docker-compose.yml` interpolates all eight vars from the environment. With the mounted `.env` FIFO, run:

```sh
op run --env-file .env -- docker compose up
```

so the FIFO is read and the values are forwarded into the container.

## References

- [DXT Architecture Overview](https://github.com/anthropics/dxt/blob/main/README.md)
- [DXT Manifest Spec](https://github.com/anthropics/dxt/blob/main/MANIFEST.md)
- [DXT Example Extensions](https://github.com/anthropics/dxt/tree/main/examples)
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)

---

