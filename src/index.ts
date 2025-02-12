#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { spawn, ChildProcess } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(dirname(__dirname));

// Define response type
interface PythonResponse {
  summary?: string;
  error?: string;
}

// Track active research state
interface ResearchState {
  topic: string;
  currentStep: string;
  loopCount: number;
  summary: string;
  sources: string[];
}

let currentResearch: ResearchState | null = null;

// Track configuration
interface ResearchConfig {
  maxLoops: number;
  llmModel: string;
  searchApi: "perplexity" | "tavily";
}

let config: ResearchConfig = {
  maxLoops: 3,
  llmModel: "deepseek-r1:1.5b",
  searchApi: "tavily"
};

// Initialize server
const server = new Server(
  {
    name: "ollama-deep-researcher",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        method: "tools/list"
      }
    }
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "research",
      description: "Research a topic using web search and LLM synthesis",
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The topic to research"
          }
        },
        required: ["topic"],
      },
    },
    {
      name: "get_status",
      description: "Get the current status of any ongoing research",
      inputSchema: {
        type: "object",
        properties: {
          _dummy: {
            type: "string",
            description: "No parameters needed",
            const: "dummy"
          }
        },
        required: ["_dummy"],
        additionalProperties: false
      } as const,
    },
    {
      name: "configure",
      description: "Configure the research parameters (max loops, LLM model, search API)",
      inputSchema: {
        type: "object",
        properties: {
          maxLoops: {
            type: "number",
            description: "Maximum number of research loops (1-5)"
          },
          llmModel: {
            type: "string",
            description: "Ollama model to use (e.g. llama3.2)"
          },
          searchApi: {
            type: "string",
            enum: ["perplexity", "tavily"],
            description: "Search API to use for web research"
          }
        },
        required: [],
      },
    },
  ];

  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "research": {
      const topic = request.params.arguments?.topic as string | undefined;
      if (!topic) {
        return {
          content: [
            {
              type: "text",
              text: "Research topic is required",
            },
          ],
          isError: true,
        };
      }

      try {
        // Use Python from virtual environment directly
        const pythonPath: string = process.platform === "win32" 
          ? `${projectRoot}\\venv\\Scripts\\python.exe`
          : `${projectRoot}/.venv/bin/python`;

        // Run the research script with arguments
        const pythonProcess: ChildProcess = spawn(pythonPath, [
          `${projectRoot}/src/assistant/run_research.py`,
          topic,
          config.maxLoops.toString(),
          config.llmModel,
          config.searchApi
        ], {
          cwd: projectRoot,
          env: {
            ...process.env,  // Pass through existing environment variables
            PYTHONUNBUFFERED: "1"  // Ensure Python output is not buffered
          }
        });

        // Collect output using Promise
        const output = await new Promise<string>((resolve, reject) => {
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
            reject(error);
          });

          pythonProcess.on("close", (code: number) => {
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
              reject(new Error(`Failed to parse output: ${stdout}\nError: ${e}\nStderr: ${stderr}`));
            }
          });
        });

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
              type: "text",
              text: `Research completed. Summary:\n\n${output}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to start research: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get_status": {
      if (!currentResearch) {
        return {
          content: [
            {
              type: "text",
              text: "No research is currently in progress.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
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

    case "configure": {
      const newConfig = request.params.arguments;
      let configMessage = '';

      if (newConfig && Object.keys(newConfig).length > 0) {
        // Type guard to ensure properties match ResearchConfig
        const validatedConfig: Partial<ResearchConfig> = {};
        if (typeof newConfig.maxLoops === 'number') {
          validatedConfig.maxLoops = newConfig.maxLoops;
        }
        if (typeof newConfig.llmModel === 'string') {
          validatedConfig.llmModel = newConfig.llmModel;
        }
        if (newConfig.searchApi === 'perplexity' || newConfig.searchApi === 'tavily') {
          validatedConfig.searchApi = newConfig.searchApi;
        }
        
        config = {
          ...config,
          ...validatedConfig
        };
        configMessage = 'Research configuration updated:';
      } else {
        configMessage = 'Current research configuration:';
      }

      return {
        content: [
          {
            type: "text",
            text: `${configMessage}
Max Loops: ${config.maxLoops}
LLM Model: ${config.llmModel}
Search API: ${config.searchApi}`,
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${request.params.name}`,
          },
        ],
        isError: true,
      };
  }
});

// Initialize and run the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Ollama Deep Researcher MCP Server running on stdio");
