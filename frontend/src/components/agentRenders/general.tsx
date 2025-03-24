import React from "react";
import { AGENTS } from "../centerChat";

export const GeneralAgentRender = ({
  message,
  agentDetails,
}: {
  message: any;
  agentDetails: any;
}) => {
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

      <pre className="whitespace-pre-wrap break-words text-sm font-sans">
        {/* {message.content} */}
        hi
      </pre>
    </div>
  );
};
