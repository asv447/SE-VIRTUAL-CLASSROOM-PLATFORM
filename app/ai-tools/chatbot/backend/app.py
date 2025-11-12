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
# Simple moderation / study-only guard
# ------------------------------
DISALLOWED_PATTERNS = [
    # sexual / porn / NSFW
    r"\bsex\b", r"\bporn\b", r"\bsexual\b", r"\bnude\b",
    # illegal / hacking / drugs
    r"\bhack\b", r"\bhacking\b", r"\bexplosive\b", r"\bbomb\b",
    r"\bdrug\b", r"\bdrugs\b", r"\bhow to make\b",
    # violent / weapons
    r"\bkill\b", r"\bmurder\b", r"\bweapon\b", r"\bgun\b",
    # political persuasion/targeting (basic)
    r"\bhow to vote\b", r"\bpolitic", r"\bterror",
    # dating / relationship advice (non-study)
    r"\bdating\b", r"\bhookup\b",
    # other obviously non-study topics
    r"\bcasino\b", r"\bgambling\b", r"\bcheat\b", r"\bcheating\b"
]

DISALLOWED_RE = re.compile("|".join(f"({p})" for p in DISALLOWED_PATTERNS), flags=re.IGNORECASE)


def is_disallowed(text: str) -> bool:
    if not text:
        return False
    return bool(DISALLOWED_RE.search(text))


# ------------------------------
# PROMPTS
# ------------------------------
def answer_prompt():
    template = """
You are an expert assistant who gives detailed and easy-to-understand answers about academic/study topics.
You must refuse to answer or provide help for content that is inappropriate, sexual, illegal, or non-study related.

Topic: {topic}
Question: {question}

If the topic or question is outside academic/study scope or is disallowed, respond with a short refusal message like:
"I'm sorry — I can't help with that request. I can only assist with study-related, safe and appropriate questions."

Otherwise give a structured explanation with:
- Introduction
- Main explanation
- Example(s)
- Summary

Use Markdown formatting.
Answer:
"""
    return ChatPromptTemplate.from_template(template)


def quiz_prompt():
    # NOTE: double-curly formatting used to ensure the JSON template is reproduced exactly as JSON by the model.
    template = """
You are a quiz generator AI. You must only produce study-related content. If the requested topic or grade is disallowed or non-study, refuse with a short JSON error object like:
{"error": "refused", "message": "Inappropriate or non-study topic"}

Otherwise, generate exactly {num_questions} questions about this topic at the requested grade level.

Topic: {topic}
Grade: {grade}
Quiz type: {quiz_type}  # either "mcq" or "tf"
Number of questions: {num_questions}

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
- If quiz_type == "mcq": each question must have exactly 4 options and correctIndex must be 0..3.
- If quiz_type == "tf": each question must have exactly 2 options and they must be ["True", "False"] (in that order). correctIndex must be 0 or 1.
- Questions must be unique and appropriate for the given grade.
- Do NOT include explanations or anything outside the JSON object.
"""
    return ChatPromptTemplate.from_template(template)


