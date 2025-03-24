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
  let diagramCode = "";
  let interpretation = "";
  let planningProcess = "";
  let diagramTypeRationale = "";

  // If content is a string, try extracting components
  if (message.type === "ai" && typeof message.content === "string") {
    const contentStr = message.content;

    // Try to extract the mermaid diagram
    const mermaidMatch = contentStr.match(/```mermaid\s*([\s\S]*?)\s*```/);
    if (mermaidMatch) {
      diagramCode = mermaidMatch[1].trim();
    } else if (
      contentStr.trim().startsWith("graph ") ||
      contentStr.trim().startsWith("flowchart ") ||
      contentStr.trim().startsWith("sequenceDiagram") ||
      contentStr.trim().startsWith("classDiagram") ||
      contentStr.trim().startsWith("stateDiagram")
    ) {
      // Raw mermaid diagram without code block markers
      diagramCode = contentStr.trim();
    }

    // Try to extract embedded JSON
    try {
      const jsonRegex = /{[\s\S]*}/;
      const jsonMatch = contentStr.match(jsonRegex);

      if (jsonMatch) {
        const jsonObject = JSON.parse(jsonMatch[0]);
        interpretation = jsonObject.interpretation || "";
        planningProcess = jsonObject.planning_process || "";
        diagramTypeRationale = jsonObject.diagram_type_rationale || "";
      }
    } catch (jsonError) {
      console.error("Failed to extract embedded JSON:", jsonError);
    }

    // If we have a diagram but no JSON was extracted, try to extract sections by headers
    if (diagramCode && !interpretation) {
      const interpretationMatch = contentStr.match(
        /## Interpretation\s*([\s\S]*?)(?=##|$)/i
      );
      if (interpretationMatch) {
        interpretation = interpretationMatch[1].trim();
      }

      const planningMatch = contentStr.match(
        /## Planning Process\s*([\s\S]*?)(?=##|$)/i
      );
      if (planningMatch) {
        planningProcess = planningMatch[1].trim();
      }

      const rationaleMatch = contentStr.match(
        /## Diagram Type Rationale\s*([\s\S]*?)(?=##|$)/i
      );
      if (rationaleMatch) {
        diagramTypeRationale = rationaleMatch[1].trim();
      }
    }

    // Special case: Handle "Diagram:" prefix followed by mermaid code block
    if (!diagramCode) {
      const diagramPrefixMatch = contentStr.match(
        /Diagram:\s*```mermaid\s*([\s\S]*?)\s*```/
      );
      if (diagramPrefixMatch) {
        diagramCode = diagramPrefixMatch[1].trim();
      }
    }

    // Try parsing the entire content as JSON as a fallback
    if (!diagramCode && !interpretation) {
      try {
        parsedContent = JSON.parse(contentStr);
        diagramCode = parsedContent.diagram_code || "";
        interpretation = parsedContent.interpretation || "";
        planningProcess = parsedContent.planning_process || "";
        diagramTypeRationale = parsedContent.diagram_type_rationale || "";
      } catch (error) {
        console.log("Content is not valid JSON:", error);
      }
    }
  } else if (message.type === "ai" && typeof message.content === "object") {
    // Content is already an object
    parsedContent = message.content;
    diagramCode = parsedContent.diagram_code || parsedContent.diagram || "";
    interpretation = parsedContent.interpretation || "";
    planningProcess = parsedContent.planning_process || "";
    diagramTypeRationale = parsedContent.diagram_type_rationale || "";
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
    if (!code) return "";
    // Replace escaped newlines with actual newlines
    let processed = code.replace(/\\n/g, "\n");
    // Replace escaped quotes with actual quotes
    processed = processed.replace(/\\"/g, '"');
    // Replace other common escaped characters as needed
    processed = processed.replace(/\\\\/g, "\\");
    return processed;
  };

  // Process the diagram code
  diagramCode = processDiagramCode(diagramCode);

  console.log("Extracted components:");
  console.log("Diagram code:", diagramCode);
  console.log("Interpretation:", interpretation);
  console.log("Planning process:", planningProcess);
  console.log("Diagram type rationale:", diagramTypeRationale);

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
