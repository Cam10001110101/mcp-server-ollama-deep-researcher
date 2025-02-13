import json

from typing_extensions import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_ollama import ChatOllama
from langgraph.graph import START, END, StateGraph

from assistant.configuration import Configuration, SearchAPI
from assistant.utils import deduplicate_and_format_sources, tavily_search, format_sources, perplexity_search
from assistant.state import SummaryState, SummaryStateInput, SummaryStateOutput
from assistant.prompts import query_writer_instructions, summarizer_instructions, reflection_instructions

# Nodes   
def generate_query(state: SummaryState, config: RunnableConfig):
    """ Generate a query for web search """
    
    try:
        # Format the prompt
        query_writer_instructions_formatted = query_writer_instructions.format(research_topic=state.research_topic)

        # Generate a query
        configurable = Configuration.from_runnable_config(config)
        llm_json_mode = ChatOllama(
            model=configurable.local_llm,
            temperature=0,
            format="json",
            base_url=configurable.ollama_base_url
        )
        result = llm_json_mode.invoke(
            [SystemMessage(content=query_writer_instructions_formatted),
            HumanMessage(content=f"Generate a query for web search:")]
        )   
        query = json.loads(result.content)
        
        return {"search_query": query['query']}
    except Exception as e:
        # If LLM fails, use the research topic as the query
        return {"search_query": state.research_topic}

def web_research(state: SummaryState, config: RunnableConfig):
    """ Gather information from the web """
    
    # Configure 
    configurable = Configuration.from_runnable_config(config)

    # Handle both cases for search_api:
    # 1. When selected in Studio UI -> returns a string (e.g. "tavily")
    # 2. When using default -> returns an Enum (e.g. SearchAPI.TAVILY)
    if isinstance(configurable.search_api, str):
        search_api = configurable.search_api
    else:
        search_api = configurable.search_api.value

    try:
        # Search the web
        if search_api == "tavily":
            search_results = tavily_search(state.search_query, include_raw_content=True, max_results=1)
            search_str = deduplicate_and_format_sources(search_results, max_tokens_per_source=1000, include_raw_content=True)
        elif search_api == "perplexity":
            search_results = perplexity_search(state.search_query, state.research_loop_count)
            search_str = deduplicate_and_format_sources(search_results, max_tokens_per_source=1000, include_raw_content=False)
        else:
            raise ValueError(f"Unsupported search API: {configurable.search_api}")
    except Exception as e:
        # If we have a running summary, continue with a note about the error
        if state.running_summary:
            error_note = f"\n\nNote: Search failed during research loop {state.research_loop_count + 1} using {search_api} API. Error: {str(e)}"
            return {
                "sources_gathered": state.sources_gathered + [f"[Search failed in loop {state.research_loop_count + 1}]"],
                "research_loop_count": state.research_loop_count + 1,
                "web_research_results": state.web_research_results + [error_note],
                "running_summary": state.running_summary + error_note
            }
        # If this is the first search and it failed, raise the error
        raise
        
    return {
        "sources_gathered": [format_sources(search_results)], 
        "research_loop_count": state.research_loop_count + 1, 
        "web_research_results": [search_str]
    }

