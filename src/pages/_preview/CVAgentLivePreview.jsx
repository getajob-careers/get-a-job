// DEV-only standalone preview of the live CV studio at /_preview/cv-agent-live.
// Wraps the real CVStudioLive container in the dashboard Layout so it can be
// viewed without the rest of the authenticated app. The real /CVAgent page
// renders CVStudioLive directly (App.jsx's LayoutWrapper provides Layout there).

import React from "react";
import Layout from "@/Layout";
import CVStudioLive from "@/components/cv-studio/CVStudioLive";

export default function CVAgentLivePreview() {
  return (
    <Layout currentPageName="CVAgent">
      <CVStudioLive />
    </Layout>
  );
}
