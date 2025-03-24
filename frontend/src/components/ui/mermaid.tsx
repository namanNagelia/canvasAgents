import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "sans-serif",
        // Set global max width to fit container
        htmlLabels: true,
        // Improved responsiveness settings
        er: { useMaxWidth: true },
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true, htmlLabels: true },
        journey: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        pie: { useMaxWidth: true },
      });
      initializedRef.current = true;
    }

    if (mermaidRef.current) {
      try {
        // Clean up existing content
        mermaidRef.current.innerHTML = "";

        // Generate a unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;

        // Create clean chart content
        let cleanChart = chart
          .replace(/```mermaid/g, "")
          .replace(/```/g, "")
          .trim();

        // Try basic syntax fixes
        // Fix policy notation with quotes
        cleanChart = cleanChart.replace(/\[([^\]]*"[^\]]*)\]/g, (match, p1) => {
          return "[" + p1.replace(/"/g, "&quot;") + "]";
        });

        // Normalize line breaks
        cleanChart = cleanChart.replace(/\r\n/g, "\n");

        // Render the chart with error handling
        mermaid
          .render(id, cleanChart)
          .then(({ svg }) => {
            if (mermaidRef.current) {
              // Process the SVG to add responsive attributes
              const processedSvg = svg
                .replace("<svg ", '<svg style="max-width:100%; height:auto;" ')
                .replace(/width="[^"]*"/, 'width="100%"')
                .replace(/height="[^"]*"/, 'height="auto"');

              mermaidRef.current.innerHTML = processedSvg;

              // Add additional styling to SVG elements
              if (mermaidRef.current.querySelector("svg")) {
                const svgElement = mermaidRef.current.querySelector("svg");
                if (svgElement) {
                  svgElement.style.maxWidth = "100%";
                  svgElement.style.height = "auto";
                  svgElement.setAttribute(
                    "preserveAspectRatio",
                    "xMinYMin meet"
                  );
                }
              }
            }
          })
          .catch((err) => {
            console.error("Mermaid render error:", err);
            // Show simple error placeholder
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = `
                <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                  </svg>
                  <p>Error rendering diagram</p>
                </div>`;
            }
          });
      } catch (error) {
        console.error("Mermaid component error:", error);
        // Show simple error placeholder
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="16"></line>
              </svg>
              <p>Error rendering diagram</p>
            </div>`;
        }
      }
    }
  }, [chart]);

  return (
    <div
      className="mermaid-wrapper overflow-auto"
      style={{ maxWidth: "100%" }}
      ref={mermaidRef}
    ></div>
  );
};

export default Mermaid;
