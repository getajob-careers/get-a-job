import React, { useState, useRef, useEffect } from "react";

// RdAutocompleteInput — redesign fork of AutocompleteInput.
//
// Behaviour parity with the canonical AutocompleteInput is intentional:
//   - Same LOCATION_SUGGESTIONS list (same source-of-truth strings)
//   - Same `suggestionType` API (only "location" today; reserved for
//     future)
//   - Same case-insensitive substring filter capped at 8 results
//   - Same keyboard handling (ArrowDown/Up, Enter, Escape)
//
// Visual changes:
//   - Input uses --rd-* tokens (coral focus ring, 10px radius)
//   - Dropdown uses --rd-primary-tint hover + warm border / shadow

const LOCATION_SUGGESTIONS = [
  // United States
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "San Francisco, CA",
  "Charlotte, NC", "Indianapolis, IN", "Seattle, WA", "Denver, CO", "Washington, DC",
  "Boston, MA", "Nashville, TN", "Detroit, MI", "Portland, OR", "Las Vegas, NV",
  "Miami, FL", "Atlanta, GA", "Minneapolis, MN", "Remote (US)",
  // United Kingdom
  "London, UK", "Manchester, UK", "Birmingham, UK", "Glasgow, UK", "Edinburgh, UK",
  "Liverpool, UK", "Leeds, UK", "Bristol, UK", "Cardiff, UK", "Remote (UK)",
  // Europe
  "Berlin, Germany", "Munich, Germany", "Paris, France", "Amsterdam, Netherlands",
  "Barcelona, Spain", "Madrid, Spain", "Rome, Italy", "Milan, Italy", "Zurich, Switzerland",
  "Dublin, Ireland", "Copenhagen, Denmark", "Stockholm, Sweden", "Oslo, Norway",
  "Brussels, Belgium", "Vienna, Austria", "Prague, Czech Republic", "Warsaw, Poland",
  "Remote (Europe)",
  // Asia
  "Singapore", "Hong Kong", "Tokyo, Japan", "Seoul, South Korea", "Beijing, China",
  "Shanghai, China", "Bangalore, India", "Mumbai, India", "Delhi, India", "Dubai, UAE",
  "Bangkok, Thailand", "Kuala Lumpur, Malaysia", "Manila, Philippines", "Jakarta, Indonesia",
  "Remote (Asia)",
  // Australia & New Zealand
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia", "Perth, Australia",
  "Auckland, New Zealand", "Wellington, New Zealand", "Remote (Australia/NZ)",
  // Canada
  "Toronto, Canada", "Vancouver, Canada", "Montreal, Canada", "Calgary, Canada",
  "Ottawa, Canada", "Remote (Canada)",
  // Israel — tech-hub cluster + remote (PR 2B preserves the pruning that
  // happened before; full 26-city list isn't restored here).
  "Tel Aviv, Israel", "Jerusalem, Israel", "Haifa, Israel", "Herzliya, Israel",
  "Ra'anana, Israel", "Ramat Gan, Israel", "Be'er Sheva, Israel",
  "Netanya, Israel", "Modi'in, Israel", "Remote (Israel)",
  // Other
  "Remote (Global)", "Willing to Relocate",
];

export default function RdAutocompleteInput({ label, value, onChange, placeholder, suggestionType = "location" }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && value.trim().length > 0) {
      const sourceList = suggestionType === "location" ? LOCATION_SUGGESTIONS : [];
      const filtered = sourceList
        .filter((item) => item.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, suggestionType]);

  const handleSelect = (item) => {
    onChange(item);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (p + 1) % suggestions.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (p - 1 + suggestions.length) % suggestions.length); }
      else if (e.key === "Enter") { e.preventDefault(); handleSelect(suggestions[selectedIndex]); }
      else if (e.key === "Escape") setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-[12px] font-semibold text-rd-text mb-1.5">{label}</label>
      )}
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value && value.trim() && suggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-primary focus:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-rd-bg-card border border-rd-border rounded-[12px] shadow-rd max-h-64 overflow-y-auto">
          {suggestions.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3.5 py-2.5 text-[13.5px] transition-colors ${
                index === selectedIndex
                  ? "bg-rd-primary-tint text-rd-text"
                  : "text-rd-text-secondary hover:bg-rd-bg-soft"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
