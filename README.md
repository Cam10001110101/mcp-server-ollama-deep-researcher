# MCP Server: Ollama Deep Researcher

This is a Model Context Protocol (MCP) server adaptation of the [LangChain Ollama Deep Researcher](https://github.com/langchain-ai/ollama-deep-researcher). It provides the deep research capabilities as MCP tools that can be used within the model context protocol ecosystem, allowing AI assistants to perform in-depth research on topics using local LLMs via Ollama.


## Core Functionality

The server provides research tools that use any LLM hosted by [Ollama](https://ollama.com/search). Given a topic, it will:

1. Generate a web search query
2. Gather web search results via [Tavily](https://www.tavily.com/) or [Perplexity API](https://www.perplexity.ai/hub/faq/pplx-api)
3. Summarize the search results
4. Reflect on the summary to examine knowledge gaps
5. Generate new search queries to address the gaps
6. Iteratively improve the summary through multiple research cycles
7. Provide a final markdown summary with all sources used


![research-rabbit](https://github.com/user-attachments/assets/4308ee9c-abf3-4abb-9d1e-83e7c2c3f187)



## 🚀 Setup

1. Download and install [Ollama](https://ollama.com/download) for your platform.


2. Clone this repository:
```bash
git clone https://github.com/yourusername/mcp-server-ollama-deep-researcher.git
cd mcp-server-ollama-deep-researcher
npm install
npm run build
```


3. Pull a local LLM from [Ollama](https://ollama.com/search). For example:
```bash
ollama pull deepseek-r1:8b
```


4. Select a web search tool and get an API key:

* [Tavily API](https://tavily.com/) (default)
* [Perplexity API](https://www.perplexity.ai/hub/blog/introducing-the-sonar-pro-api)


5. Add the MCP server configuration to your settings:

For VSCode:
- `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

For Claude desktop app:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`


```json
{
  "mcpServers": {
    "ollama-deep-researcher": {
      "command": "node",
      "args": ["C:/path/to/your/clone/mcp-server-ollama-deep-researcher/build/index.js"],
      "env": {
        "TAVILY_API_KEY": "tvly-xxxxx",      // Or use PERPLEXITY_API_KEY
        "OLLAMA_MODEL": "deepseek-r1:1.5b"     // Optional, defaults to llama3.2
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```


## How it works

The research process is inspired by [IterDRAG](https://arxiv.org/html/2410.04343v1#:~:text=To%20tackle%20this%20issue%2C%20we,used%20to%20generate%20intermediate%20answers.). This approach decomposes a query into sub-queries, retrieves documents for each one, answers the sub-query, and then builds on the answer by retrieving docs for the second sub-query. 

The process works as follows:

- Given a user-provided topic, use a local LLM (via [Ollama](https://ollama.com/search)) to generate a web search query
- Uses a search engine (configured for [Tavily](https://www.tavily.com/)) to find relevant sources
- Uses LLM to summarize the findings from web search related to the user-provided research topic
- Then, it uses the LLM to reflect on the summary, identifying knowledge gaps
- It generates a new search query to address the knowledge gaps
- The process repeats, with the summary being iteratively updated with new information from web search
- It will repeat down the research rabbit hole 
- Runs for a configurable number of iterations


## Outputs

The output is a markdown file containing the research summary, with citations to all sources used during the research process.


All sources gathered during research are preserved and can be referenced in the final output:

![Screenshot 2024-12-05 at 4 08 59 PM](https://github.com/user-attachments/assets/e8ac1c0b-9acb-4a75-8c15-4e677e92f6cb)


The final summary includes comprehensive research findings:

![Screenshot 2024-12-05 at 4 10 11 PM](https://github.com/user-attachments/assets/f6d997d5-9de5-495f-8556-7d3891f6bc96)
