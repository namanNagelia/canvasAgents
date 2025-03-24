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

export const CenterChat = () => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentBoxesRef = useRef<HTMLDivElement>(null);

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
    <div className="w-full flex flex-col items-center justify-center my-12 px-4">
      <h1 className="font-raleway text-5xl font-bold text-center">
        Learn about <span className="rainbow-text">anything</span>
      </h1>
      <p className="mt-4 text-gray-600 dark:text-gray-400 text-center max-w-md font-bitter">
        Hello {user?.name}! I am your personal learning assistant! Select an
        agent and ask me anything!
      </p>

      <Textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleInputChange}
        className={`mt-6 w-full max-w-3xl font-bitter text-gray-800 dark:text-gray-200 expanding-textarea ${
          selectedAgent ? "border-2 border-opacity-70" : ""
        } ${
          selectedAgent === "Research"
            ? "border-blue-500"
            : selectedAgent === "Notes"
            ? "border-emerald-500"
            : selectedAgent === "Step"
            ? "border-indigo-500"
            : selectedAgent === "Diagram"
            ? "border-amber-500"
            : selectedAgent === "Flashcards"
            ? "border-rose-500"
            : selectedAgent === "Feynman"
            ? "border-yellow-500"
            : ""
        }`}
        placeholder={
          selectedAgent
            ? `Ask me about ${selectedAgent.toLowerCase()}...`
            : "Ask me to take notes, research, generate flashcards, create diagrams or anything else!"
        }
        rows={1}
      />
      <div
        ref={agentBoxesRef}
        className="flex flex-row gap-4 mt-6 flex-wrap justify-center max-w-3xl"
      >
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
    </div>
  );
};

const AgentBox = ({
  agentName,
  icon,
  description,
  color,
  activeColor,
  selected,
  onClick,
}: {
  agentName: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  activeColor: string;
  selected: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center 
        p-3 rounded-lg cursor-pointer transition-all duration-300 
        ${selected ? activeColor : color}
        ${
          selected
            ? "border-2 scale-105 shadow-md"
            : "border-2 border-transparent hover:scale-105 hover:shadow-md"
        }
      `}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 opacity-80">{icon}</div>
          <h1 className="font-bitter text-sm font-bold">{agentName}</h1>
        </div>
        <div className="text-center">
          <p className="font-bitter text-xs opacity-70">{description}</p>
        </div>
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

export { AGENTS, AgentBox };
