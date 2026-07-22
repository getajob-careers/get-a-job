import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import PostTypeGrid from "./posts/PostTypeGrid";
import PostComposeForm, { getDefaultsForType } from "./posts/PostComposeForm";
import PostPreview from "./posts/PostPreview";
import StoryBankSidebar from "./posts/StoryBankSidebar";
import PostsList from "./posts/PostsList";

// PostsTab — orchestrator for the LinkedIn Post Creator (Phase 2).
//
// Three view states:
//   - 'idle'      type grid + past posts list
//   - 'compose'   type selected, filling form (with optional Story Bank sidebar)
//   - 'preview'   post generated, viewing/editing/refining
//
// State machine:
//   idle --select-type--> compose
//   compose --back--> idle
//   compose --generate--> preview
//   preview --back--> compose
//   preview --refine--> preview (same row, generated_data overwritten)
//   list --open(post)--> preview (opens existing saved post)
//
// State persists to linkedin_posts table — generated_data verbatim from
// edge function, edited_text for user manual edits (preserved separately
// per Eli's call PR #32 for prompt-quality analysis).
export default function PostsTab() {
  const { user } = useAuth();
  const [view, setView] = useState("idle");
  const [activeType, setActiveType] = useState(null);
  const [inputs, setInputs] = useState({});
  const [attachedStoryId, setAttachedStoryId] = useState(null);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleSelectType = (postType) => {
    setActiveType(postType);
    setInputs(getDefaultsForType(postType));
    setAttachedStoryId(null);
    setGeneratedPost(null);
    setCurrentPostId(null);
    setError(null);
    setView("compose");
  };

  const handleBackToIdle = () => {
    setView("idle");
    setActiveType(null);
    setInputs({});
    setAttachedStoryId(null);
    setGeneratedPost(null);
    setCurrentPostId(null);
    setError(null);
  };

  const handleBackToCompose = () => {
    // Keep inputs + attached story so the user can tweak and regenerate.
    // Only the generated post is dropped from view; the row is still in DB.
    setGeneratedPost(null);
    // Keep currentPostId — if the user generates again with same inputs,
    // we'll create a new row (since "back to compose" suggests they're
    // starting a new generation). Reset it.
    setCurrentPostId(null);
    setView("compose");
  };

  const handleGenerate = async () => {
    if (generating || !user?.id) return;
    setError(null);
    setGenerating(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          post_type: activeType,
          inputs,
          story_id: attachedStoryId,
        },
      });
      if (invokeErr) {
        const status = invokeErr?.context?.status;
        if (status === 429) throw new Error("Rate limit reached (60/hour). Try again in a bit.");
        if (status === 404) throw new Error("Profile incomplete. Complete onboarding first.");
        throw new Error(invokeErr.message || "Generation failed. Please try again.");
      }
      if (!data?.post_text) throw new Error("AI returned an unexpected response.");
      setGeneratedPost(data);
      setCurrentPostId(data.post_id || null);
      setView("preview");
      setListRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message || "Couldn't generate post.");
      toast.error(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefineSuccess = (newPost, newPostId) => {
    setGeneratedPost(newPost);
    setCurrentPostId(newPostId);
    setListRefreshKey((k) => k + 1);
  };

  const handleOpenSavedPost = (post) => {
    setActiveType(post.post_type);
    // Strip the post_type that we stored alongside form inputs (it's
    // there for clarity when reading the row in the DB; the local
    // inputs object doesn't include it as a field).
    const { post_type: _ignore, ...formInputs } = post.inputs || {};
    setInputs(formInputs);
    setAttachedStoryId(post.story_id || null);
    setCurrentPostId(post.id);
    // Build a GeneratedPost shape from the row's generated_data + edited_text
    setGeneratedPost({
      ...post.generated_data,
      // If user edited, surface that as the textarea value via post_text
      post_text: post.edited_text || post.generated_data?.post_text || "",
    });
    setView("preview");
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Compose / preview flow: when active, sidebar shows alongside form */}
      {view === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-4">
          <div>
            <PostComposeForm
              postType={activeType}
              inputs={inputs}
              onChange={setInputs}
              onBack={handleBackToIdle}
              onGenerate={handleGenerate}
              generating={generating}
            />
            {error && (
              <div className="mt-3 px-3 py-2.5 rounded-[10px] bg-rd-primary-tint border border-rd-primary/30 text-[12.5px] text-rd-primary-dark flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>
          <StoryBankSidebar
            attachedStoryId={attachedStoryId}
            onAttach={setAttachedStoryId}
            onDetach={() => setAttachedStoryId(null)}
          />
        </div>
      )}

      {view === "preview" && generatedPost && (
        <PostPreview
          post={generatedPost}
          postId={currentPostId}
          inputs={inputs}
          postType={activeType}
          storyId={attachedStoryId}
          onRefineSuccess={handleRefineSuccess}
          onBack={handleBackToCompose}
        />
      )}

      {view === "idle" && (
        <>
          <PostTypeGrid onSelect={handleSelectType} />
          <PostsList onOpen={handleOpenSavedPost} refreshKey={listRefreshKey} />
        </>
      )}
    </div>
  );
}
