#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { spawn, ChildProcess } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

// JSON-RPC error code for "Resource not found" per MCP spec 2025-11-25
const RESOURCE_NOT_FOUND = -32002;

// Define response type
interface PythonResponse {
  summary?: string;
  error?: string;
}

// Track completed research results
interface ResearchResult {
  topic: string;
  summary: string;
  sources: string[];
  timestamp: string;
}

const researchResults: Map<string, ResearchResult> = new Map();

// Track active research state
interface ResearchState {
  topic: string;
  currentStep: string;
  loopCount: number;
  summary: string;
  sources: string[];
}

let currentResearch: ResearchState | null = null;

// Helper to generate URI-safe topic name
function topicToUri(topic: string): string {
  return encodeURIComponent(topic.toLowerCase().replace(/\s+/g, '-'));
}

// Track configuration
interface ResearchConfig {
  maxLoops: number;
  llmModel: string;
  searchApi: "perplexity" | "tavily" | "exa";
}

let config: ResearchConfig = {
  maxLoops: 7,
  llmModel: "gemma4:31b",
  searchApi: "perplexity"
};

// Validate required API keys based on search API
function validateApiKeys(searchApi: string): void {
  if (searchApi === "tavily" && !process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is required when using Tavily search API");
  }
  if (searchApi === "perplexity" && !process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is required when using Perplexity search API");
  }
  if (searchApi === "exa" && !process.env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is required when using Exa search API");
  }
}

// Initialize server
const server = new McpServer({
  name: "ollama-deep-researcher",
  title: "Ollama Deep Researcher",
  version: "1.0.0",
  description: "Deep research on any topic using Ollama LLMs with web search (Tavily, Perplexity, Exa)"
});

