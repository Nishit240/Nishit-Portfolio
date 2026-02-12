import os
import re
import json
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from rapidfuzz import fuzz

# -------------------------
# Load Dataset
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "qa_data.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    qa_data = json.load(f)

questions = [item["question"] for item in qa_data]
questions_lower = [q.lower() for q in questions]
answers = [item["answer"] for item in qa_data]

# -------------------------
# Train TF-IDF Vectorizer
# -------------------------
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(questions_lower)

# -------------------------
# Build Vocabulary for Spelling Correction
# -------------------------
VOCAB_WORDS = set()
for q in questions_lower:
    for w in re.findall(r"[a-zA-Z]+", q):
        VOCAB_WORDS.add(w)

# -------------------------
# Simple In-Memory Conversation Store
# session_id -> list of {user, bot}
# -------------------------
CONVERSATION_MEMORY: dict[str, list[dict]] = {}


# -------------------------
# FastAPI Init + CORS
# -------------------------
app = FastAPI(title="Smart QA Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # 🔒 in production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

       
# -------------------------
# Request Model
# -------------------------
class Query(BaseModel):
    question: str
    session_id: str | None = None  # for memory-based answers


# -------------------------
# Utility: Math Expression Detection
# -------------------------
# allowed characters in a math expression
MATH_ALLOWED_CHARS = set("0123456789+-*/().^×÷ %")

def is_math_expression(text: str) -> bool:
    expr = text.strip()
    if not expr:
        return False

    # must contain at least one digit
    if not any(ch.isdigit() for ch in expr):
        return False

    # must contain at least one operator or parenthesis
    if not any(ch in "+-*/^×÷%()" for ch in expr):
        return False

    # if there are letters, treat it as NOT pure math: e.g. "2x + 3"
    if re.search(r"[A-Za-z]", expr):
        return False

    # any completely weird characters -> not math
    if any(ch not in MATH_ALLOWED_CHARS for ch in expr):
        return False

    # simple parenthesis balance check
    balance = 0
    for ch in expr:
        if ch == "(":
            balance += 1
        elif ch == ")":
            balance -= 1
            if balance < 0:
                return False
    if balance != 0:
        return False

    return True



# -------------------------
# Utility: Spelling Correction
# -------------------------
def auto_correct_text(user_text: str) -> str:
    """
    Very simple word-level spell corrector using RapidFuzz over VOCAB_WORDS.
    """
    words = user_text.split()
    corrected = []

    for w in words:
        clean_w = re.sub(r"[^a-zA-Z]", "", w).lower()
        if len(clean_w) <= 2:
            corrected.append(w)
            continue

        best_word = clean_w
        best_score = 0

        for v in VOCAB_WORDS:
            score = fuzz.ratio(clean_w, v)
            if score > best_score:
                best_score = score
                best_word = v

        # If similarity >= 80, accept correction, but keep original punctuation
        if best_score >= 80 and best_word != clean_w:
            suffix = w[len(clean_w):]  # preserve "?", "." etc.
            corrected.append(best_word + suffix)
        else:
            corrected.append(w)

    return " ".join(corrected)


# -------------------------
# Utility: Get top similar questions (for suggestions/autosuggest)
# -------------------------
from rapidfuzz import fuzz

def get_top_suggestions(
    text: str,
    top_k: int = 5,
    min_confidence: float = 0.08,   # ignore very weak matches
    min_fuzzy_score: int = 30       # ignore totally unrelated strings
):
    text_clean = text.strip()
    if not text_clean:
        return []

    # TF-IDF similarity
    vec = vectorizer.transform([text_clean.lower()])
    sims = cosine_similarity(vec, X)[0]
    ranked_indices = sims.argsort()[::-1]

    suggestions = []
    seen_questions = set()

    for idx in ranked_indices:
        q = questions[idx].strip()
        sim = float(sims[idx])

        # 1) stop if similarity is too low (since list is sorted desc)
        if sim < min_confidence:
            break

        # 2) skip pure numbers like "1", "2", "8"
        if q.isdigit():
            continue

        # 3) skip if exactly same as user text (case-insensitive)
        if q.lower() == text_clean.lower():
            continue

        # 4) skip duplicates
        if q.lower() in seen_questions:
            continue

        # 5) optional fuzzy check (to avoid totally unrelated strings)
        fuzzy_score = fuzz.partial_ratio(text_clean.lower(), q.lower())
        if fuzzy_score < min_fuzzy_score:
            continue

        suggestions.append({
            "question": q,
            "confidence": sim
        })
        seen_questions.add(q.lower())

        if len(suggestions) >= top_k:
            break

    return suggestions


# -------------------------
# Utility: Add to memory
# -------------------------
def add_to_memory(session_id: str, user_q: str, bot_ans: str):
    if not session_id:
        return
    history = CONVERSATION_MEMORY.setdefault(session_id, [])
    history.append({"user": user_q, "bot": bot_ans})
    # keep only last 20 entries
    if len(history) > 20:
        history[:] = history[-20:]


# -------------------------
# Root endpoint
# -------------------------
@app.get("/")
def root():
    return {
        "message": "Welcome to my Portfolio."
    }


# -------------------------
# Autocomplete Endpoint (for UI auto-complete)
# -------------------------
@app.get("/autocomplete")
def autocomplete(prefix: str = "", limit: int = 10):
    """
    Simple autocomplete: returns questions that start with the given prefix,
    plus some fuzzy matches if prefix is short.
    """
    prefix_l = prefix.lower().strip()
    if not prefix_l:
        return {"suggestions": []}

    starts_with = [q for q in questions if q.lower().startswith(prefix_l)]

    if len(starts_with) < limit:
        extra = []
        for q in questions:
            if q in starts_with:
                continue
            score = fuzz.partial_ratio(prefix_l, q.lower())
            if score >= 70:
                extra.append(q)
        starts_with.extend(extra)

    return {"suggestions": starts_with[:limit]}


# -------------------------
# Chat endpoint
# -------------------------
@app.post("/chat")
def chat(query: Query):
    original_input = query.question.strip()
    session_id = query.session_id or "global"

    if not original_input:
        return {
            "answer": "Please type something so I can assist you! ✨",
            "confidence": 0.0,
            "suggested_questions": [],
            "corrected_question": original_input,
            "session_id": session_id,
        }

    # 1️⃣ Math expression
    if is_math_expression(original_input):
        try:
            expr = original_input.strip()

            # normalize symbols
            expr = expr.replace("×", "*").replace("÷", "/")

            # convert ^ to ** for exponent
            expr = re.sub(r"\s*\^\s*", "**", expr)

            # keep only safe characters
            expr = re.sub(r"[^0-9+\-*/().%* ]", "", expr)

            # safe evaluation (BODMAS handled by Python)
            result = eval(expr, {"__builtins__": None}, {})

            answer = f"The result is: {result}"
            add_to_memory(session_id, original_input, answer)
            return {
                "answer": answer,
                "confidence": 1.0,
                "suggested_questions": [],
                "corrected_question": original_input,
                "session_id": session_id,
            }
        except Exception:
            answer = "Sorry, I couldn't evaluate that expression."
            add_to_memory(session_id, original_input, answer)
            return {
                "answer": answer,
                "confidence": 0.0,
                "suggested_questions": [],
                "corrected_question": original_input,
                "session_id": session_id,
            }

    # 2️⃣ Spelling correction
    corrected_question = auto_correct_text(original_input)
    q_text = corrected_question.lower().strip()

    # 3️⃣ Memory-based requests
    if any(
        phrase in q_text
        for phrase in ["what did i ask", "my previous questions", "chat history", "history show"]
    ):
        history = CONVERSATION_MEMORY.get(session_id, [])
        if not history:
            ans = "I don't have any previous questions stored for this session yet."
        else:
            lines = []
            for i, item in enumerate(history[-5:], 1):
                lines.append(f"{i}. Q: {item['user']}<br>   A: {item['bot']}")
            ans = "Here is your recent chat history:<br><br>" + "<br><br>".join(lines)
        add_to_memory(session_id, original_input, ans)
        return {
            "answer": ans,
            "confidence": 1.0,
            "suggested_questions": [],
            "corrected_question": corrected_question,
            "session_id": session_id,
        }

    # 4️⃣ Exact match check (after correction)
    for i, q in enumerate(questions_lower):
        if q_text == q.strip():
            best_answer = answers[i].replace("\n", "<br>")
            suggestions = get_top_suggestions(q_text, top_k=3)
            add_to_memory(session_id, corrected_question, best_answer)
            return {
                "answer": best_answer,
                "confidence": 1.0,
                "suggested_questions": suggestions,
                "corrected_question": corrected_question,
                "session_id": session_id,
            }

    # 5️⃣ Semantic search using TF-IDF
    user_vec = vectorizer.transform([q_text])
    similarity = cosine_similarity(user_vec, X)
    best_idx = similarity.argmax()
    confidence = float(similarity[0][best_idx])
    best_answer = answers[best_idx]

    # 6️⃣ Fallback if low confidence
    if confidence < 0.10:
        fallback = (
            "I'm not fully sure about that. You can try asking me things like:<br>"
            "- About my projects<br>"
            "- Hello / Hi<br>"
            "- What is your name?<br>"
            "- Who created you?<br>"
            "- What are your working hours?<br>"
            "- Tell me a joke<br>"
            "- Use me as a Calculator<br>"
            "- My favorite technology<br>"
            "- Bye / Quit"
        )
        suggestions = get_top_suggestions(q_text, top_k=5)
        add_to_memory(session_id, corrected_question, fallback)
        return {
            "answer": fallback,
            "confidence": confidence,
            "suggested_questions": suggestions,
            "corrected_question": corrected_question,
            "session_id": session_id,
        }

    # 7️⃣ Normal good answer + suggestions
    best_answer_html = best_answer.replace("\n", "<br>")
    suggestions = get_top_suggestions(q_text, top_k=5)

    add_to_memory(session_id, corrected_question, best_answer_html)

    return {
        "answer": best_answer_html,
        "confidence": confidence,
        "suggested_questions": suggestions,
        "corrected_question": corrected_question,
        "session_id": session_id,
    }


# -------------------------
# Local dev entrypoint
# -------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
