import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/auth";
import { Textarea } from "./ui/textarea";
import {
  Search,
  BookOpen,
  FileText,
  Layers,
  IdCard,
  Lightbulb,
  MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { UploadFile } from "./uploadFile";
import { v4 as uuidv4 } from "uuid";

export const CenterChat = ({
  setCurrentSession,
}: {
  setCurrentSession: (sessionId: string) => void;
}) => {
  const { user, bearerToken } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sessID, setSessID] = useState<string>(uuidv4());
  const API_URL = import.meta.env.VITE_API_URL;
  const uploadComponentRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!inputValue.trim() || !selectedAgent) return;

    setIsSubmitting(true);
    try {
      // 1. Create a new session
      const newSessionId = uuidv4();
      const session = await fetch(
        `${API_URL}/api/agents/create_session/${newSessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      if (!session.ok) {
        throw new Error(`Failed to create session: ${session.status}`);
      }

      const sessionData = await session.json();
      const sessionId = sessionData.session_id;
      setSessID(sessionId);

      // 2. Upload any pending files
      let uploadedFileIds: string[] = [];
      if (typeof window !== "undefined" && (window as any).uploadPendingFiles) {
        uploadedFileIds = await (window as any).uploadPendingFiles(sessionId);
      }

      // 3. Send the message with the uploaded file IDs
      const messageResponse = await fetch(`${API_URL}/api/agents/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: inputValue,
          agent_type: selectedAgent,
          file_ids: uploadedFileIds, // Use the uploaded file IDs
        }),
      });

      if (!messageResponse.ok) {
        throw new Error(`Failed to send message: ${messageResponse.status}`);
      }

      document.dispatchEvent(new CustomEvent("refreshSessions"));
      setCurrentSession(sessionId);
    } catch (error) {
      console.error("Error during submission:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @import url("https://fonts.googleapis.com/css2?family=Raleway:wght@400;700&display=swap");
      
      .rainbow-text {
        background-image: linear-gradient(
          to right,
          #6a11cb 0%, 
          #2575fc 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: rainbow-animation 6s linear infinite;
        background-size: 400% 100%;
      }

      @keyframes rainbow-animation {
        0% {
          background-position: 0% 50%;
        }
        100% {
          background-position: 400% 50%;
        }
      }

      .font-raleway {
        font-family: "Raleway", sans-serif;
      }

      .expanding-textarea {
        min-height: 56px;
        resize: none;
        overflow-y: hidden;
        transition: height 0.1s ease;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 flex flex-col items-center justify-center my-12 px-6">
        <h1 className="font-raleway text-5xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
          Learn about <span className="rainbow-text">anything</span>
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400 text-center max-w-md font-bitter">
          Hello {user?.name}! I am your personal learning assistant! Select an
          agent and ask me anything!
        </p>
        <div
          className={`border-2 p-2 rounded-lg flex flex-col ${
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
              : "border-blue-500"
          }`}
        >
          <div className="flex flex-wrap gap-2 mb-2 h-16 overflow-y-auto">
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
          <div className="flex items-center gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 min-h-24 resize-none"
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || !selectedAgent || isSubmitting}
              className={`px-4 h-24 ${
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
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </div>
      <div ref={uploadComponentRef}>
        <UploadFile
          sessionId={sessID}
          setFileIDs={() => {}}
          isTemporary={true}
        />
      </div>
    </div>
  );
};

const AGENTS = [
  {
    name: "General",
    key: "general",
    icon: <MessageCircle className="w-6 h-6" />,
    description: "General knowledge",
    color: "bg-gray-500/30 hover:bg-gray-500/40 text-gray-900",
    activeColor: "bg-gray-500/50 text-gray-900 border-gray-500",
  },
  {
    name: "Research",
    key: "research",
    icon: <Search className="w-6 h-6" />,
    description: "In-depth research and citations",
    color: "bg-blue-500/30 hover:bg-blue-500/40 text-blue-800",
    activeColor: "bg-blue-500/50 text-blue-900 border-blue-500",
  },
  {
    name: "Notes",
    key: "note",
    icon: <BookOpen className="w-6 h-6" />,
    description: "Comprehensive note-taking",
    color: "bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-900",
    activeColor: "bg-emerald-500/50 text-emerald-900 border-emerald-500",
  },
  {
    name: "Step",
    key: "step",
    icon: <Layers className="w-6 h-6" />,
    description: "Detailed problem solving",
    color: "bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-900",
    activeColor: "bg-indigo-500/50 text-indigo-900 border-indigo-500",
  },
  {
    name: "Diagram",
    key: "diagram",
    icon: <FileText className="w-6 h-6" />,
    description: "Visual concept mapping",
    color: "bg-amber-500/30 hover:bg-amber-500/40 text-amber-900",
    activeColor: "bg-amber-500/50 text-amber-900 border-amber-500",
  },
  {
    name: "Flashcards",
    key: "flashcard",
    icon: <IdCard className="w-6 h-6" />,
    description: "Flashcards for studying",
    color: "bg-rose-500/30 hover:bg-rose-500/40 text-rose-900",
    activeColor: "bg-rose-500/50 text-rose-900 border-rose-500",
  },
  {
    name: "Feynman",
    key: "feynman",
    icon: <Lightbulb className="w-6 h-6" />,
    description: "Simplified explanations",
    color: "bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-900",
    activeColor: "bg-yellow-500/50 text-yellow-900 border-yellow-500",
  },
];

export { AGENTS };