server.registerTool(
  "research",
  {
    description: "Research a topic using web search and LLM synthesis",
    inputSchema: {
      topic: z.string().describe("The topic to research")
    }
  },
  async ({ topic }) => {
    try {
      // Validate API keys before starting research
      validateApiKeys(config.searchApi);

      // In Docker the image installs dependencies with pip and has no uv,
      // so run python3 directly; locally use uv to get the project venv.
      const isDocker = process.env.DOCKER_CONTAINER === "true";
      const scriptPath = isDocker
        ? "/app/src/assistant/run_research.py"
        : join(__dirname, "..", "src", "assistant", "run_research.py").replace(/\\/g, "/");
      const [command, baseArgs] = isDocker
        ? ["python3", [] as string[]]
        : ["uv", ["run", "python"]];

      const pythonProcess: ChildProcess = spawn(command, [
        ...baseArgs,
        scriptPath,
        topic,
        config.maxLoops.toString(),
        config.llmModel,
        config.searchApi
      ], {
        env: {
          ...process.env,  // Pass through existing environment variables
          PYTHONUNBUFFERED: "1",  // Ensure Python output is not buffered
          PYTHONPATH: isDocker ? "/app/src" : join(__dirname, "..", "src").replace(/\\/g, "/"),  // Add src directory to Python path
          TAVILY_API_KEY: process.env.TAVILY_API_KEY || "",  // Ensure API key is passed to Python process
          PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || "",  // Ensure API key is passed to Python process
          EXA_API_KEY: process.env.EXA_API_KEY || ""  // Ensure API key is passed to Python process
        },
        cwd: isDocker ? "/app" : join(__dirname, "..").replace(/\\/g, "/")  // Set working directory
      });

      // Collect output using Promise with 30 minute timeout
      // (larger models like gemma4:31b can take ~6 minutes per research loop)
      const output = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pythonProcess.kill();
          reject(new Error('Research process timed out after 30 minutes'));
        }, 1800000); // 30 minutes
        let stdout = '';
        let stderr = '';

        if (pythonProcess.stdout) {
          pythonProcess.stdout.on("data", (data: Buffer) => {
            const output = data.toString().trim();
            if (output) {
              stdout += output;
              console.error(`[research] ${output}`);
            }
          });
        }
        if (pythonProcess.stderr) {
          pythonProcess.stderr.on("data", (data: Buffer) => {
            const error = data.toString().trim();
            if (error) {
              stderr += error;
              console.error(`[research error] ${error}`);
            }
          });
        }

        pythonProcess.on("error", (error: Error) => {
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        pythonProcess.on("close", (code: number) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}. Error: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout.trim()) as PythonResponse;
            if (result.error) {
              reject(new Error(result.error));
            } else if (result.summary) {
              resolve(result.summary);
            } else {
              resolve('No summary available');
            }
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e}\nStdout: ${stdout}\nStderr: ${stderr}`));
          }
        });
      });

      // Store completed research result
      const result: ResearchResult = {
        topic,
        summary: output,
        sources: [],
        timestamp: new Date().toISOString()
      };
      researchResults.set(topicToUri(topic), result);
      // Notify clients that the resource list has a new entry
      server.sendResourceListChanged();

      // Update research state
      currentResearch = {
        topic,
        currentStep: "completed",
        loopCount: config.maxLoops,
        summary: output,
        sources: []
      };

      return {
        content: [
          {
            type: "text" as const,
            text: `Research completed. Summary:\n\n${output}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Research failed: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_status",
  {
    description: "Get the current status of any ongoing research",
    inputSchema: {}
  },
  async () => {
    if (!currentResearch) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No research is currently in progress.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Research Status:
Topic: ${currentResearch.topic}
Current Step: ${currentResearch.currentStep}
Loop Count: ${currentResearch.loopCount}
Summary: ${currentResearch.summary}
Sources: ${currentResearch.sources.join("\n")}`,
        },
      ],
    };
  }
);

server.registerTool(
  "configure",
  {
    description: "Configure the research parameters (max loops, LLM model, search API)",
    inputSchema: {
      maxLoops: z.number().min(1).max(10).optional()
        .describe("Maximum number of research loops (1-10)"),
      llmModel: z.string().optional()
        .describe("Ollama model to use (e.g. gemma4:31b)"),
      searchApi: z.enum(["perplexity", "tavily", "exa"]).optional()
        .describe("Search API to use for web research")
    }
  },
  async ({ maxLoops, llmModel, searchApi }) => {
    const hasUpdates = maxLoops !== undefined || llmModel !== undefined || searchApi !== undefined;
    let configMessage = 'Current research configuration:';

    if (hasUpdates) {
      try {
        // Validate API key for new search API before applying it
        if (searchApi !== undefined) {
          validateApiKeys(searchApi);
        }

        config = {
          ...config,
          ...(maxLoops !== undefined && { maxLoops }),
          ...(llmModel !== undefined && { llmModel }),
          ...(searchApi !== undefined && { searchApi })
        };
        configMessage = 'Research configuration updated:';
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Configuration error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${configMessage}
Max Loops: ${config.maxLoops}
LLM Model: ${config.llmModel}
Search API: ${config.searchApi}`,
        },
      ],
    };
  }
);

// Research results as resources: research://{topic}
// The template's list callback enumerates completed results; the read
// callback serves an individual result. Results are keyed by
// topicToUri(topic), which is already URI-encoded.
server.registerResource(
  "research",
  new ResourceTemplate("research://{topic}", {
    list: async () => ({
      resources: Array.from(researchResults.entries()).map(([uri, result]) => ({
        uri: `research://${uri}`,
        name: result.topic,
        description: `Research results for "${result.topic}" from ${new Date(result.timestamp).toLocaleString()}`,
        mimeType: "application/json"
      }))
    })
  }),
  {
    title: "Research Results by Topic",
    description: "Access research results for a specific topic",
    mimeType: "application/json"
  },
  async (uri, { topic }) => {
    const key = Array.isArray(topic) ? topic[0] : topic;
    const result = researchResults.get(key);

    if (!result) {
      throw new McpError(
        RESOURCE_NOT_FOUND,
        "Resource not found",
        { uri: uri.href }
      );
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Initialize and run the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Ollama Deep Researcher MCP Server running on stdio");
