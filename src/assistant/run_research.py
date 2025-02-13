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
        print(json.dumps({'error': str(e)}), flush=True)

if __name__ == '__main__':
    main()
