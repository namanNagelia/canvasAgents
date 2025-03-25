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

export const FeynmanAgentRender = ({ message }: { message: any }) => {
  let content = message.content;

  // If content is a string, try parsing it as JSON
  if (message.type === "ai" && typeof message.content === "string") {
    try {
      content = JSON.parse(message.content);
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

  // Extract Feynman content fields
  const coreConcept =
    typeof content === "object" && content.core_concept
      ? content.core_concept
      : "";
  const explanation =
    typeof content === "object" && content.explanation
      ? content.explanation
      : typeof content === "string"
      ? content
      : "";
  const examples =
    typeof content === "object" && content.examples ? content.examples : "";
  const summary =
    typeof content === "object" && content.summary ? content.summary : "";
  const planningProcess =
    typeof content === "object" && content.planning_process
      ? content.planning_process
      : "";

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

      <div className="space-y-4">
        {/* Core Concept */}
        {coreConcept && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Core Concept</h3>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                pre: (props) => (
                  <pre
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                    {...props}
                  />
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  return (
                    <code
                      className={`${
                        className?.includes("inline")
                          ? "px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                          : "block p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                      } ${match ? `language-${match[1]}` : ""}`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {processContent(coreConcept)}
            </ReactMarkdown>
          </div>
        )}

        {/* Main Explanation */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Explanation</h3>
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              pre: (props) => (
                <pre
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                  {...props}
                />
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                return (
                  <code
                    className={`${
                      className?.includes("inline")
                        ? "px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                        : "block p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                    } ${match ? `language-${match[1]}` : ""}`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {processContent(explanation)}
          </ReactMarkdown>
        </div>

        {/* Examples */}
        {examples && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Examples & Analogies</h3>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                pre: (props) => (
                  <pre
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                    {...props}
                  />
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  return (
                    <code
                      className={`${
                        className?.includes("inline")
                          ? "px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                          : "block p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                      } ${match ? `language-${match[1]}` : ""}`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {processContent(examples)}
            </ReactMarkdown>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold mb-2">Key Takeaways</h3>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                pre: (props) => (
                  <pre
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                    {...props}
                  />
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  return (
                    <code
                      className={`${
                        className?.includes("inline")
                          ? "px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                          : "block p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                      } ${match ? `language-${match[1]}` : ""}`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {processContent(summary)}
            </ReactMarkdown>
          </div>
        )}

        {/* Planning Process */}
        {planningProcess && (
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="planning">
              <AccordionTrigger>See agent planning process</AccordionTrigger>
              <AccordionContent>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    pre: (props) => (
                      <pre
                        className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                        {...props}
                      />
                    ),
                    code: ({ className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || "");
                      return (
                        <code
                          className={`${
                            className?.includes("inline")
                              ? "px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                              : "block p-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-x-auto"
                          } ${match ? `language-${match[1]}` : ""}`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {processContent(planningProcess)}
                </ReactMarkdown>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </div>
  );
};
