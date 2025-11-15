# Minimal Flask backend for AI Bubble (port 5001)
# - Enforces educational-only queries (simple keyword check)
# - Instructs the LLM to respond concisely (1-2 short sentences)

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import traceback
import re

# LangChain Groq LLM
try:
    from langchain_groq import ChatGroq
    from langchain.prompts import ChatPromptTemplate
    from langchain.schema.output_parser import StrOutputParser
except Exception:
    # If langchain packages not installed, the server will still start but will return error on /api/ask
    ChatGroq = None
    ChatPromptTemplate = None
    StrOutputParser = None

load_dotenv()

app = Flask(__name__)
CORS(app)

# ------------------------- Helpers -------------------------
EDU_KEYWORDS = [
    'math', 'history', 'physics', 'chemistry', 'biology', 'algebra', 'calculus', 'programming',
    'computer', 'literature', 'grammar', 'english', 'geography', 'economics', 'statistics',
    'geometry', 'writing', 'science', 'school', 'homework', 'exam', 'assignment', 'lesson', 'study'
]


def is_educational(text: str) -> bool:
    if not text:
        return False
    t = text.lower()
    for k in EDU_KEYWORDS:
        if k in t:
            return True
    return False


def initialize_llm(api_key: str, model: str = "openai/gpt-oss-20b", temperature: float = 0.2):
    if ChatGroq is None:
        raise RuntimeError("langchain_groq is not installed in this environment")
    return ChatGroq(groq_api_key=api_key, model_name=model, temperature=temperature)


# Prompt instructing short answers
def concise_prompt():
    template = """
You are an expert teaching assistant. Answer the user's question concisely and directly in 1-2 short sentences. Use plain clear language suitable for students. If the question is outside education (not related to school, learning, subjects, homework, or study), politely refuse with: "I'm only able to help with educational questions."

Topic: {topic}
Question: {question}

Answer (1-2 short sentences):
"""
    return ChatPromptTemplate.from_template(template)


# ------------------------- Routes -------------------------
@app.route('/api/ask', methods=['POST'])
def ask_question():
    try:
        data = request.json or {}
        topic = data.get('topic', '')
        question = data.get('question', '')

        if not question:
            return jsonify({'error': 'Question is required'}), 400

        # Server-side educational filter (can be disabled with ALLOW_NON_EDU)
        allow_non_edu = os.environ.get('ALLOW_NON_EDU', 'true').lower() == 'true'
        if not allow_non_edu:
            if not is_educational(topic + ' ' + question):
                return jsonify({'answer': "I'm only able to help with educational questions. Please ask a question related to school, learning, or a specific subject."}), 200

        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            return jsonify({'error': 'GROQ_API_KEY is not configured'}), 500

        # Initialize LLM and call
        llm = initialize_llm(api_key, temperature=0.2)
        prompt = concise_prompt()
        chain = prompt | llm | StrOutputParser()

        answer = chain.invoke({'topic': topic or 'Education', 'question': question})

        # Trim and ensure short
        short = re.sub(r"\s+", ' ', (answer or '').strip())
        # Fallback: if longer than 2 sentences, keep first two
        parts = re.findall(r'[^.!?]+[.!?]?', short)
        if parts and len(parts) > 2:
            short = ' '.join([p.strip() for p in parts[:2]])

        return jsonify({'answer': short})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    # Run on port 5001 by default for AI Bubble
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port)
