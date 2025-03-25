import { useState } from "react";
import { AGENTS } from "../centerChat";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Define the type for a flashcard
interface Flashcard {
  front: string;
  back: string;
}

// Interactive Flashcard Component
const FlashCard = ({ flashcard }: { flashcard: Flashcard }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const processContent = (content: string) => {
    if (!content) return "";
    return content
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  return (
    <div
      className="relative h-64 w-full cursor-pointer mb-4"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`absolute w-full h-full transition-all duration-500 ease-in-out ${
          isFlipped ? "rotate-y-180 opacity-0" : "rotate-y-0 opacity-100"
        }`}
      >
        <div className="h-full bg-white dark:bg-gray-700 rounded-lg shadow-md p-4 flex flex-col justify-center">
          <h3 className="text-lg font-medium mb-2 text-center">Question</h3>
          <div className="text-center">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {processContent(flashcard.front)}
            </ReactMarkdown>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            Click to see answer
          </div>
        </div>
      </div>

      <div
        className={`absolute w-full h-full transition-all duration-500 ease-in-out ${
          isFlipped ? "rotate-y-0 opacity-100" : "rotate-y-180 opacity-0"
        }`}
      >
        <div className="h-full bg-white dark:bg-gray-700 rounded-lg shadow-md p-4 flex flex-col justify-center">
          <h3 className="text-lg font-medium mb-2 text-center">Answer</h3>
          <div className="text-center">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {processContent(flashcard.back)}
            </ReactMarkdown>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            Click to see question
          </div>
        </div>
      </div>
    </div>
  );
};

export const FlashcardsAgentRender = ({ message }: { message: any }) => {
  let content = message.content;
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // If content is a string, try parsing it as JSON
  if (message.type === "ai" && typeof message.content === "string") {
    try {
      content = JSON.parse(message.content);
      console.log("Parsed flashcard content:", content);
    } catch (error) {
      console.error("Failed to parse message content as JSON:", error);
    }
  }

  // Process content to ensure LaTeX is rendered correctly
  const processContent = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  // Extract flashcards and other content
  const flashcards = Array.isArray(content.flashcards)
    ? content.flashcards
    : [];
  const planningProcess =
    typeof content === "object" && content.planning_process
      ? content.planning_process
      : "";
  const organizationApproach =
    typeof content === "object" && content.organization_approach
      ? content.organization_approach
      : "";
  const studyTips =
    typeof content === "object" && content.study_tips ? content.study_tips : "";

  // Navigation functions
  const goToNextCard = () => {
    setCurrentCardIndex((prevIndex) =>
      prevIndex === flashcards.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPrevCard = () => {
    setCurrentCardIndex((prevIndex) =>
      prevIndex === 0 ? flashcards.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="max-w-2xl w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
      {message.type === "ai" && (
        <div className="flex items-center gap-2 mb-2">
          {AGENTS.find((agent) => agent.key === message.agent_type)?.icon}
          <span className="font-semibold text-sm">
            {AGENTS.find((agent) => agent.key === message.agent_type)?.name}
          </span>
        </div>
      )}

      {flashcards.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">
              Flashcards ({currentCardIndex + 1} of {flashcards.length})
            </h3>

            {/* Flashcard display */}
            <FlashCard flashcard={flashcards[currentCardIndex]} />

            {/* Navigation controls */}
            <div className="flex justify-between mt-4">
              <button
                onClick={goToPrevCard}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={goToNextCard}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          {/* Study Tips Section */}
          {studyTips && (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Study Tips</h3>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {processContent(studyTips)}
              </ReactMarkdown>
            </div>
          )}

          {/* Organization Approach */}
          {organizationApproach && (
            <Accordion type="single" collapsible>
              <AccordionItem value="approach">
                <AccordionTrigger>Organization Approach</AccordionTrigger>
                <AccordionContent>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {processContent(organizationApproach)}
                  </ReactMarkdown>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Planning Process */}
          {planningProcess && (
            <Accordion type="single" collapsible>
              <AccordionItem value="planning">
                <AccordionTrigger>Planning Process</AccordionTrigger>
                <AccordionContent>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {processContent(planningProcess)}
                  </ReactMarkdown>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      {flashcards.length === 0 && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          <p>No flashcards found in the response.</p>
        </div>
      )}
    </div>
  );
};

// Add CSS for card flipping effect
export const FlashcardStyles = () => (
  <style>{`
    .rotate-y-180 {
      transform: rotateY(180deg);
    }

    .rotate-y-0 {
      transform: rotateY(0deg);
    }
  `}</style>
);
