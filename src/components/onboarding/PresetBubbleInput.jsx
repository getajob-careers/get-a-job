import React, { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Bubbles-by-default tag input used by StepCareerDirection (industries,
// work_environment) and StepConstraints (work_type). Renders a horizontal
// chip grid of presets the user can toggle, plus (optionally) a text input
// for adding custom values not in the preset list.
//
// Values are stored as a single text[] array regardless of whether they
// came from a preset or a custom entry. Custom entries are shown in a
// second row below the presets with a remove (X) affordance, so the user
// can tell them apart from the preset bubbles.

export default function PresetBubbleInput({
  label,
  description,
  presets,
  tags,
  onChange,
  allowCustom = true,
  customPlaceholder = "Or type your own and press Enter",
}) {
  const [input, setInput] = useState("");

  const selected = Array.isArray(tags) ? tags : [];
  const presetSet = new Set(presets || []);
  const customTags = selected.filter((t) => !presetSet.has(t));

  const toggle = (preset) => {
    onChange(
      selected.includes(preset)
        ? selected.filter((t) => t !== preset)
        : [...selected, preset]
    );
  };

  const addCustom = () => {
    const v = input.trim();
    if (!v) return;
    if (!selected.includes(v)) onChange([...selected, v]);
    setInput("");
  };

  const remove = (tag) => onChange(selected.filter((t) => t !== tag));

  return (
    <div>
      {label && (
        <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
          {label}
        </label>
      )}
      {description && <p className="text-xs text-[#A3A3A3] mb-2">{description}</p>}

      <div className="flex flex-wrap gap-1.5 mb-2">
        {(presets || []).map((preset) => {
          const isSelected = selected.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggle(preset)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                isSelected
                  ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                  : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      {customTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {customTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 text-xs bg-[#F5F5F5] text-[#525252] px-2.5 py-1 rounded-md border border-[#E5E5E5]"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {allowCustom && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={customPlaceholder}
            className="text-sm flex-1"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-3 py-2 text-xs font-medium border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
