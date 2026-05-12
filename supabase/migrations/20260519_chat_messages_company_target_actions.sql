-- chat_messages — add suggested_company_target_actions jsonb column so
-- the SUGGESTED_COMPANY_TARGET_JSON block emitted by ai-chat (career_agent
-- only) persists with the message and rehydrates on conversation reload.
-- Mirrors the existing suggested_application_actions column.
--
-- Also bumps admin_chat_messages() to surface the new column in the
-- admin chat log viewer (Admin.jsx ChatLogsCard).

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS suggested_company_target_actions jsonb;

-- Re-create admin_chat_messages with the new column in the return set.
DROP FUNCTION IF EXISTS admin_chat_messages(uuid, integer);

CREATE OR REPLACE FUNCTION admin_chat_messages(p_user_id uuid, p_limit integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  conversation_title text,
  agent text,
  application_id uuid,
  role text,
  content text,
  original_user_message text,
  is_error boolean,
  suggested_tasks jsonb,
  suggested_roadmap_changes jsonb,
  suggested_application_actions jsonb,
  suggested_company_target_actions jsonb,
  suggested_agent jsonb,
  suggested_cv_generation jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 OR p_limit > 500 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 500';
  END IF;
  RETURN QUERY
    SELECT
      cm.id,
      cm.conversation_id,
      c.title,
      c.agent,
      c.application_id,
      cm.role,
      cm.content,
      cm.original_user_message,
      cm.is_error,
      cm.suggested_tasks,
      cm.suggested_roadmap_changes,
      cm.suggested_application_actions,
      cm.suggested_company_target_actions,
      cm.suggested_agent,
      cm.suggested_cv_generation,
      cm.created_at
    FROM chat_messages cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE c.user_id = p_user_id
    ORDER BY cm.conversation_id, cm.created_at ASC
    LIMIT p_limit;
END $$;
