import json
import sys
import warnings
from assistant.graph import graph

# Filter out warnings so they don't interfere with JSON output
warnings.filterwarnings('ignore')

def main():
    try:
        topic = sys.argv[1]
        max_loops = int(sys.argv[2])
        llm_model = sys.argv[3]
        search_api = sys.argv[4]

        result = graph.invoke(
            {'research_topic': topic}, 
            {'configurable': {
                'max_web_research_loops': max_loops, 
                'local_llm': llm_model, 
                'search_api': search_api
            }}
        )
        # Ensure we're writing to stderr for logs and stdout for JSON only
        print(json.dumps({'summary': result.get('running_summary', 'No summary available')}), flush=True)
    except Exception as e:
        # Try to extract any partial results from the graph state
        try:
            partial_result = graph.get_state()
            summary = partial_result.get('running_summary', '')
            if summary:
                print(json.dumps({
                    'summary': f"{summary}\n\nNote: Research process ended early due to error: {str(e)}",
                    'error': str(e)
                }), flush=True)
                return
        except:
            pass
        # If we couldn't get partial results, just return the error
        print(json.dumps({'error': str(e)}), flush=True)

if __name__ == '__main__':
    main()