def summarize_sources(state: SummaryState, config: RunnableConfig):
    """ Summarize the gathered sources """
    
    try:
        # Existing summary
        existing_summary = state.running_summary

        # Most recent web research
        most_recent_web_research = state.web_research_results[-1]

        # Build the human message
        if existing_summary:
            human_message_content = (
                f"<User Input> \n {state.research_topic} \n <User Input>\n\n"
                f"<Existing Summary> \n {existing_summary} \n <Existing Summary>\n\n"
                f"<New Search Results> \n {most_recent_web_research} \n <New Search Results>"
            )
        else:
            human_message_content = (
                f"<User Input> \n {state.research_topic} \n <User Input>\n\n"
                f"<Search Results> \n {most_recent_web_research} \n <Search Results>"
            )

        # Run the LLM
        configurable = Configuration.from_runnable_config(config)
        llm = ChatOllama(
            model=configurable.local_llm,
            temperature=0,
            base_url=configurable.ollama_base_url
        )
        result = llm.invoke(
            [SystemMessage(content=summarizer_instructions),
            HumanMessage(content=human_message_content)]
        )

        running_summary = result.content

        # TODO: This is a hack to remove the <think> tags w/ Deepseek models 
        # It appears very challenging to prompt them out of the responses 
        while "<think>" in running_summary and "</think>" in running_summary:
            start = running_summary.find("<think>")
            end = running_summary.find("</think>") + len("</think>")
            running_summary = running_summary[:start] + running_summary[end:]

        return {"running_summary": running_summary}
    except Exception as e:
        # If LLM fails but we have existing summary, preserve it with error note
        if existing_summary:
            error_note = f"\n\nNote: Failed to summarize new sources due to LLM error: {str(e)}"
            return {"running_summary": existing_summary + error_note}
        # If this is the first summary and LLM failed, return raw search results
        return {"running_summary": f"Research on: {state.research_topic}\n\nRaw search results:\n{most_recent_web_research}"}

def reflect_on_summary(state: SummaryState, config: RunnableConfig):
    """ Reflect on the summary and generate a follow-up query """

    try:
        # Generate a query
        configurable = Configuration.from_runnable_config(config)
        llm_json_mode = ChatOllama(
            model=configurable.local_llm,
            temperature=0,
            format="json",
            base_url=configurable.ollama_base_url
        )
        result = llm_json_mode.invoke(
            [SystemMessage(content=reflection_instructions.format(research_topic=state.research_topic)),
            HumanMessage(content=f"Identify a knowledge gap and generate a follow-up web search query based on our existing knowledge: {state.running_summary}")]
        )   
        
        try:
            follow_up_query = json.loads(result.content)
            query = follow_up_query.get('follow_up_query')
            if query:
                return {"search_query": query}
        except (json.JSONDecodeError, AttributeError):
            pass  # Fall through to fallback
            
    except Exception as e:
        # Add error note to summary before falling through to fallback
        error_note = f"\n\nNote: Failed to generate follow-up query due to LLM error: {str(e)}"
        state.running_summary += error_note

    # Fallback: Generate a simple follow-up query based on research topic
    fallback_queries = [
        f"latest developments in {state.research_topic}",
        f"important aspects of {state.research_topic}",
        f"key information about {state.research_topic}",
        f"Tell me more about {state.research_topic}"
    ]
    import random
    return {"search_query": random.choice(fallback_queries)}

def finalize_summary(state: SummaryState):
    """ Finalize the summary """
    
    # Format all accumulated sources into a single bulleted list
    all_sources = "\n".join(source for source in state.sources_gathered)
    state.running_summary = f"## Summary\n\n{state.running_summary}\n\n ### Sources:\n{all_sources}"
    return {"running_summary": state.running_summary}

def route_research(state: SummaryState, config: RunnableConfig) -> Literal["finalize_summary", "web_research"]:
    """ Route the research based on the follow-up query """

    configurable = Configuration.from_runnable_config(config)
    if state.research_loop_count <= configurable.max_web_research_loops:
        return "web_research"
    else:
        return "finalize_summary" 
    
# Add nodes and edges 
builder = StateGraph(SummaryState, input=SummaryStateInput, output=SummaryStateOutput, config_schema=Configuration)
builder.add_node("generate_query", generate_query)
builder.add_node("web_research", web_research)
builder.add_node("summarize_sources", summarize_sources)
builder.add_node("reflect_on_summary", reflect_on_summary)
builder.add_node("finalize_summary", finalize_summary)

# Add edges
builder.add_edge(START, "generate_query")
builder.add_edge("generate_query", "web_research")
builder.add_edge("web_research", "summarize_sources")
builder.add_edge("summarize_sources", "reflect_on_summary")
builder.add_conditional_edges("reflect_on_summary", route_research)
builder.add_edge("finalize_summary", END)

graph = builder.compile()
