import React from "react";
import { Check, Circle } from "lucide-react";
import { MIN_LEN } from "@/lib/passwordPolicy";

// Visual checklist of the 5 client-side password rules. Used by both the
// in-app change-password card and the signup form. The HIBP rule is
// server-side only — surfaced as a hint underneath rather than a row.

function RequirementRow({ ok, label }) {
  const Icon = ok ? Check : Circle;
  const color = ok ? "text-emerald-600" : "text-[#A3A3A3]";
  return (
    <li className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{label}</span>
    </li>
  );
}

export default function PasswordRequirements({ checks, showLeakedHint = true }) {
  return (
    <>
      <ul aria-label="Password requirements" className="text-[11px] mt-2 space-y-1">
        <RequirementRow ok={checks.length}    label={`At least ${MIN_LEN} characters`} />
        <RequirementRow ok={checks.lowercase} label="Lowercase letter (a–z)" />
        <RequirementRow ok={checks.uppercase} label="Uppercase letter (A–Z)" />
        <RequirementRow ok={checks.digit}     label="Number (0–9)" />
        <RequirementRow ok={checks.symbol}    label="Symbol (e.g. !@#$%^&*)" />
      </ul>
      {showLeakedHint && (
        <p className="text-[11px] text-[#A3A3A3] mt-1.5">
          We also check against known leaked passwords once you submit.
        </p>
      )}
    </>
  );
}
