import os
from dataclasses import dataclass, fields
from typing import Any, Optional, Union

from langchain_core.runnables import RunnableConfig
from dataclasses import dataclass

from enum import Enum

class SearchAPI(Enum):
    PERPLEXITY = "perplexity"
    TAVILY = "tavily"
    EXA = "exa"

@dataclass
class Configuration:
    """The configurable fields for the research assistant."""
    # Required fields with defaults
    max_web_research_loops: int = 7
    local_llm: str = "kimi-k2-thinking:cloud"
    ollama_base_url: str = "http://localhost:11434"  # Add Ollama base URL
    search_api: SearchAPI = SearchAPI.PERPLEXITY  # Default to PERPLEXITY
    
    # API Keys
    tavily_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    exa_api_key: Optional[str] = None
    
    # LangSmith configuration
    langsmith_tracing: bool = False
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "ollama-deep-researcher-mcp-server"

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> "Configuration":
        """Create a Configuration instance from a RunnableConfig."""
        configurable = (
            config["configurable"] if config and "configurable" in config else {}
        )
        
        # First get values from environment or config
        values: dict[str, Any] = {
            f.name: os.environ.get(f.name.upper(), configurable.get(f.name))
            for f in fields(cls)
            if f.init
        }
        
        # Handle boolean conversion for langsmith_tracing
        if "langsmith_tracing" in values:
            if isinstance(values["langsmith_tracing"], str):
                values["langsmith_tracing"] = values["langsmith_tracing"].lower() == "true"
        
        # Handle search_api conversion from string to enum
        if "search_api" in values:
            if isinstance(values["search_api"], str):
                try:
                    values["search_api"] = SearchAPI(values["search_api"].lower())
                except ValueError:
                    # If invalid value, remove it to use default
                    del values["search_api"]
        
        return cls(**{k: v for k, v in values.items() if v is not None})
