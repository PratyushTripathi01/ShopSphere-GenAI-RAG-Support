document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const chatForm = document.getElementById("chatForm");
    const questionInput = document.getElementById("questionInput");
    const sendBtn = document.getElementById("sendBtn");
    const messagesContainer = document.getElementById("messagesContainer");
    const quickChips = document.getElementById("quickChips");
    const btnClearChat = document.getElementById("btnClearChat");
    const btnIngest = document.getElementById("btnIngest");
    const mobileToggle = document.getElementById("mobileToggle");
    const sidebar = document.getElementById("sidebar");
    const bannerNotice = document.getElementById("bannerNotice");
    const bannerText = document.getElementById("bannerText");
    const btnCloseBanner = document.getElementById("btnCloseBanner");
    const modalOverlay = document.getElementById("modalOverlay");
    const modalTitle = document.getElementById("modalTitle");
    const modalDescription = document.getElementById("modalDescription");
    const modalIcon = document.getElementById("modalIcon");
    const modalActions = document.getElementById("modalActions");
    const btnModalClose = document.getElementById("btnModalClose");
    const progressBarFill = document.getElementById("progressBarFill");

    // Professional SVG icons
    const ICONS = {
        assistant: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>`,
        user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
        welcome: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
        sync: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    };

    // Fetch initial status
    fetchSystemStatus();

    // Mobile Sidebar Toggle
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 900 &&
                !sidebar.contains(e.target) &&
                !mobileToggle.contains(e.target) &&
                sidebar.classList.contains("open")) {
                sidebar.classList.remove("open");
            }
        });
    }

    // Banner close
    if (btnCloseBanner) {
        btnCloseBanner.addEventListener("click", () => {
            bannerNotice.style.display = "none";
        });
    }

    // Modal Close
    if (btnModalClose) {
        btnModalClose.addEventListener("click", () => {
            modalOverlay.style.display = "none";
        });
    }

    // Quick Chips
    if (quickChips) {
        quickChips.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;
            const query = chip.getAttribute("data-query");
            if (query) {
                questionInput.value = query;
                submitQuestion(query);
            }
        });
    }

    // Clear Chat
    if (btnClearChat) {
        btnClearChat.addEventListener("click", () => {
            messagesContainer.innerHTML = `
                <div class="welcome-card">
                    <div class="welcome-icon">${ICONS.welcome}</div>
                    <h2>Welcome to ShopSphere Support</h2>
                    <p>I am your Generative AI assistant trained strictly on official ShopSphere policies. I provide accurate answers for returns, refunds, order tracking, shipping, and exchanges.</p>
                    <div class="rag-pill">
                        <span class="rag-badge">RAG Architecture</span>
                        <small>Pinecone Vector Store + OpenAI Embeddings</small>
                    </div>
                </div>
            `;
            questionInput.focus();
        });
    }

    // Ingest Knowledge Base
    if (btnIngest) {
        btnIngest.addEventListener("click", async () => {
            showModal({
                title: "Indexing Knowledge Base",
                description: "Reading policy PDFs, chunking tokens, generating OpenAI embeddings, and storing vectors in Pinecone...",
                icon: ICONS.sync,
                inProgress: true
            });

            try {
                const res = await fetch("/api/v1/ingest", { method: "POST" });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.error || "Ingestion failed");
                }

                showModal({
                    title: "Ingestion Successful",
                    description: `${data.message || "All chunks indexed into Pinecone."}\nIndexed ${data.details?.chunkCount || 0} chunks across ${data.details?.fileCount || 0} documents.`,
                    icon: ICONS.success,
                    inProgress: false
                });

                fetchSystemStatus();
            } catch (err) {
                showModal({
                    title: "Ingestion Error",
                    description: err.message || "Could not complete vector ingestion.",
                    icon: ICONS.error,
                    inProgress: false
                });
            }
        });
    }

    // Submit Chat Form
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = questionInput.value.trim();
        if (!text) return;
        submitQuestion(text);
    });

    async function submitQuestion(question) {
        questionInput.value = "";
        questionInput.disabled = true;
        sendBtn.disabled = true;

        // Render User Message
        appendMessage({
            role: "user",
            text: question,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });

        // Render Typing Indicator
        const typingElem = appendTypingIndicator();
        scrollToBottom();

        try {
            const res = await fetch("/api/v1/query?question=" + encodeURIComponent(question));
            const data = await res.json();

            typingElem.remove();

            if (!res.ok) {
                appendMessage({
                    role: "assistant",
                    text: data.error || "Sorry, an error occurred while searching knowledge base.",
                    isError: true,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                });
            } else {
                appendMessage({
                    role: "assistant",
                    text: data.answer || "I could not find relevant company information.",
                    sources: data.sources || [],
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                });
            }
        } catch (error) {
            typingElem.remove();
            appendMessage({
                role: "assistant",
                text: "Unable to reach the customer support service. Please ensure the server is running and API keys are set in .env.",
                isError: true,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            });
        } finally {
            questionInput.disabled = false;
            sendBtn.disabled = false;
            questionInput.focus();
            scrollToBottom();
        }
    }

    function appendMessage({ role, text, sources = [], isError = false, time }) {
        const wrapper = document.createElement("div");
        wrapper.className = `message-wrapper ${role}`;

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.innerHTML = role === "assistant" ? ICONS.assistant : ICONS.user;

        const bubble = document.createElement("div");
        bubble.className = "bubble";

        const content = document.createElement("div");
        content.className = "message-text";
        content.innerHTML = formatMarkdown(text);
        bubble.appendChild(content);

        // Sources list
        if (sources && sources.length > 0) {
            const sourcesDiv = document.createElement("div");
            sourcesDiv.className = "message-sources";
            sourcesDiv.innerHTML = `<span class="source-label">Policy Sources:</span>`;
            sources.forEach((src) => {
                const chip = document.createElement("span");
                chip.className = "source-chip";
                chip.innerHTML = `${ICONS.document}<span>${src}</span>`;
                sourcesDiv.appendChild(chip);
            });
            bubble.appendChild(sourcesDiv);
        }

        // Meta (time & copy button)
        const meta = document.createElement("div");
        meta.className = "message-meta";
        meta.innerHTML = `
            <span>${time || ""}</span>
            ${role === "assistant" && !isError ? '<button class="copy-btn">Copy</button>' : ""}
        `;

        if (role === "assistant" && !isError) {
            const copyBtn = meta.querySelector(".copy-btn");
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(text);
                copyBtn.textContent = "Copied!";
                setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
            });
        }

        bubble.appendChild(meta);
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);

        messagesContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function appendTypingIndicator() {
        const wrapper = document.createElement("div");
        wrapper.className = "message-wrapper assistant";
        wrapper.innerHTML = `
            <div class="avatar">${ICONS.assistant}</div>
            <div class="bubble">
                <div class="typing-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <small style="color: var(--text-muted); margin-left: 8px;">Searching Pinecone vector knowledge base...</small>
            </div>
        `;
        messagesContainer.appendChild(wrapper);
        return wrapper;
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatMarkdown(text) {
        if (!text) return "";
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Bold **text**
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Bullet lists
        escaped = escaped.replace(/^l\s+(.*)$/gm, "<li>$1</li>");
        escaped = escaped.replace(/^-\s+(.*)$/gm, "<li>$1</li>");
        escaped = escaped.replace(/^\*\s+(.*)$/gm, "<li>$1</li>");

        return escaped;
    }

    async function fetchSystemStatus() {
        try {
            const res = await fetch("/api/v1/status");
            const data = await res.json();

            if (data.ready === false && data.missingKeys?.length > 0) {
                bannerText.innerHTML = `<strong>Configuration required:</strong> Missing <code>${data.missingKeys.join(", ")}</code>. Please set them in your <code>.env</code> file.`;
                bannerNotice.style.display = "flex";
            } else {
                bannerNotice.style.display = "none";
            }

            if (data.knowledgeBase?.files) {
                const countBadge = document.getElementById("docCountBadge");
                if (countBadge) countBadge.textContent = `${data.knowledgeBase.files.length} PDFs`;
            }

            if (data.pinecone?.index) {
                const idxElem = document.getElementById("pineconeIndexName");
                if (idxElem) idxElem.textContent = data.pinecone.index;
            }
            if (data.pinecone?.namespace) {
                const nsElem = document.getElementById("pineconeNamespace");
                if (nsElem) nsElem.textContent = data.pinecone.namespace;
            }
            if (data.models?.chat) {
                const modelElem = document.getElementById("chatModelName");
                if (modelElem) modelElem.textContent = data.models.chat;
            }
        } catch {
            // Ignore fetch status failures on initial load
        }
    }

    function showModal({ title, description, icon, inProgress }) {
        modalTitle.textContent = title;
        modalDescription.textContent = description;
        if (typeof icon === "string" && icon.startsWith("<svg")) {
            modalIcon.innerHTML = icon;
        } else {
            modalIcon.textContent = icon || "";
        }
        progressBarFill.style.display = inProgress ? "block" : "none";
        modalActions.style.display = inProgress ? "none" : "block";
        modalOverlay.style.display = "flex";
    }
});
