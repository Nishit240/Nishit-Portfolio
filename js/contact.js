// -----------------------------
// Determine API URL dynamically
// -----------------------------
const API_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8000"
        : "https://portfolio-56h0.onrender.com"; // <-- Replace with your Render URL if different


const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const menuIcon = document.querySelector(".menu-icon");
const navLinks = document.querySelector(".nav-links");
menuIcon.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});


// const API_URL = "http://127.0.0.1:8000"; 
const CHAT_API_URL = `${API_URL}/chat`;
const AUTOCOMPLETE_API_URL = `${API_URL}/autocomplete`;

// -----------------------------
// Create autocomplete box (dropdown)
// -----------------------------
let autocompleteBox = document.createElement("div");
autocompleteBox.id = "autocomplete-box";
autocompleteBox.classList.add("autocomplete-box");
userInput.parentNode.appendChild(autocompleteBox);

// -----------------------------
// Helper: Escape HTML
// -----------------------------
function escapeHtml(text) {
    if (!text) return "";
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// -----------------------------
// Append message helper
// -----------------------------
function appendUserMessage(text) {
    const userMessage = document.createElement("div");
    userMessage.classList.add("message-row", "user-row");
    userMessage.innerHTML = `
        <div class="message user">${escapeHtml(text)}</div>
        <span class="avatar user-avatar">
            <img src="image/programmer.png" alt="User" />
        </span>
    `;
    chatMessages.appendChild(userMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendBotMessage(html) {
    const botMessage = document.createElement("div");
    botMessage.classList.add("message-row", "bot-row");
    botMessage.innerHTML = `
        <span class="avatar bot-avatar">
            <img src="image/technical-support.png" alt="Bot" />
        </span>
        <div class="message bot">${html}</div>
    `;
    chatMessages.appendChild(botMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Attach click handlers for suggestion chips inside THIS bot message
    botMessage.querySelectorAll(".suggestion-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
            const q = btn.getAttribute("data-question");
            userInput.value = q;
            sendMessage(q); // auto-send on click
        });
    });
}

// -----------------------------
// Typing bubble
// -----------------------------
function showTyping() {
    const typingNode = document.createElement("div");
    typingNode.classList.add("message-row", "bot-row");
    typingNode.innerHTML = `
        <span class="avatar bot-avatar">
            <img src="image/technical-support.png" alt="Bot" />
        </span>
        <div class="message bot typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>
    `;
    chatMessages.appendChild(typingNode);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingNode;
}

// -----------------------------
// Autocomplete (input suggestions)
// -----------------------------
let autocompleteTimer = null;

async function fetchAutocomplete(prefix) {
    try {
        const res = await fetch(`${AUTOCOMPLETE_API_URL}?prefix=${encodeURIComponent(prefix)}`);
        const data = await res.json();
        const suggestions = data.suggestions || [];

        if (!suggestions.length) {
            autocompleteBox.style.display = "none";
            autocompleteBox.innerHTML = "";
            return;
        }

        autocompleteBox.innerHTML = suggestions
            .map((q) => `<div class="autocomplete-item">${escapeHtml(q)}</div>`)
            .join("");

        autocompleteBox.style.display = "block";

        // Attach click listeners
        autocompleteBox.querySelectorAll(".autocomplete-item").forEach((item) => {
            item.addEventListener("click", () => {
                const q = item.textContent;
                userInput.value = q;
                autocompleteBox.style.display = "none";
                autocompleteBox.innerHTML = "";
                userInput.focus();
            });
        });
    } catch (err) {
        console.error("Autocomplete error:", err);
    }
}

// Trigger autocomplete when typing
userInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (autocompleteTimer) clearTimeout(autocompleteTimer);

    if (!val || val.length < 2) {
        autocompleteBox.style.display = "none";
        autocompleteBox.innerHTML = "";
        return;
    }

    autocompleteTimer = setTimeout(() => {
        fetchAutocomplete(val);
    }, 250); // debounce
});

// Hide autocomplete when clicking outside
document.addEventListener("click", (e) => {
    if (!autocompleteBox.contains(e.target) && e.target !== userInput) {
        autocompleteBox.style.display = "none";
    }
});

// -----------------------------
// Main send message function
// -----------------------------
async function sendMessage(forcedText = null) {
    const message = forcedText !== null ? forcedText.trim() : userInput.value.trim();
    if (!message) return;

    // Hide autocomplete
    autocompleteBox.style.display = "none";
    autocompleteBox.innerHTML = "";

    // 1️⃣ Append User Message
    appendUserMessage(message);
    userInput.value = "";

    // 2️⃣ Typing animation
    const typingNode = showTyping();

    // 3️⃣ Call backend
    try {
        const response = await fetch(CHAT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: message })
        });

        const data = await response.json();
        chatMessages.removeChild(typingNode);

        // Data expected:
        // data.answer (HTML)
        // data.corrected_question
        // data.suggested_questions = [{question, confidence},...]

        let botHtml = "";

        // ✏️ Spelling correction notice
        if (
            data.corrected_question &&
            data.corrected_question.toLowerCase().trim() !== message.toLowerCase().trim()
        ) {
            botHtml += `
                <div class="corrected-note">
                    ✏️ Showing results for: <b>${escapeHtml(data.corrected_question)}</b><br>
                    <small>You typed: "${escapeHtml(message)}"</small>
                </div>
                <br>
            `;
        }

        // Main answer
        botHtml += data.answer || "I’m not sure how to answer that.";

        // 🔍 Suggested questions
        if (data.suggested_questions && data.suggested_questions.length > 0) {
            botHtml += `<div class="suggestions-title">You may also ask:</div><div class="suggestions-wrap">`;

            data.suggested_questions.forEach((sug) => {
                const qText = typeof sug === "string" ? sug : sug.question;
                botHtml += `
                    <button class="suggestion-chip" data-question="${escapeHtml(qText)}">
                        ${escapeHtml(qText)}
                    </button>
                `;
            });

            botHtml += `</div>`;
        }

        appendBotMessage(botHtml);
    } catch (err) {
        console.error("Error:", err);
        chatMessages.removeChild(typingNode);

        const errorHtml = `
            <div class="message bot error">
                ⚠️ Unable to connect. Please try again.
            </div>
        `;
        appendBotMessage(errorHtml);
    }
}

// -----------------------------
// Send Button Click Event
// -----------------------------
sendBtn.addEventListener("click", () => sendMessage());

// -----------------------------
// Send message with Enter key
// -----------------------------
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});
