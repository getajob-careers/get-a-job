import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

const downloadAsPDF = (content) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkPage = (needed = 8) => { if (y + needed > 282) addPage(); };

  const lines = content.split("\n");

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    // H1 — Name
    if (/^#\s/.test(line)) {
      const text = line.replace(/^#\s*/, "").replace(/\*\*/g, "").trim();
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 10, 10);
      doc.text(text, margin, y);
      y += 8;
      return;
    }

    // Contact line (contains | with email/phone/linkedin)
    if (!line.startsWith("#") && line.includes("|") && (line.includes("@") || line.includes("+") || line.includes("linkedin"))) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const parts = line.split("|").map(p => p.trim()).join("   |   ");
      doc.text(parts, margin, y);
      y += 6;
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      return;
    }

    // H2 — Section heading
    if (/^##\s/.test(line)) {
      const text = line.replace(/^##\s*/, "").replace(/\*\*/g, "").trim();
      checkPage(10);
      y += 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 10, 10);
      doc.text(text.toUpperCase(), margin, y);
      y += 2;
      doc.setDrawColor(10, 10, 10);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      return;
    }

    // H3 — Job title / sub heading (bold line)
    if (/^###\s/.test(line)) {
      const text = line.replace(/^###\s*/, "").replace(/\*\*/g, "").trim();
      checkPage(7);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 10, 10);
      doc.text(text, margin, y);
      y += 5.5;
      return;
    }

    // Bold inline lines like **Job Title** | Company | Date
    if (/^\*\*/.test(line)) {
      const text = line.replace(/\*\*/g, "").trim();
      checkPage(7);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 10, 10);
      const wrapped = doc.splitTextToSize(text, maxWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5;
      return;
    }

    // Bullet point
    if (/^[-•]\s/.test(line)) {
      const text = line.replace(/^[-•]\s*/, "").replace(/\*\*/g, "").trim();
      checkPage(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const wrapped = doc.splitTextToSize(text, maxWidth - 5);
      doc.text("•", margin, y);
      doc.text(wrapped, margin + 4, y);
      y += wrapped.length * 5;
      return;
    }

    // Horizontal rule ---
    if (/^---+$/.test(line.trim())) {
      return;
    }

    // Empty line
    if (!line.trim()) {
      y += 2;
      return;
    }

    // Normal text
    const text = line.replace(/\*\*/g, "").trim();
    checkPage(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const wrapped = doc.splitTextToSize(text, maxWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5;
  });

  doc.save("tailored-cv.pdf");
};

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || "Function";
  const status = toolCall?.status || "pending";
  const results = toolCall?.results;

  const parsedResults = (() => {
    if (!results) return null;
    try {
      return typeof results === "string" ? JSON.parse(results) : results;
    } catch {
      return results;
    }
  })();

  const isError =
    results &&
    ((typeof results === "string" && /error|failed/i.test(results)) ||
      parsedResults?.success === false);

  const statusConfig =
    {
      pending: { icon: Clock, color: "text-[#9C9DA1]", text: "Pending" },
      running: { icon: Loader2, color: "text-[#52545A]", text: "Running...", spin: true },
      in_progress: { icon: Loader2, color: "text-[#52545A]", text: "Running...", spin: true },
      completed: isError
        ? { icon: AlertCircle, color: "text-red-500", text: "Failed" }
        : { icon: CheckCircle2, color: "text-[#059669]", text: "Done" },
      success: { icon: CheckCircle2, color: "text-[#059669]", text: "Done" },
      failed: { icon: AlertCircle, color: "text-red-500", text: "Failed" },
      error: { icon: AlertCircle, color: "text-red-500", text: "Failed" },
    }[status] || { icon: Zap, color: "text-[#9C9DA1]", text: "" };

  const Icon = statusConfig.icon;
  const formattedName = name.split(".").reverse().join(" ").toLowerCase();

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
          "hover:bg-[#E8E8E5]",
          expanded ? "bg-[#E8E8E5] border-[#9C9DA1]" : "bg-white border-[#DDDDDB]"
        )}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-[#52545A]">{formattedName}</span>
        {statusConfig.text && (
          <span className={cn("text-[#9C9DA1]", isError && "text-red-600")}>
            / {statusConfig.text}
          </span>
        )}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={cn("h-3 w-3 text-[#9C9DA1] transition-transform ml-auto", expanded && "rotate-90")} />
        )}
      </button>
      {expanded && !statusConfig.spin && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-[#DDDDDB] space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs text-[#9C9DA1] mb-1">Parameters:</div>
              <pre className="bg-[#E8E8E5] rounded-md p-2 text-xs text-[#52545A] whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                  } catch {
                    return toolCall.arguments_string;
                  }
                })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs text-[#9C9DA1] mb-1">Result:</div>
              <pre className="bg-[#E8E8E5] rounded-md p-2 text-xs text-[#52545A] whitespace-pre-wrap max-h-48 overflow-auto">
                {typeof parsedResults === "object" ? JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const isCV = (content) => content && (
  content.includes("Professional Summary") || content.includes("Core Skills")
) && (
  content.includes("Professional Experience") || content.includes("Education")
);

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const showDownload = !isUser && isCV(message.content || "");

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="c-avatar">
          <div className="c-avatar-dot" />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn("c-bubble", isUser ? "c-bubble-user" : "c-bubble-assistant")}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-neutral max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1.5 leading-relaxed text-[#52545A]">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-[#0E1014]">{children}</strong>,
                  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5 text-[#52545A]">{children}</li>,
                  h1: ({ children }) => <h1 className="text-base font-semibold my-2 text-[#0E1014]">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold my-2 text-[#0E1014]">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-1.5 text-[#0E1014]">{children}</h3>,
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1 py-0.5 rounded bg-[#E8E8E5] text-[#52545A] text-xs">{children}</code>
                    ) : (
                      <pre className="bg-[#0E1014] text-gray-100 rounded-lg p-3 overflow-x-auto my-2">
                        <code>{children}</code>
                      </pre>
                    ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {showDownload && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadAsPDF(message.content)}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download CV as PDF
            </Button>
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-1">
            {message.tool_calls.map((tc, i) => (
              <FunctionDisplay key={i} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}