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

export const StepAgentRender = ({ message }: { message: any }) => {
  if (message.type === "ai" && typeof message.content === "string") {
    try {
      message.content = JSON.parse(message.content);
      console.log(message.content);
    } catch (error) {
      console.error("Failed to parse message content as JSON:", error);
    }
  }

  const processContent = (content: string | undefined) => {
    if (!content) {
      return ""; // Do nothing if content is undefined
    }
    return content
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  const contentToRender =
    typeof message.content === "object"
      ? processContent(message.content.step_solution)
      : typeof message.content === "string"
      ? processContent(message.content)
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

      <div className="whitespace-pre-wrap break-words text-sm font-sans">
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
          {contentToRender}
        </ReactMarkdown>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>See agent planning process</AccordionTrigger>
          <AccordionContent>
            {message.content.planning_process}
          </AccordionContent>
          <AccordionTrigger>Problem Identification</AccordionTrigger>
          <AccordionContent>
            {message.content.problem_identification}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