# ------------------------------
# ROUTES
# ------------------------------
@app.route('/api/ask', methods=['POST'])
def ask_question():
    try:
        data = request.json or {}
        topic = (data.get("topic") or "").strip()
        question = (data.get("question") or "").strip()

        if not topic or not question:
            return jsonify({"error": "Topic and question are required"}), 400

        # quick server-side moderation
        if is_disallowed(topic) or is_disallowed(question):
            return jsonify({"error": "Request refused: inappropriate or non-study content"}), 400

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({"error": "API key not configured"}), 500

        llm = initialize_llm(api_key, temperature=0.6)
        prompt = answer_prompt()
        chain = prompt | llm | StrOutputParser()

        answer = chain.invoke({"topic": topic, "question": question})

        # extra safety: if model somehow returns refusal string, pass it through
        if "can't help" in (answer or "").lower() or "i'm sorry" in (answer or "").lower():
            return jsonify({"answer": answer})

        return jsonify({"answer": answer})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    try:
        data = request.json or {}
        topic = (data.get("topic") or "").strip()
        quiz_type = (data.get("quizType") or data.get("quiz_type") or "mcq").lower()
        grade = (data.get("grade") or "Grade 9").strip()
        num_questions = int(data.get("numQuestions") or data.get("num_questions") or 5)

        # Validate inputs
        if not topic:
            return jsonify({"error": "Topic is required"}), 400
        if quiz_type not in ("mcq", "tf"):
            return jsonify({"error": "quizType must be 'mcq' or 'tf'"}), 400
        if num_questions <= 0 or num_questions > 20 or num_questions % 5 != 0:
            return jsonify({"error": "numQuestions must be one of 5,10,15,20 (max 20)"}), 400

        # quick server-side moderation
        if is_disallowed(topic) or is_disallowed(grade):
            return jsonify({"error": "Request refused: inappropriate or non-study content"}), 400

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({"error": "API key not configured"}), 500

        # choose temperature depending on type
        temp = 0.9 if quiz_type == "mcq" else 0.6
        llm = initialize_llm(api_key, temperature=temp)

        prompt = quiz_prompt()
        chain = prompt | llm | StrOutputParser()
        raw = chain.invoke({
            "topic": topic,
            "grade": grade,
            "quiz_type": quiz_type,
            "num_questions": num_questions
        })

        # If model returned a JSON-like refusal object, try parse
        try:
            parsed_raw = json.loads(raw)
            if parsed_raw.get("error"):
                return jsonify({"error": parsed_raw.get("message", "refused by model")}), 400
        except Exception:
            # not JSON; continue to extract
            pass

        quiz_json = try_extract_json(raw)

        # Basic validation/sanitization
        if "questions" not in quiz_json or not isinstance(quiz_json["questions"], list):
            raise ValueError("Invalid quiz JSON: missing 'questions' array.")

        cleaned = []
        for q in quiz_json["questions"][:num_questions]:
            question = q.get("question", "")
            options = q.get("options", [])
            correct = q.get("correctIndex", None)

            if not isinstance(question, str) or not question.strip():
                continue

            # For mcq require 4 options, for tf require exactly ["True","False"]
            if quiz_type == "mcq":
                if not isinstance(options, list) or len(options) != 4:
                    continue
                if not isinstance(correct, int) or not (0 <= correct <= 3):
                    continue
                cleaned.append({
                    "question": question.strip(),
                    "options": [str(o).strip() for o in options],
                    "correctIndex": int(correct)
                })
            else:  # tf
                # Accept either explicit ["True","False"] or model might return ["True","False"] exactly
                if not isinstance(options, list) or len(options) != 2:
                    continue
                normalized = [str(o).strip() for o in options]
                # enforce True/False order (we'll coerce to ["True","False"])
                tf_opts = ["True", "False"]
                # Determine correctIndex mapping
                try:
                    # If model used True/False exactly
                    if [o.lower() for o in normalized] == ["true", "false"]:
                        if not isinstance(correct, int) or not (0 <= correct <= 1):
                            continue
                        cleaned.append({
                            "question": question.strip(),
                            "options": tf_opts,
                            "correctIndex": int(correct)
                        })
                    else:
                        # If model supplied synonyms like Yes/No -> try map
                        low = [o.lower() for o in normalized]
                        if "true" in low or "false" in low:
                            # find index that corresponds to "true"
                            # map model's index to our normalized tf_opts order
                            if not isinstance(correct, int) or not (0 <= correct < len(low)):
                                continue
                            chosen = low[correct]
                            mapped_index = 0 if chosen == "true" else 1 if chosen == "false" else None
                            if mapped_index is None:
                                continue
                            cleaned.append({
                                "question": question.strip(),
                                "options": tf_opts,
                                "correctIndex": mapped_index
                            })
                        else:
                            # fail if model didn't use true/false variants
                            continue
                except Exception:
                    continue

        if len(cleaned) != num_questions:
            raise ValueError(f"Model did not return {num_questions} valid questions. Try again.")

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
