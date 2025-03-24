import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/auth";
import { GeneralAgentRender } from "./agentRenders/general";
import { AGENTS } from "./centerChat";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { AgentBox } from "./centerChat";
import { NoteAgentRender } from "./agentRenders/note";
import { ResearchAgentRender } from "./agentRenders/research";
import { StepAgentRender } from "./agentRenders/step";
import { MermaidAgentRender } from "./agentRenders/mermaid";
import { FlashcardsAgentRender } from "./agentRenders/flashcards";
import { FeynmanAgentRender } from "./agentRenders/feynman";
interface Message {
  type: "human" | "ai";
  content: string;
  agent_type?: string;
}

interface ChatHistoryMessage {
  type: string;
  content: string;
}

interface UserInput {
  message: string;
  agent_type: string;
}

interface AIResponse {
  message: any;
  agent_type: string;
}

interface SessionData {
  id: string;
  user_input: UserInput[];
  ai_response: AIResponse[];
  chat_history: ChatHistoryMessage[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface ExistingChatProps {
  sessionId: string;
}

export const ExistingChat: React.FC<ExistingChatProps> = ({ sessionId }) => {
  const { user, bearerToken, isLoggedIn } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Extract fetchSessionDetails outside of useEffect so it can be reused
  const fetchSessionDetails = async () => {
    if (!bearerToken || !isLoggedIn || !sessionId) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/api/agents/get_session_details/${sessionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch session details: ${response.status}`);
      }

      const data = await response.json();
      const sessionDetails = data.sessionDetails || data;

      setSessionData(sessionDetails);

      const transformedMessages: Message[] = [];

      if (sessionDetails.user_input && sessionDetails.ai_response) {
        sessionDetails.user_input.forEach((input: UserInput, index: number) => {
          transformedMessages.push({
            type: "human",
            content: input.message,
            agent_type: input.agent_type,
          });

          if (sessionDetails.ai_response[index]) {
            const aiResponse = sessionDetails.ai_response[index];
            let content = "";

            if (typeof aiResponse.message === "string") {
              content = aiResponse.message;
            } else if (
              aiResponse.message &&
              typeof aiResponse.message === "object"
            ) {
              const responseWithoutMessages = { ...aiResponse.message };
              delete responseWithoutMessages.messages;

              if (
                aiResponse.agent_type === "general" &&
                responseWithoutMessages.answer
              ) {
                content = JSON.stringify(responseWithoutMessages, null, 2);
              } else if (
                aiResponse.agent_type === "diagram" &&
                responseWithoutMessages.diagram_code
              ) {
                content = `Diagram:\n\`\`\`mermaid\n${
                  responseWithoutMessages.diagram_code
                }\n\`\`\`\n\n${JSON.stringify(
                  {
                    interpretation: responseWithoutMessages.interpretation,
                    planning_process: responseWithoutMessages.planning_process,
                    diagram_type_rationale:
                      responseWithoutMessages.diagram_type_rationale,
                  },
                  null,
                  2
                )}`;
              } else {
                content = JSON.stringify(responseWithoutMessages, null, 2);
              }
            }

            transformedMessages.push({
              type: "ai",
              content: content,
              agent_type: aiResponse.agent_type,
            });
          }
        });
      }

      setMessages(transformedMessages);
    } catch (err) {
      console.error("Error fetching session details:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Use the function in useEffect
  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId, bearerToken]);

  const getAgentDetails = (agentType: string | undefined) => {
    const agent = AGENTS.find(
      (agent) => agent.key === agentType?.toLowerCase()
    );
    return agent || AGENTS[0];
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || !selectedAgent || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Show optimistic UI update with user message
      const newUserMessage: Message = {
        type: "human",
        content: inputValue,
        agent_type: selectedAgent,
      };

      setMessages((prev) => [...prev, newUserMessage]);

      // Add a temporary loading message
      const loadingMessage: Message = {
        type: "ai",
        content: "Loading...",
        agent_type: selectedAgent,
      };

      setMessages((prev) => [...prev, loadingMessage]);

      // Store input value before clearing
      const submittedValue = inputValue;

      // Clear the input field early so user can type next message while waiting
      setInputValue("");

      // Call API to process the message
      const response = await fetch(`${API_URL}/api/agents/chat/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: submittedValue,
          session_id: sessionId,
          agent_type: selectedAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Now fetch the updated session to get the AI response
      await fetchSessionDetails();
    } catch (error) {
      console.error("Error submitting message:", error);

      // Remove the loading message
      setMessages((prev) => prev.filter((msg) => msg.content !== "Loading..."));

      setError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      {/* Messages display */}
      <div className="flex-grow mb-6">
        {messages.length > 0 ? (
          messages.map((message, index) => {
            const agentDetails = getAgentDetails(message.agent_type);
            const AgentIcon = agentDetails.icon;

            // Special handling for loading message
            if (message.content === "Loading...") {
              return (
                <div key={index} className="flex flex-col mb-4 items-start">
                  <div className="max-w-2xl w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      {
                        AGENTS.find((agent) => agent.key === message.agent_type)
                          ?.icon
                      }
                      <span className="font-semibold text-sm">
                        {
                          AGENTS.find(
                            (agent) => agent.key === message.agent_type
                          )?.name
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse"></div>
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Regular message rendering (your existing code)
            return (
              <div
                key={index}
                className={`flex flex-col mb-4 ${
                  message.type === "human" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`
                      max-w-2xl w-full p-3 rounded-lg 
                      ${
                        message.type === "human"
                          ? "bg-blue-100 dark:bg-blue-900/50"
                          : "bg-gray-100 dark:bg-gray-800"
                      }
                    `}
                >
                  {message.type === "human" && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">You</span>
                      <span className="text-sm text-black font-bitter">
                        {message.content}
                      </span>
                    </div>
                  )}

                  {message.type === "ai" && message.agent_type === "general" ? (
                    <GeneralAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" && message.agent_type === "note" ? (
                    <NoteAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" &&
                    message.agent_type === "research" ? (
                    <ResearchAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" && message.agent_type === "step" ? (
                    <StepAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" &&
                    message.agent_type === "diagram" ? (
                    <MermaidAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" &&
                    message.agent_type === "flashcard" ? (
                    <FlashcardsAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" &&
                    message.agent_type === "feynman" ? (
                    <FeynmanAgentRender
                      message={message}
                      agentDetails={agentDetails}
                    />
                  ) : message.type === "ai" &&
                    message.agent_type !== "general" ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {
                          AGENTS.find(
                            (agent) => agent.key === message.agent_type
                          )?.icon
                        }
                        <span className="font-semibold text-sm">
                          {
                            AGENTS.find(
                              (agent) => agent.key === message.agent_type
                            )?.name
                          }
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-sm font-sans">
                        {message.content}
                      </pre>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 mt-10">
            No messages in this session
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 pb-4 pt-2 bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center">
          {/* Agent selection */}
          <div className="flex flex-row gap-3 mb-4 flex-wrap justify-center max-w-3xl">
            {AGENTS.map((agent) => (
              <AgentBox
                key={agent.name}
                agentName={agent.name}
                icon={agent.icon}
                description={agent.description}
                color={agent.color}
                activeColor={agent.activeColor}
                selected={selectedAgent === agent.key}
                onClick={() => setSelectedAgent(agent.key)}
              />
            ))}
          </div>

          {/* Text input and send button */}
          <div className="flex w-full max-w-3xl gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className={`w-full font-bitter text-gray-800 dark:text-gray-200 expanding-textarea ${
                selectedAgent ? "border-2 border-opacity-70" : ""
              } ${
                selectedAgent === "research"
                  ? "border-blue-500"
                  : selectedAgent === "note"
                  ? "border-emerald-500"
                  : selectedAgent === "step"
                  ? "border-indigo-500"
                  : selectedAgent === "diagram"
                  ? "border-amber-500"
                  : selectedAgent === "flashcard"
                  ? "border-rose-500"
                  : selectedAgent === "feynman"
                  ? "border-yellow-500"
                  : selectedAgent === "general"
                  ? "border-gray-500"
                  : ""
              }`}
              placeholder={
                selectedAgent
                  ? `Ask about ${
                      AGENTS.find(
                        (a) => a.key === selectedAgent
                      )?.name.toLowerCase() || ""
                    }...`
                  : "Select an agent type and ask a question..."
              }
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || !selectedAgent || isSubmitting}
              className={`px-4 ${
                selectedAgent === "research"
                  ? "bg-blue-500 hover:bg-blue-600"
                  : selectedAgent === "note"
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : selectedAgent === "step"
                  ? "bg-indigo-500 hover:bg-indigo-600"
                  : selectedAgent === "diagram"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : selectedAgent === "flashcard"
                  ? "bg-rose-500 hover:bg-rose-600"
                  : selectedAgent === "feynman"
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : selectedAgent === "general"
                  ? "bg-gray-500 hover:bg-gray-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Send"
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm mt-2 text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};
