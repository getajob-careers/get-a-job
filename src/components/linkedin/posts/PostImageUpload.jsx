import React, { useRef, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, X } from "lucide-react";

// PR 3J-B — restyled on rd-* tokens. Restyle-only on behavior — P7 image
// upload/removal semantics are byte-equivalent:
//   - Upload: Storage upload to linkedin_post_images/{user_id}/{post_id}_...
//     → linkedin_posts.UPDATE({ image_url }).eq("id", postId) (RLS via policy)
//   - Removal: linkedin_posts.UPDATE({ image_url: null }).eq("id", postId).
//     **DOES NOT delete the storage object** — by design, since parsing
//     the signed URL back to a path is fragile and orphan cost is trivial
//     (5MB cap × low volume). A periodic cleanup job can sweep later.
//
// Bucket RLS enforces "first folder segment must equal auth.uid()".
// Signed URLs are issued for ~10 years (same pattern as
// profiles.resume_url) so we can persist them instead of re-fetching.

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export default function PostImageUpload({ postId, imageUrl, onChange }) {
  const { user } = useAuth();
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFile = async (file) => {
    if (!file || !postId || !user?.id) return;
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
      const path = `${user.id}/${postId}_${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("linkedin_post_images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("linkedin_post_images")
        .createSignedUrl(path, 315360000); // ~10 years
      if (signErr) throw signErr;
      const nextUrl = signed?.signedUrl || null;
      const { error: persistErr } = await supabase
        .from("linkedin_posts")
        .update({ image_url: nextUrl })
        .eq("id", postId);
      if (persistErr) throw persistErr;
      onChange?.(nextUrl);
    } catch (e) {
      console.error("[post-image] upload failed:", e);
      toast.error("Couldn't upload image. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!postId || removing) return;
    setRemoving(true);
    try {
      // P7 invariant: we only clear the DB pointer — the storage object
      // stays put. Parsing the signed URL back into a path is fragile;
      // orphan cost is trivial at 5MB cap. A sweep job can clean later.
      const { error } = await supabase
        .from("linkedin_posts")
        .update({ image_url: null })
        .eq("id", postId);
      if (error) throw error;
      onChange?.(null);
    } catch (e) {
      console.error("[post-image] remove failed:", e);
      toast.error("Couldn't remove image.");
    } finally {
      setRemoving(false);
    }
  };

  if (imageUrl) {
    return (
      <div className="relative w-full max-w-[200px] rounded-[14px] overflow-hidden border border-rd-border">
        <img src={imageUrl} alt="Attached" className="w-full h-auto block" />
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="absolute top-1.5 right-1.5 bg-rd-text/70 text-white border-0 rounded-full w-[22px] h-[22px] flex items-center justify-center cursor-pointer hover:bg-rd-primary transition-colors"
          aria-label="Remove image"
          title="Remove image"
        >
          {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !postId}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-rd-border bg-transparent text-rd-text-secondary font-display font-semibold text-[12.5px] cursor-pointer transition-all hover:border-rd-primary hover:text-rd-primary hover:bg-rd-primary-tint disabled:opacity-50 disabled:cursor-not-allowed"
        title={!postId ? "Generate the post first, then add an image" : "Attach an image (JPG/PNG/WebP, ≤5 MB)"}
      >
        {uploading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
        ) : (
          <><ImageIcon className="w-3.5 h-3.5" />Add image</>
        )}
      </button>
    </>
  );
}
