# Agentic AI Canvas

An intelligent learning platform that leverages multiple AI agents to help users learn, research, and understand complex topics through various interactive methods.

## Architecture

### Frontend (React + TypeScript)

- Built with React + Vite
- Key Components:
  - **Agent Renders**: Specialized components for different types of AI responses
  - **UI Components**: Custom-styled components using Tailwind CSS and Shad CN
  - **Authentication**: JWT-based auth system with protected routes

### Backend (FastAPI + LangChain)

- Built with FastAPI and LangChain
- Core Components:
  - **Agent System**: Multiple specialized AI agents using GPT-4o
  - **Tavily Integration**: Tool so agents can search the web to back up their answers
  - **Session Management**: Maintains conversation context
  - **File Processing**: Handles document uploads and processing

## Agent Processing Flow

1. **Input Processing**:

   - User selects an agent type (research, diagram, flashcards, etc.)
   - Input is sent to backend with session context

2. **Agent Execution**:

   ```python
   # Each agent follows this general pattern:
   - Initialize with specific tools (e.g., TavilySearch)
   - Process input through LangChain
   - Generate structured output based on agent type
   - Each agent has a scratchpad for working through the request, and specially designed output formats and prompts
   ```

3. **Response Handling**:
   - Responses are formatted according to agent type
   - Frontend renders response using specialized components
   - Maintains conversation history for context

## Local Development Setup

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm

### Setup

1.

```
npm run setup:all
```

2. Get .envs and set .env in frontend and backend folders

3.

```
npm run dev
```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Available Agents

1. **Research Agent**

   - Conducts web research using Tavily
   - Provides cited sources and structured findings

2. **Diagram Agent**

   - Creates Mermaid diagrams
   - Includes explanations and rationale

3. **Flashcard Agent**

   - Generates interactive study cards
   - Includes study tips and organization

4. **Step-by-Step Agent**

   - Breaks down complex topics into a step by step guide on how to solve a specific problem
   - Provides detailed explanations

5. **Note Agent**

   - Creates comprehensive notes
   - Includes formulas and key concepts

6. **Feynman Agent**
   - Simplifies complex topics
   - Uses analogies and examples
