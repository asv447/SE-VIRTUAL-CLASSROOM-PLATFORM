# Save as app.py
from flask import Flask, request, jsonify
import traceback
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import re

from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow frontend access


# ------------------------------
# Helpers
# ------------------------------
def initialize_llm(api_key: str, model: str = "llama-3.3-70b-versatile", temperature: float = 0.8):
    return ChatGroq(
        groq_api_key=api_key,
        model_name=model,
        temperature=temperature
    )

def try_extract_json(text: str):
    """
    Tries to robustly extract the first JSON object from an LLM response
    (handles ```json fences or leading/trailing text).
    """
    # Remove fenced code block markers if present
    text = re.sub(r"```(?:json)?", "", text).strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except Exception:
        pass

    # Fallback: grab substring between first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end+1]
        try:
            return json.loads(candidate)
        except Exception:
            pass

    # Give up
    raise ValueError("Could not parse JSON from model output.")


# ------------------------------
# PROMPTS
# ------------------------------
def answer_prompt():
    template = """
You are an expert assistant who gives detailed and easy-to-understand answers.

Topic: {topic}
Question: {question}

Give a structured explanation with:
- Introduction  
- Main explanation  
- Example(s)  
- Summary  

Use Markdown formatting.
Answer:
"""
    return ChatPromptTemplate.from_template(template)


def quiz_prompt():
    # DOUBLE CURLY BRACES to avoid LangChain treating "questions" etc. as variables
    template = """
You are a quiz generator AI.

Generate EXACTLY 5 multiple-choice questions (easy–medium) about this topic:
Topic: {topic}

Return ONLY valid JSON in this exact format (no extra text, no markdown):

{{
  "questions": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    }}
  ]
}}

Rules:
- Each question must be unique.
- The "correctIndex" MUST be an integer 0..3 corresponding to options A..D.
- Do NOT include explanations.
- Do NOT include anything outside the JSON object.
"""
    return ChatPromptTemplate.from_template(template)


# ------------------------------
# ROUTES
# ------------------------------
@app.route('/api/ask', methods=['POST'])
def ask_question():
    try:
        data = request.json
        topic = data.get("topic")
        question = data.get("question")

        if not topic or not question:
            return jsonify({"error": "Topic and question are required"}), 400

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({"error": "API key not configured"}), 500

        llm = initialize_llm(api_key, temperature=0.6)
        prompt = answer_prompt()
        chain = prompt | llm | StrOutputParser()

        answer = chain.invoke({"topic": topic, "question": question})

        return jsonify({"answer": answer})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    try:
        data = request.json
        topic = data.get("topic")

        if not topic:
            return jsonify({"error": "Topic is required"}), 400

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({"error": "API key not configured"}), 500

        llm = initialize_llm(api_key, temperature=0.9)

        prompt = quiz_prompt()
        chain = prompt | llm | StrOutputParser()
        raw = chain.invoke({"topic": topic})

        quiz_json = try_extract_json(raw)

        # Basic validation/sanitization
        if "questions" not in quiz_json or not isinstance(quiz_json["questions"], list):
            raise ValueError("Invalid quiz JSON: missing 'questions' array.")

        cleaned = []
        for q in quiz_json["questions"][:5]:
            question = q.get("question", "").strip()
            options = q.get("options", [])
            correct = q.get("correctIndex", None)

            if not question or not isinstance(options, list) or len(options) != 4:
                continue
            if not isinstance(correct, int) or not (0 <= correct <= 3):
                continue

            cleaned.append({
                "question": question,
                "options": [str(o) for o in options],
                "correctIndex": int(correct)
            })

        if len(cleaned) != 5:
            raise ValueError("Model did not return 5 valid questions. Try again.")

        return jsonify({"quiz": {"questions": cleaned}})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    # For local dev
    app.run(host="0.0.0.0", port=5000)
