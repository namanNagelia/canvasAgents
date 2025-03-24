import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth";
import { GeneralAgentRender } from "./agentRenders/general";
import { AGENTS } from "./centerChat";

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

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!bearerToken || !isLoggedIn || !sessionId) {
      return;
    }

    const fetchSessionDetails = async () => {
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
          throw new Error(
            `Failed to fetch session details: ${response.status}`
          );
        }

        const data = await response.json();
        const sessionDetails = data.sessionDetails || data;

        setSessionData(sessionDetails);

        const transformedMessages: Message[] = [];

        if (sessionDetails.user_input && sessionDetails.ai_response) {
          sessionDetails.user_input.forEach(
            (input: UserInput, index: number) => {
              // Add human message
              transformedMessages.push({
                type: "human",
                content: input.message,
                agent_type: input.agent_type,
              });

              // Add AI response if exists
              if (sessionDetails.ai_response[index]) {
                const aiResponse = sessionDetails.ai_response[index];
                let content = "";

                if (typeof aiResponse.message === "string") {
                  content = aiResponse.message;
                } else if (
                  aiResponse.message &&
                  typeof aiResponse.message === "object"
                ) {
                  // Create a copy of the message object and remove the 'messages' array
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
                        planning_process:
                          responseWithoutMessages.planning_process,
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
            }
          );
        }

        setMessages(transformedMessages);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching session details:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setIsLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, bearerToken, isLoggedIn, API_URL]);

  const getAgentDetails = (agentType: string | undefined) => {
    const agent = AGENTS.find(
      (agent) => agent.key === agentType?.toLowerCase()
    );
    return agent || AGENTS[0];
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
      {messages.length > 0 ? (
        messages.map((message, index) => {
          const agentDetails = getAgentDetails(message.agent_type);
          const AgentIcon = agentDetails.icon;

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
                  </div>
                )}

                {message.type === "ai" && message.agent_type === "general" ? (
                  <GeneralAgentRender
                    message={message}
                    agentDetails={agentDetails}
                  />
                ) : message.type === "ai" &&
                  message.agent_type !== "general" ? (
                  <>
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
    </div>
  );
};
