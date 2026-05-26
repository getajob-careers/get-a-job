import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

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

  // Israel — top hubs, formatted with country suffix to match the
  // pattern of every other region in this list. The full 26-city
  // enumeration that used to live here was disproportionate to the
  // ~5-10 cities per other country and broadcast a single-country
  // affiliation; trimmed to the tech-hub cluster + remote.
  "Tel Aviv, Israel", "Jerusalem, Israel", "Haifa, Israel", "Herzliya, Israel",
  "Ra'anana, Israel", "Ramat Gan, Israel", "Be'er Sheva, Israel",
  "Netanya, Israel", "Modi'in, Israel", "Remote (Israel)",

  // Other
  "Remote (Global)", "Willing to Relocate",
];

export default function AutocompleteInput({ label, value, onChange, placeholder, suggestionType = "location" }) {
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
      const filtered = sourceList.filter((item) =>
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
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
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">
          {label}
        </label>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value && value.trim() && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className="text-sm"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-[#F5F5F5] text-[#0A0A0A]"
                  : "text-[#525252] hover:bg-[#FAFAFA]"
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