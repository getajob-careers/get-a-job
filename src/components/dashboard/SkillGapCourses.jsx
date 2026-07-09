import React, { useState } from "react";
import { ExternalLink, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import GeneratingBanner from "@/components/ui/GeneratingBanner";

const COURSE_MESSAGES = [
  "Matching your skill gaps to courses…",
  "Selecting free & affordable options…",
  "Almost ready - finalising recommendations…",
];

export default function SkillGapCourses({ skillGaps }) {
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-learning-paths", {
        body: { skill_gaps: skillGaps },
      });

      if (error) throw error;

      setCourses(data?.courses || []);
    } catch (err) {
      console.error("Course recommendations error:", err);
      const msg = err?.message || "Couldn't load recommendations. Please try again.";
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  };

  if (skillGaps.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#0A0A0A]" />
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">
            Recommended Courses
          </p>
        </div>
        {!courses && (
          <Button
            onClick={fetchCourses}
            disabled={loading}
            size="sm"
            className="bg-[#0A0A0A] hover:bg-[#262626]"
          >
            {loading ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Loading...</>
            ) : (
              "Get Recommendations"
            )}
          </Button>
        )}
      </div>

      {loading && (
        <GeneratingBanner messages={COURSE_MESSAGES} subtitle="Loading recommendations - this takes ~10 seconds" />
      )}

      {error && !loading && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
          {error}
        </div>
      )}

      {courses && courses.length > 0 && (
        <div className="space-y-3 mt-4">
          {courses.map((course, i) => (
            <div key={i} className="border border-[#F0F0F0] rounded-lg p-3 hover:border-[#E5E5E5] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0A0A0A] mb-0.5">{course.course_title}</p>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F5F5] text-[#525252] rounded">
                      {course.platform}
                    </span>
                    <span className="text-[10px] text-[#A3A3A3]">{course.time_commitment}</span>
                  </div>
                  <p className="text-[11px] text-[#525252] mb-1.5 leading-relaxed">{course.description}</p>
                  <p className="text-[10px] text-[#A3A3A3] italic">
                    <span className="font-medium text-amber-600">Gap:</span> {course.skill_gap} - {course.relevance}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(course.course_title + " " + course.platform)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-[#0A0A0A] hover:text-[#525252] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
          <button
            onClick={fetchCourses}
            className="w-full text-xs text-[#525252] hover:text-[#0A0A0A] transition-colors py-1"
          >
            Refresh recommendations
          </button>
        </div>
      )}
    </div>
  );
}