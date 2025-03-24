import React from "react";
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
import dynamic from "next/dynamic";

// Dynamically import Mermaid with no SSR
const Mermaid = dynamic(() => import("../ui/mermaid"), {
  ssr: false,
});

export const MermaidAgentRender = ({
  message,
  agentDetails,
}: {
  message: any;
  agentDetails: any;
}) => {
  let content = message.content;
  let parsedContent: any = null;

  // If content is a string, try parsing it as JSON
  if (message.type === "ai" && typeof message.content === "string") {
    // First attempt to parse the entire content as JSON
    try {
      parsedContent = JSON.parse(message.content);
      content = parsedContent;
      console.log("Successfully parsed JSON content:", content);
    } catch (error) {
      // If that fails, check if it contains a mermaid diagram and JSON object
      try {
        const mermaidMatch = message.content.match(/```mermaid([\s\S]*?)```/);
        const jsonMatch = message.content.match(/{[\s\S]*}/);

        if (mermaidMatch && jsonMatch) {
          const diagramCode = mermaidMatch[1].trim();
          const jsonObject = JSON.parse(jsonMatch[0]);

          content = {
            diagram: diagramCode,
            ...jsonObject,
          };
          console.log("Extracted diagram and JSON:", content);
        }
        // Check if it's a raw graph definition without mermaid tags
        else if (
          message.content.trim().startsWith("graph ") ||
          message.content.trim().startsWith("flowchart ") ||
          message.content.trim().startsWith("sequenceDiagram") ||
          message.content.trim().startsWith("classDiagram") ||
          message.content.trim().startsWith("stateDiagram")
        ) {
          // Raw mermaid diagram without code block markers
          content = {
            diagram: message.content.trim(),
          };
          console.log("Extracted raw diagram:", content);
        }
      } catch (jsonError) {
        console.error("Failed to extract embedded JSON:", jsonError);
      }
    }
  }

  // Process content to ensure LaTeX is rendered correctly (if applicable)
  const processContent = (text: string) => {
    return text
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  // Add a function to handle escaped characters in diagram code
  const processDiagramCode = (code: string) => {
    // Replace escaped newlines with actual newlines
    let processed = code.replace(/\\n/g, "\n");
    // Replace escaped quotes with actual quotes
    processed = processed.replace(/\\"/g, '"');
    // Replace other common escaped characters as needed
    processed = processed.replace(/\\\\/g, "\\");
    return processed;
  };

  // Extract diagram code, prioritizing structured content over string parsing
  const diagramCode =
    typeof content === "object" && content !== null && content.diagram
      ? processDiagramCode(content.diagram)
      : typeof content === "string" && content.includes("```mermaid")
      ? processDiagramCode(
          content.split("```mermaid")[1].split("```")[0].trim()
        )
      : typeof content === "string" &&
        (content.trim().startsWith("graph ") ||
          content.trim().startsWith("flowchart ") ||
          content.trim().startsWith("sequenceDiagram") ||
          content.trim().startsWith("classDiagram") ||
          content.trim().startsWith("stateDiagram"))
      ? processDiagramCode(content.trim())
      : "";

  // Extract additional content fields
  const interpretation =
    typeof content === "object" && content !== null
      ? content.interpretation || ""
      : "";
  const planningProcess =
    typeof content === "object" && content !== null
      ? content.planning_process || ""
      : "";
  const diagramTypeRationale =
    typeof content === "object" && content !== null
      ? content.diagram_type_rationale || ""
      : "";

  console.log("Extracted components:");
  console.log("Diagram code:", diagramCode);
  console.log("Interpretation:", interpretation);
  console.log("Planning process:", planningProcess);
  console.log("Diagram type rationale:", diagramTypeRationale);
  console.log(content);

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
        {/* Mermaid Diagram */}
        {diagramCode && (
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Diagram</h3>
            <Mermaid chart={diagramCode} />
          </div>
        )}

        {/* Interpretation */}
        {interpretation && (
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Interpretation</h3>
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
              {processContent(interpretation)}
            </ReactMarkdown>
          </div>
        )}

        {/* Diagram Type Rationale */}
        {diagramTypeRationale && (
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">
              Diagram Type Rationale
            </h3>
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
              {processContent(diagramTypeRationale)}
            </ReactMarkdown>
          </div>
        )}

        {/* Accordion for Planning Process */}
        {planningProcess && (
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
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
