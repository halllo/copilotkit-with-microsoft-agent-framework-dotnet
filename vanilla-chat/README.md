# Vanilla JS Chat Client for AG-UI

A simple vanilla JavaScript chat interface to communicate with the Microsoft Agent Framework AG-UI endpoint.

## Features

- Clean, modern chat interface
- Real-time streaming responses using Server-Sent Events (SSE)
- Conversation state management
- Typing indicators
- Error handling
- Responsive design

## Prerequisites

- Your Microsoft Agent Framework agent must be running at `http://localhost:8000`
- A modern web browser with JavaScript enabled

## Running the Chat Client

### Option 1: Using Python's Built-in Server

```bash
cd vanilla-chat
python -m http.server 3000
```

Then open your browser to: `http://localhost:3000`

### Option 2: Using Node.js http-server

```bash
cd vanilla-chat
npx http-server -p 3000 --cors
```

Then open your browser to: `http://localhost:3000`

### Option 3: Using Live Server (VS Code Extension)

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 4: Direct File Open

Simply open `index.html` directly in your browser. Note: You may need to configure CORS on the agent server for this to work.

## Starting the Agent

Make sure your agent is running before using the chat client:

```bash
cd agent
dotnet run
```

The agent should be available at `http://localhost:8000`.

## Usage

1. Start the agent backend (must be running at `http://localhost:8000`)
2. Open the chat interface in your browser
3. Type a message and press Enter or click "Send"
4. The agent will respond with streaming text

## Example Messages

Try these example messages:

- "Add a proverb: A bird in the hand is worth two in the bush"
- "Show me all proverbs"
- "What's the weather in Seattle?"
- "Set proverbs to: Time flies when you're having fun, Practice makes perfect"

## Architecture

- **index.html**: The main HTML structure and styling
- **chat.js**: Handles communication with the AG-UI endpoint
  - Sends POST requests to `/` with JSON payload: `{"messages": [{"role": "user", "content": "..."}]}`
  - Processes AG-UI protocol Server-Sent Events (SSE) streaming responses
  - Handles events: RUN_STARTED, TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END, RUN_FINISHED, RUN_ERROR
  - Manages conversation state and UI updates

## Customization

To change the agent endpoint URL, edit the `AGENT_URL` constant in `chat.js`:

```javascript
const AGENT_URL = 'http://localhost:8000';
```

## AG-UI Protocol

The chat client communicates using the AG-UI protocol:

### Request Format
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ]
}
```

### Response Events (Server-Sent Events)
- `RUN_STARTED`: Agent execution begins
- `TEXT_MESSAGE_START`: New assistant message starts
- `TEXT_MESSAGE_CONTENT`: Message content chunk (contains `delta` field)
- `TEXT_MESSAGE_END`: Message complete
- `TOOL_CALL_START/ARGS/END`: Tool execution events
- `RUN_FINISHED`: Agent execution complete
- `RUN_ERROR`: Error occurred

## Troubleshooting

### CORS Errors

CORS has been configured in the agent `Program.cs`. If you still see CORS errors, verify these lines are present:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// After var app = builder.Build();
app.UseCors("AllowAll");
```

### Agent Not Responding

- Verify the agent is running: `curl http://localhost:8000`
- Check the browser console for error messages
- Ensure the port number matches in both the agent and `chat.js`

## License

MIT
