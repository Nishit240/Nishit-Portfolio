const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const menuIcon = document.querySelector(".menu-icon");
const navLinks = document.querySelector(".nav-links");
menuIcon.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

// -----------------------------
// Determine API URL dynamically
// -----------------------------
const API_URL =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:8000/chat"
        : "https://portfolio-56h0.onrender.com/chat"; // <-- Replace with your Render URL if different

// const API_URL = "http://127.0.0.1:8000/chat"; 


// -----------------------------
// Helper: Escape HTML (for safety)
// -----------------------------
function escapeHtml(text) {
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
// Send Button Click Event
// -----------------------------
sendBtn.addEventListener("click", async () => {
    const message = userInput.value.trim();
    if (!message) return;

    // 1️⃣ Append User Message
    const userMessage = document.createElement("div");
    userMessage.classList.add("message-row", "user-row");
    userMessage.innerHTML = `
        <div class="message user">${escapeHtml(message)}</div>
        <span class="avatar user-avatar">
            <img src="image/programmer.png" alt="User" />
        </span>
    `;
    chatMessages.appendChild(userMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    userInput.value = "";

    // 2️⃣ Add Typing Animation
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

    // 3️⃣ Send message to API
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: message })
        });

        const data = await response.json();

        // Remove typing animation
        chatMessages.removeChild(typingNode);

        // 4️⃣ Append Bot Message
        const botMessage = document.createElement("div");
        botMessage.classList.add("message-row", "bot-row");
        botMessage.innerHTML = `
            <span class="avatar bot-avatar">
                <img src="image/technical-support.png" alt="Bot" />
            </span>
            <div class="message bot">${data.answer}</div>
        `;
        chatMessages.appendChild(botMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (err) {
        console.error("Error:", err);
        chatMessages.removeChild(typingNode);

        // Error message
        const errorMsg = document.createElement("div");
        errorMsg.classList.add("message-row", "bot-row");
        errorMsg.innerHTML = `
            <span class="avatar bot-avatar">
                <img src="image/technical-support.png" alt="Bot" />
            </span>
            <div class="message bot error">⚠️ Unable to connect. Please try again.</div>
        `;
        chatMessages.appendChild(errorMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// -----------------------------
// Send message with Enter key
// -----------------------------
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

