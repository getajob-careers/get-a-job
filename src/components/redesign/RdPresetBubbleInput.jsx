import React, { useState } from "react";
import { X } from "lucide-react";

// RdPresetBubbleInput — redesign fork of PresetBubbleInput.
//
// Behaviour parity with the canonical PresetBubbleInput is intentional:
//   - Same toggle semantics on preset chips
//   - Same custom-tag addition + remove behaviour (Enter/comma submit)
//   - Same array shape returned via onChange (single text[]; presets and
//     custom values coexist in the same array; consumer doesn't have to
//     distinguish)
//
// Visual changes:
//   - Preset chips: --rd-bg-card (inactive) / --rd-primary (active)
//   - Custom-tag pills: --rd-bg-soft with coral X on hover
//   - Input + Add button: coral focus ring + warm border

export default function RdPresetBubbleInput({
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
        <label className="block text-[12px] font-semibold text-rd-text mb-1.5">{label}</label>
      )}
      {description && (
        <p className="text-[11.5px] text-rd-text-secondary mb-2.5 leading-snug">{description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {(presets || []).map((preset) => {
          const isSelected = selected.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggle(preset)}
              className={
                isSelected
                  ? "text-[12px] font-display font-semibold px-3 py-1.5 rounded-full border bg-rd-primary text-white border-rd-primary hover:bg-rd-primary-dark hover:border-rd-primary-dark transition-colors"
                  : "text-[12px] font-display font-semibold px-3 py-1.5 rounded-full border bg-rd-bg-card text-rd-text-secondary border-rd-border hover:border-rd-border-hover hover:text-rd-text transition-colors"
              }
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
              className="inline-flex items-center gap-1.5 text-[12px] bg-rd-bg-soft text-rd-text px-2.5 py-1 rounded-md border border-rd-border font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="text-rd-text-secondary hover:text-rd-primary transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {allowCustom && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={customPlaceholder}
            className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-4 py-2.5 text-[13px] font-semibold rounded-full border border-rd-border text-rd-text bg-rd-bg-card hover:bg-rd-bg-soft transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
