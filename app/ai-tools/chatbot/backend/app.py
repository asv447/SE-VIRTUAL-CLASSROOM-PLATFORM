# Save as api_server.py
from flask import Flask, request, jsonify
import traceback
from flask_cors import CORS
from dotenv import load_dotenv
import os
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend


def initialize_llm(api_key: str, model: str = "llama-3.3-70b-versatile", temperature: float = 0.7):
    return ChatGroq(
        groq_api_key=api_key,
        model_name=model,
        temperature=temperature
    )


def create_prompt_template():
    template = """You are an expert assistant specializing in providing detailed, well-formatted answers.

Topic: {topic}
Question: {question}

Please provide a comprehensive and detailed answer to the question about the given topic. 
Structure your response with:
1. A brief introduction to contextualize the answer
2. Main content with clear explanations
3. Relevant examples or illustrations where appropriate
4. Key takeaways or summary points

Make sure your answer is:
- Accurate and informative
- Well-organized and easy to read
- Detailed but concise
- Properly formatted with clear sections

Answer:"""

    return ChatPromptTemplate.from_template(template)


@app.route('/api/ask', methods=['POST'])
def ask_question():
    try:
        data = request.json
        print("Received data:", data)
        topic = data.get('topic')
        question = data.get('question')

        if not topic or not question:
            return jsonify({'error': 'Topic and question are required'}), 400

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({'error': 'API key not configured'}), 500

        llm = initialize_llm(api_key)
        prompt = create_prompt_template()
        output_parser = StrOutputParser()
        chain = prompt | llm | output_parser

        answer = chain.invoke({
            "topic": topic,
            "question": question
        })

        return jsonify({
            'success': True,
            'answer': answer,
            'topic': topic,
            'question': question
        })

    except Exception as e:
        print("🔥 ERROR in /api/ask route:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    # 👇 this actually runs your Flask server
    app.run(host='0.0.0.0', port=5000)
