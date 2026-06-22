import React from "react";
import { Link } from "react-router-dom";
import policyMd from "../content/privacy-policy.md?raw";

// Public Privacy Policy page, served at /privacy OUTSIDE the auth gate (see the
// public-routes block in App.jsx) so a Chrome Web Store reviewer and logged-out
// users can open it. The policy text is the single source of truth in
// src/content/privacy-policy.md — imported verbatim with Vite's ?raw and
// rendered here, so the finalized legal wording is never transcribed by hand.
// Design mirrors Terms.jsx: cream background, Rokkitt headings, coral accents,
// narrow reading column, no app chrome.

// ── Inline markdown: **bold**, *italic*, bare URLs, emails ───────────────────
function renderInline(text, kp) {
  const nodes = [];
  let rest = String(text);
  let k = 0;
  const re =
    /(\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s)]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const tok = m[0];
    const key = `${kp}-${k++}`;
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-rd-text">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("*")) {
      nodes.push(<em key={key}>{tok.slice(1, -1)}</em>);
    } else if (/^https?:/.test(tok)) {
      nodes.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="text-rd-coral hover:text-rd-coral-dark font-medium break-words"
        >
          {tok}
        </a>,
      );
    } else {
      nodes.push(
        <a
          key={key}
          href={`mailto:${tok}`}
          className="text-rd-coral hover:text-rd-coral-dark font-medium"
        >
          {tok}
        </a>,
      );
    }
    rest = rest.slice(m.index + tok.length);
  }
  return nodes;
}

const isBlank = (l) => l.trim() === "";
const isHr = (l) => l.trim() === "---";
const isHeading = (l) => /^#{1,6}\s/.test(l);
const isTableRow = (l) => l.trimStart().startsWith("|");
const isListItem = (l) => /^\s*-\s+/.test(l);

function parseBlocks(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    if (isHr(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ type: "h", level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++]);
      blocks.push({ type: "table", rows });
      continue;
    }
    if (isListItem(line)) {
      const items = [];
      while (i < lines.length && isListItem(lines[i]))
        items.push(lines[i++].replace(/^\s*-\s+/, ""));
      blocks.push({ type: "ul", items });
      continue;
    }
    // paragraph — gather soft-wrapped lines until a block boundary
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isHr(lines[i]) &&
      !isHeading(lines[i]) &&
      !isTableRow(lines[i]) &&
      !isListItem(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push({ type: "p", lines: para });
  }
  return blocks;
}

const tableCells = (row) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function MarkdownDoc({ md }) {
  const blocks = parseBlocks(md);
  return (
    <>
      {blocks.map((b, idx) => {
        const key = `b${idx}`;
        if (b.type === "hr")
          return <hr key={key} className="border-rd-border my-8" />;
        if (b.type === "h") {
          if (b.level === 1)
            return (
              <h1
                key={key}
                className="font-display font-bold text-[32px] sm:text-[36px] leading-tight mt-6 mb-2"
              >
                {renderInline(b.text, key)}
              </h1>
            );
          if (b.level === 2)
            return (
              <h2
                key={key}
                className="font-display font-bold text-[20px] sm:text-[22px] text-rd-text mt-10 mb-3 scroll-mt-20"
              >
                {renderInline(b.text, key)}
              </h2>
            );
          return (
            <h3
              key={key}
              className="font-display font-semibold text-[15.5px] sm:text-[16px] text-rd-text mt-6 mb-1.5"
            >
              {renderInline(b.text, key)}
            </h3>
          );
        }
        if (b.type === "ul")
          return (
            <ul
              key={key}
              className="list-disc pl-5 space-y-1.5 mt-3 text-[14px] sm:text-[14.5px] text-rd-text-secondary leading-[1.6]"
            >
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        if (b.type === "table") {
          const header = tableCells(b.rows[0]);
          const body = b.rows.slice(2).map(tableCells); // row[1] is the |---| separator
          return (
            <div key={key} className="overflow-x-auto mt-4">
              <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr>
                    {header.map((cell, j) => (
                      <th
                        key={j}
                        className="text-left font-display font-semibold text-rd-text border-b border-rd-border px-2.5 py-2 align-top"
                      >
                        {renderInline(cell, `${key}-h${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="border-b border-rd-border-subtle px-2.5 py-2 align-top text-rd-text-secondary leading-[1.5]"
                        >
                          {renderInline(cell, `${key}-${r}-${j}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // paragraph — soft line breaks preserved
        return (
          <p
            key={key}
            className="text-[14px] sm:text-[14.5px] text-rd-text-secondary leading-[1.65] mt-3"
          >
            {b.lines.map((l, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l, `${key}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-rd-bg-page text-rd-text">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link
          to="/"
          className="text-rd-coral hover:text-rd-coral-dark text-sm font-medium inline-flex items-center gap-1"
        >
          ← Back to Get A Job
        </Link>

        <article className="mt-6">
          <MarkdownDoc md={policyMd} />
        </article>

        {/* Footer cross-links — keeps the Privacy/Terms pair discoverable
            without leaning on the app's authenticated chrome. */}
        <footer className="mt-16 pt-6 border-t border-rd-border-subtle flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-rd-text-tertiary">
          <span>© 2026 Get A Job</span>
          <div className="flex items-center gap-4">
            <Link
              to="/terms"
              className="text-rd-coral hover:text-rd-coral-dark font-medium"
            >
              Terms of Service
            </Link>
            <Link
              to="/"
              className="text-rd-coral hover:text-rd-coral-dark font-medium"
            >
              Home
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
