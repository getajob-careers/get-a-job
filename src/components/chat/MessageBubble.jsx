import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// jsPDF (+ its peer html2canvas pulled transitively) is ~50KB gzip and
// only fires when a user clicks "Download CV as PDF" on an AI message
// that rendered a CV. Lazy-loading keeps it off the main chunk; first
// click on the button incurs a ~100-300ms fetch on cold cache, then
// cached for subsequent uses.
const downloadAsPDF = async (content) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };
  const checkPage = (needed = 8) => {
    if (y + needed > 282) addPage();
  };

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
    if (
      !line.startsWith("#") &&
      line.includes("|") &&
      (line.includes("@") || line.includes("+") || line.includes("linkedin"))
    ) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const parts = line
        .split("|")
        .map((p) => p.trim())
        .join("   |   ");
      doc.text(parts, margin, y);
      y += 6;
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      return;
    }

    // H2 — Section heading
    if (/^##\s/.test(line)) {
      const text = line
        .replace(/^##\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
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
      const text = line
        .replace(/^###\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
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
      const text = line
        .replace(/^[-•]\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
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

  const statusConfig = {
    pending: { icon: Clock, color: "text-rd-text-tertiary", text: "Pending" },
    running: {
      icon: Loader2,
      color: "text-rd-text-secondary",
      text: "Running...",
      spin: true,
    },
    in_progress: {
      icon: Loader2,
      color: "text-rd-text-secondary",
      text: "Running...",
      spin: true,
    },
    completed: isError
      ? { icon: AlertCircle, color: "text-rd-primary-dark", text: "Failed" }
      : { icon: CheckCircle2, color: "text-rd-teal-dark", text: "Done" },
    success: { icon: CheckCircle2, color: "text-rd-teal-dark", text: "Done" },
    failed: {
      icon: AlertCircle,
      color: "text-rd-primary-dark",
      text: "Failed",
    },
    error: { icon: AlertCircle, color: "text-rd-primary-dark", text: "Failed" },
  }[status] || { icon: Zap, color: "text-rd-text-tertiary", text: "" };

  const Icon = statusConfig.icon;
  const formattedName = name.split(".").reverse().join(" ").toLowerCase();

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
          "hover:bg-rd-bg-soft",
          expanded
            ? "bg-rd-bg-soft border-rd-border-hover"
            : "bg-rd-bg-card border-rd-border",
        )}
      >
        <Icon
          className={cn(
            "h-3 w-3",
            statusConfig.color,
            statusConfig.spin && "animate-spin",
          )}
        />
        <span className="text-rd-text-secondary">{formattedName}</span>
        {statusConfig.text && (
          <span
            className={cn(
              "text-rd-text-tertiary",
              isError && "text-rd-primary-dark",
            )}
          >
            / {statusConfig.text}
          </span>
        )}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight
            className={cn(
              "h-3 w-3 text-rd-text-tertiary transition-transform ml-auto",
              expanded && "rotate-90",
            )}
          />
        )}
      </button>
      {expanded && !statusConfig.spin && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-rd-border space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs text-rd-text-secondary mb-1">
                Parameters:
              </div>
              <pre className="bg-rd-bg-soft rounded-md p-2 text-xs text-rd-text-secondary whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(
                      JSON.parse(toolCall.arguments_string),
                      null,
                      2,
                    );
                  } catch {
                    return toolCall.arguments_string;
                  }
                })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs text-rd-text-secondary mb-1">Result:</div>
              <pre className="bg-rd-bg-soft rounded-md p-2 text-xs text-rd-text-secondary whitespace-pre-wrap max-h-48 overflow-auto">
                {typeof parsedResults === "object"
                  ? JSON.stringify(parsedResults, null, 2)
                  : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const isCV = (content) =>
  content &&
  (content.includes("Professional Summary") ||
    content.includes("Core Skills")) &&
  (content.includes("Professional Experience") ||
    content.includes("Education"));

// Variant prop controls bubble density:
//   - "page" / "drawer" / undefined: original spec (px-3.5 py-2.5, text-[13px]).
//   - "dock": tighter for the sidebar dock (px-3 py-2, text-[12px], wider
//     max-width % so the narrow sidebar isn't dominated by gutters).
//   - "panel": same as "page" — kept as an explicit name so the AgentDrawer
//     panel can opt in clearly.
export default function MessageBubble({ message, variant = "page" }) {
  const isUser = message.role === "user";
  const showDownload = !isUser && isCV(message.content || "");
  const isDock = variant === "dock";
  // Disable the Download button briefly while jsPDF lazy-fetches + renders.
  // First click pays a ~200–500ms chunk fetch on cold cache; subsequent
  // clicks are instant. Prevents double-fire if a user clicks twice.
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAsPDF(message.content);
    } finally {
      setDownloading(false);
    }
  };

  // PR 3K — D3 bubble vocabulary mirrors the 3J-C ThreadBubble playbook.
  // ALIGNMENT UNCHANGED: user-RIGHT (justify-end), assistant-LEFT
  // (justify-start). Per Eli's re-ruling, this is a color/radii/avatar
  // restyle, not an alignment change.
  //
  // Avatar stays generic (no per-agent icon dispatch) so CVAgent /
  // InterviewCoach / SkillDevelopmentAdvisor render the same primary-tint
  // circle without hardcoding the mockup's compass icon.
  // Coach contexts (dock + panel) share one bubble vocabulary distinct
  // from the legacy full-page agents. Both use coral-tint user bubbles
  // with coral-dark text and rd-bg-soft agent bubbles with rd-text —
  // reads as the coach's voice, not generic chat. Asymmetric radii
  // point the tight corner toward the sender (user bottom-right,
  // agent bottom-left). variant="page" preserves the legacy dark user
  // bubble + warm-cream agent bubble used on CareerAgent / CVAgent /
  // InterviewCoach / SkillDevelopmentAdvisor full-page surfaces.
  const isCoach = variant === "dock" || variant === "panel";
  const gapClass = isDock ? "gap-2" : "gap-3";
  const avatarSize = isDock ? "w-[22px] h-[22px]" : "w-[26px] h-[26px]";
  const bubbleMaxW = isDock ? "max-w-[92%]" : "max-w-[85%]";
  const bubblePadding = isDock ? "px-3 py-2" : "px-3.5 py-2.5";
  const textSize = isDock ? "text-[12px]" : "text-[13px]";
  const leading = isDock ? "leading-[1.45]" : "leading-[1.5]";

  // Bubble color + radii per variant. Tight corner faces the sender so
  // the "speech tail" points the right direction (user-right → tight
  // bottom-right; agent-left → tight bottom-left).
  const userBubbleClasses = isCoach
    ? "bg-rd-primary-tint text-rd-primary-dark rounded-tl-[14px] rounded-tr-[14px] rounded-br-[4px] rounded-bl-[14px]"
    : "bg-rd-text text-white rounded-tl-[14px] rounded-tr-[14px] rounded-br-[4px] rounded-bl-[14px]";
  const agentBubbleClasses = isCoach
    ? "bg-rd-bg-soft text-rd-text rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px]"
    : "bg-rd-bg-soft text-rd-text rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px]";

  return (
    <div
      className={cn("flex", gapClass, isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div
          className={cn(
            avatarSize,
            "rounded-full bg-rd-primary-tint flex items-center justify-center flex-shrink-0 mt-[2px]",
          )}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-rd-primary" />
        </div>
      )}
      <div className={cn(bubbleMaxW, isUser && "flex flex-col items-end")}>
        {message.content && (
          <div
            className={cn(
              "max-w-full break-words",
              bubblePadding,
              isUser ? userBubbleClasses : agentBubbleClasses,
            )}
          >
            {isUser ? (
              <p className={cn(textSize, leading)}>{message.content}</p>
            ) : (
              <ReactMarkdown
                className={cn(
                  textSize,
                  leading,
                  "prose prose-sm prose-neutral max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                )}
                components={{
                  p: ({ children }) => (
                    <p className="my-1.5 leading-relaxed text-rd-text">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-rd-text">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-1.5 ml-4 list-disc">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-1.5 ml-4 list-decimal">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="my-0.5 text-rd-text">{children}</li>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-base font-semibold my-2 text-rd-text">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-semibold my-2 text-rd-text">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold my-1.5 text-rd-text">
                      {children}
                    </h3>
                  ),
                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="px-1 py-0.5 rounded bg-rd-bg-soft text-rd-text-secondary text-xs">
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-rd-text text-gray-100 rounded-lg p-3 overflow-x-auto my-2">
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
              onClick={handleDownload}
              disabled={downloading}
              className="text-xs gap-1.5"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {downloading ? "Preparing PDF…" : "Download CV as PDF"}
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
