// Configuration
const AGENT_URL = 'http://localhost:8000';

// DOM Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusElement = document.getElementById('status');

// State
let conversationId = null;
let isProcessing = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isProcessing) {
            sendMessage();
        }
    });

    sendButton.addEventListener('click', () => {
        if (!isProcessing) {
            sendMessage();
        }
    });
});

// Add message to UI
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Basic markdown-like formatting
    content = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');

    contentDiv.innerHTML = content;
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';

    typingDiv.appendChild(indicator);
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return typingDiv;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Update status
function updateStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'status error' : 'status';
}

// Send message to agent
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Disable input
    isProcessing = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    updateStatus('Sending message...');

    // Add user message to UI
    addMessage('user', message);
    messageInput.value = '';

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    try {
        // Prepare request payload in AG-UI format
        const payload = {
            messages: [
                {
                    role: "user",
                    content: message
                }
            ]
        };

        if (conversationId) {
            payload.conversationId = conversationId;
        }

        // Send message to AG-UI endpoint
        const response = await fetch(`${AGENT_URL}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Remove typing indicator
        removeTypingIndicator();

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = null;
        let currentContent = '';

        updateStatus('Receiving response...');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();

                    if (data === '[DONE]') {
                        continue;
                    }

                    try {
                        const event = JSON.parse(data);

                        // Handle AG-UI protocol events
                        if (event.type === 'RUN_STARTED') {
                            // Run started, store IDs if needed
                            if (event.threadId) conversationId = event.threadId;
                            updateStatus('Agent thinking...');
                        } else if (event.type === 'TEXT_MESSAGE_START') {
                            // Start of a new message
                            if (!assistantMessage) {
                                assistantMessage = addMessage('assistant', '');
                                currentContent = '';
                            }
                        } else if (event.type === 'TEXT_MESSAGE_CONTENT') {
                            // Append delta to current content
                            if (!assistantMessage) {
                                assistantMessage = addMessage('assistant', event.delta || '');
                                currentContent = event.delta || '';
                            } else {
                                currentContent += event.delta || '';
                                const contentDiv = assistantMessage.querySelector('.message-content');
                                contentDiv.innerHTML = formatContent(currentContent);
                            }
                        } else if (event.type === 'TEXT_MESSAGE_END') {
                            // Message complete
                            updateStatus('Ready to chat');
                        } else if (event.type === 'RUN_FINISHED') {
                            // Run completed
                            updateStatus('Ready to chat');
                        } else if (event.type === 'RUN_ERROR') {
                            throw new Error(event.message || 'Unknown error occurred');
                        } else if (event.type === 'TOOL_CALL_START' || event.type === 'TOOL_CALL_ARGS' || event.type === 'TOOL_CALL_END') {
                            // Tool calls - we can show these in the future
                            console.log('Tool call:', event);
                        }

                        // Scroll to bottom
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    } catch (e) {
                        console.error('Error parsing SSE data:', e, 'Data:', data);
                    }
                }
            }
        }

        updateStatus('Ready to chat');
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        addMessage('system', `Error: ${error.message}. Make sure the agent is running at ${AGENT_URL}`);
        updateStatus('Error occurred', true);
    } finally {
        // Re-enable input
        isProcessing = false;
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Format content with basic markdown-like syntax
function formatContent(content) {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}
