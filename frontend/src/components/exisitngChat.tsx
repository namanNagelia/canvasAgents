import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/auth";
import { GeneralAgentRender } from "./agentRenders/general";
import { AGENTS } from "./centerChat";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { NoteAgentRender } from "./agentRenders/note";
import { ResearchAgentRender } from "./agentRenders/research";
import { StepAgentRender } from "./agentRenders/step";
import { MermaidAgentRender } from "./agentRenders/mermaid";
import { FlashcardsAgentRender } from "./agentRenders/flashcards";
import { FeynmanAgentRender } from "./agentRenders/feynman";
import { UploadFile } from "./uploadFile";
interface Message {
  type: "human" | "ai";
  content: string;
  agent_type?: string;
  isError?: boolean;
  originalMessage?: string;
}

interface UserInput {
  message: string;
  agent_type: string;
}

interface ExistingChatProps {
  sessionId: string;
}

export const ExistingChat: React.FC<ExistingChatProps> = ({ sessionId }) => {
  const { bearerToken, isLoggedIn } = useAuth();
  const [fileIDs, setFileIDs] = useState<string[]>([]);
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

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId, bearerToken]);

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
    if (messages.length > 0) {
      const messagesContainer = messagesEndRef.current?.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || !selectedAgent || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const newUserMessage: Message = {
        type: "human",
        content: inputValue,
        agent_type: selectedAgent,
      };

      setMessages((prev) => [...prev, newUserMessage]);

      const loadingMessage: Message = {
        type: "ai",
        content: "Loading...",
        agent_type: selectedAgent,
      };

      setMessages((prev) => [...prev, loadingMessage]);

      const submittedValue = inputValue;

      setInputValue("");
      console.log(fileIDs);

      const response = await fetch(
        API_URL.replace("http://", "https://") + "/api/agents/chat",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: submittedValue,
            session_id: sessionId,
            agent_type: selectedAgent,
            file_ids: fileIDs,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      await fetchSessionDetails();
    } catch (error) {
      console.error("Error submitting message:", error);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== "Loading...");
        return [
          ...filtered,
          {
            type: "ai",
            content: `Error: ${
              error instanceof Error ? error.message : "Failed to send message"
            }`,
            agent_type: selectedAgent,
            isError: true,
            originalMessage: inputValue,
          },
        ];
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = (originalMessage: string, agentType: string) => {
    setInputValue(originalMessage);
    setSelectedAgent(agentType);
    setMessages((prev) =>
      prev.filter(
        (msg) => !(msg.isError && msg.originalMessage === originalMessage)
      )
    );

    textareaRef.current?.focus();
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

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col h-full min-h-0">
        <div
          className="flex-1 overflow-y-auto p-4 messages-container"
          style={{ scrollbarGutter: "stable" }}
        >
          {messages.length > 0 ? (
            messages.map((message, index) => {
              // Loading message handling
              if (message.content === "Loading...") {
                return (
                  <div key={index} className="flex flex-col mb-4 items-start">
                    <div className="max-w-2xl w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
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

              // Error message handling
              if (message.isError) {
                return (
                  <div key={index} className="flex flex-col mb-4 items-start">
                    <div className="max-w-2xl w-full p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800">
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
                          }{" "}
                          - Error
                        </span>
                      </div>
                      <div className="text-red-600 dark:text-red-300 mb-3">
                        {message.content}
                      </div>
                      <Button
                        onClick={() =>
                          handleRetry(
                            message.originalMessage || "",
                            message.agent_type || ""
                          )
                        }
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-gray-800 border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                );
              }

              // Regular message rendering
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

                    {message.type === "ai" &&
                    message.agent_type === "general" ? (
                      <GeneralAgentRender message={message} />
                    ) : message.type === "ai" &&
                      message.agent_type === "note" ? (
                      <NoteAgentRender message={message} />
                    ) : message.type === "ai" &&
                      message.agent_type === "research" ? (
                      <ResearchAgentRender message={message} />
                    ) : message.type === "ai" &&
                      message.agent_type === "step" ? (
                      <StepAgentRender message={message} />
                    ) : message.type === "ai" &&
                      message.agent_type === "diagram" ? (
                      <MermaidAgentRender message={message} />
                    ) : message.type === "ai" &&
                      message.agent_type === "flashcard" ? (
                      <FlashcardsAgentRender message={message} />
                    ) : message.type === "ai" &&
                      message.agent_type === "feynman" ? (
                      <FeynmanAgentRender message={message} />
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

        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex flex-col items-center">
            <div className="flex flex-row gap-3 mb-4 flex-wrap justify-center max-w-3xl">
              {AGENTS.map((agent) => (
                <Button
                  key={agent.key}
                  onClick={() => setSelectedAgent(agent.key)}
                  variant={selectedAgent === agent.key ? "default" : "outline"}
                  size="sm"
                  className={`flex items-center gap-1 ${
                    selectedAgent === agent.key
                      ? agent.key === "research"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : agent.key === "note"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : agent.key === "step"
                        ? "bg-indigo-500 hover:bg-indigo-600"
                        : agent.key === "diagram"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : agent.key === "flashcard"
                        ? "bg-rose-500 hover:bg-rose-600"
                        : agent.key === "feynman"
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : agent.key === "general"
                        ? "bg-gray-500 hover:bg-gray-600"
                        : "bg-blue-500 hover:bg-blue-600"
                      : ""
                  }`}
                >
                  {agent.icon}
                  {agent.name}
                </Button>
              ))}
            </div>

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
              <div className="text-red-500 text-sm mt-2 text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <UploadFile sessionId={sessionId} setFileIDs={setFileIDs} />
    </div>
  );
};
