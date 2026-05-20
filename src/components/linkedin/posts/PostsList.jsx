import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Briefcase, Lightbulb, Award, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_META = {
  project: { Icon: Briefcase, label: "Project" },
  lessons: { Icon: Lightbulb, label: "Lessons" },
  milestone: { Icon: Award, label: "Milestone" },
  recap: { Icon: FileText, label: "Recap" },
  observation: { Icon: FileText, label: "Observation" },
  question: { Icon: FileText, label: "Question" },
  free_form: { Icon: FileText, label: "Free-form" },
};

// Past posts list — shown below the active compose flow.
// User clicks a post to reopen it (re-loads inputs + generated_data).
// Per Eli's call PR #32: list view paginates by created_at DESC.
export default function PostsList({ onOpen, refreshKey }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("linkedin_posts")
          .select("id, post_type, inputs, story_id, generated_data, edited_text, user_published_at, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!cancelled) setPosts(data || []);
      } catch (e) {
        console.error("posts list fetch:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, refreshKey]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("linkedin_posts").delete().eq("id", id);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post deleted.");
    } catch (e) {
      toast.error("Couldn't delete. " + (e.message || ""));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-[#9C9DA1]">
        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />Loading saved posts…
      </div>
    );
  }
  if (posts.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xs uppercase tracking-wider text-[#9C9DA1] font-medium mb-3">
        Your saved posts ({posts.length})
      </h3>
      <div className="space-y-2">
        {posts.map((p) => {
          const text = p.edited_text || p.generated_data?.post_text || "";
          const { Icon, label } = TYPE_META[p.post_type] || TYPE_META.free_form;
          const ageMs = Date.now() - new Date(p.created_at).getTime();
          const age = ageMs < 86400000
            ? `${Math.max(1, Math.floor(ageMs / 3600000))}h ago`
            : `${Math.floor(ageMs / 86400000)}d ago`;
          return (
            <div key={p.id} className="bg-white border border-[#DDDDDB] rounded-lg p-3 group hover:border-[#A3A3A3] transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#52545A]" />
                  <span className="text-[11px] font-medium text-[#52545A]">{label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs text-[#0E1014] line-clamp-2 leading-snug">{text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#9C9DA1]">{age}</span>
                    {p.edited_text && <span className="text-[10px] text-[#9C9DA1]">· edited</span>}
                    {p.story_id && <span className="text-[10px] text-[#9C9DA1]">· story-grounded</span>}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9C9DA1] hover:text-red-600 flex-shrink-0"
                  title="Delete post"
                >
                  {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
