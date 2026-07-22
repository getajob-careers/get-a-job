// DEV-only DESIGN MOCK of the CV Agent — renders the shared CVStudioView with a
// fixture (no backend), inside the real Layout shell. This is the look/feel
// reference; the live, data-wired version is CVAgentLivePreview at
// /_preview/cv-agent-live. Both render the SAME CVStudioView so the mock can't
// drift from the real thing.
//
// Auth is stubbed + the profile cache seeded (mirrors ShellPreview) so Layout
// paints the sidebar without a real session. Editing is in-memory.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { AuthContext } from "@/lib/AuthContext";
import Layout from "@/Layout";
import CVStudioView from "@/components/cv-studio/CVStudioView";

const FIXTURE_UID = "cvagent-fixture-user";
const uid = () => Math.random().toString(36).slice(2, 9);

const CV_OPTIONS = [
  {
    id: "master",
    isMaster: true,
    tag: "Master",
    label: "Master CV",
    sub: "Your full, untailored CV",
    role: null,
    company: null,
  },
  {
    id: "pm-wix",
    isMaster: false,
    tag: "Tailored",
    label: "Product Manager",
    sub: "Wix · tailored copy",
    role: "Product Manager",
    company: "Wix",
  },
  {
    id: "da-monday",
    isMaster: false,
    tag: "Tailored",
    label: "Data Analyst",
    sub: "monday.com · tailored copy",
    role: "Data Analyst",
    company: "monday.com",
  },
];

const SAMPLE_TAILORS = [
  { role: "UX Researcher", company: "Fiverr" },
  { role: "Business Analyst", company: "Lemonade" },
  { role: "Product Analyst", company: "Riskified" },
  { role: "Growth Associate", company: "monday.com" },
];

const b = (text) => ({ id: uid(), text });
const tighten = (s) => {
  const first = String(s).split(/[.;]/)[0].trim();
  return first.length >= 24 ? first : String(s);
};

const INITIAL_MODEL = {
  header: {
    name: "Isaac Selig",
    headline: "",
    email: "isaacselig@gmail.com",
    linkedin: "LinkedIn/Portfolio",
    location: "Herzliya, Israel",
  },
  summary:
    "Business Administration student specializing in Digital Innovation with hands-on experience in software development, AI evaluation, and technical project management. Strong background in full-stack web development and working with LLMs in real-world production and QA environments. Comfortable bridging technical and business needs, with a proven ability to learn quickly and a strong drive to explore new technologies.",
  experiences: [
    {
      id: uid(),
      title: "AI Research & Evaluation Specialist",
      org: "Outlier",
      dates: "Nov 2024 – Present",
      bullets: [
        b(
          "Conducted evaluation and training tasks for advanced AI models, ensuring high-quality outputs across reasoning, creativity, and accuracy benchmarks",
        ),
        b(
          "Designed and refined prompts, test cases, and structured feedback loops to improve model performance",
        ),
        b(
          "Gained hands-on experience with LLMs, prompt engineering, and quality assurance workflows in cutting-edge AI projects",
        ),
      ],
    },
    {
      id: uid(),
      title: "Project Manager",
      org: "Anpr+",
      dates: "Jul 2022 – Jun 2023",
      bullets: [
        b(
          "Contributed to building the software architecture and laying down the initial coding base for the object-tracking project",
        ),
        b(
          "Transitioned into a leadership role, overseeing a small development team working on a parking lot ticketing and ANPR system",
        ),
        b(
          "Coordinated task allocation, sprint planning, and delivery milestones, ensuring timely progress and clear communication across stakeholders",
        ),
        b(
          "Balanced technical oversight with managerial responsibilities, bridging the gap between developers and business needs",
        ),
      ],
    },
    {
      id: uid(),
      title: "Junior Developer",
      org: "Tempus Trade Ltd",
      dates: "Apr 2021 – Nov 2021",
      bullets: [
        b("Built an affiliate website targeting a 60,000 user database"),
        b(
          "Improved SEO performance and conversion rates, increasing traffic and engagement",
        ),
        b(
          "Integrated with partner platforms and automated back-office functions",
        ),
      ],
    },
    {
      id: uid(),
      title: "Junior Developer",
      org: "Code Nation",
      dates: "Feb 2021 – May 2021",
      bullets: [
        b("Completed a 12-week bootcamp focused on the MERN stack"),
        b("Gained practical experience with GitHub, Docker, SQL, and Git Bash"),
        b(
          "Worked on collaborative projects, developing teamwork and accountability",
        ),
      ],
    },
  ],
  education: [
    {
      id: uid(),
      institution: "Reichman University",
      degree: "B.A. Business Administration in Digital Innovation",
      dates: "2026",
      field: "",
    },
    {
      id: uid(),
      institution: "King David High School",
      degree: "A-levels and GCSEs",
      dates: "",
      field: "A in Information Technology",
    },
    {
      id: uid(),
      institution: "Aleph Beis Coding Bootcamp",
      degree: "Coding Bootcamp",
      dates: "2017",
      field: "",
    },
  ],
  skills: [
    "MERN stack",
    "HTML",
    "CSS",
    "JavaScript",
    "PHP",
    "C#",
    "GitHub",
    "Docker",
    "SQL",
    "Git Bash",
    "Prompt engineering",
    "LLMs",
    "Quality assurance",
    "Software architecture",
    "Project management",
    "Sprint planning",
    "SEO",
    "Full-stack web development",
  ],
  languages: ["English", "Hebrew"],
};

const MockCoach = (
  <div className="flex gap-2.5">
    <div className="w-6 h-6 rounded-full bg-rd-primary-tint grid place-items-center shrink-0 mt-0.5">
      <FileText className="w-3 h-3 text-rd-primary" />
    </div>
    <div className="text-[12.5px] text-rd-text-secondary leading-relaxed space-y-2">
      <p>
        This CV shows strong, relevant experience — the AI evaluation work and
        the 60,000-user affiliate project stand out. The biggest wins now are
        tighter, measurable bullets and a one-line headline.
      </p>
      <p className="font-semibold text-rd-text">A few things I&apos;d fix:</p>
      <ul className="list-disc pl-4 space-y-1.5">
        <li>
          Add a headline (e.g. &quot;Full-Stack Developer &amp; AI Evaluation
          Specialist&quot;).
        </li>
        <li>
          Rewrite the Outlier and Anpr+ bullets with measurable outcomes, not
          responsibilities.
        </li>
        <li>
          Lead the Tempus bullet with the result (traffic / conversion lift),
          then the how.
        </li>
      </ul>
    </div>
  </div>
);

function MockStudio() {
  const [cv, setCv] = useState(INITIAL_MODEL);
  const [templateId, setTemplateId] = useState("modern");
  const [saveState, setSaveState] = useState("saved");
  const [cvList, setCvList] = useState(CV_OPTIONS);
  const [selectedCvId, setSelectedCvId] = useState("master");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const timer = useRef(null);

  const touch = () => {
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaveState("saved"), 650);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const upd = (fn) => {
    setCv(fn);
    touch();
  };

  const onPatchHeader = (p) =>
    upd((m) => ({ ...m, header: { ...m.header, ...p } }));
  const onPatchSummary = (v) => upd((m) => ({ ...m, summary: v }));
  // Section-keyed to match CVStudioView's contract (sectionKey first arg).
  const onPatchExp = (section, id, p) =>
    upd((m) => ({
      ...m,
      [section]: m[section].map((e) => (e.id === id ? { ...e, ...p } : e)),
    }));
  const onPatchBullet = (section, expId, bId, text) =>
    upd((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? {
              ...e,
              bullets: e.bullets.map((x) =>
                x.id === bId ? { ...x, text } : x,
              ),
            }
          : e,
      ),
    }));
  const onAddBullet = (section, expId) =>
    upd((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId ? { ...e, bullets: [...e.bullets, b("")] } : e,
      ),
    }));
  const onRemoveBullet = (section, expId, bId) =>
    upd((m) => ({
      ...m,
      [section]: m[section].map((e) =>
        e.id === expId
          ? { ...e, bullets: e.bullets.filter((x) => x.id !== bId) }
          : e,
      ),
    }));
  const onDragEnd = (section, result) => {
    if (!result.destination) return;
    upd((m) => {
      const next = [...m[section]];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return { ...m, [section]: next };
    });
  };
  const onPatchEdu = (id, p) =>
    upd((m) => ({
      ...m,
      education: m.education.map((e) => (e.id === id ? { ...e, ...p } : e)),
    }));
  const onPatchSkills = (line) =>
    upd((m) => ({
      ...m,
      skills: line
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  const onPatchLanguages = (line) =>
    upd((m) => ({
      ...m,
      languages: line
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean),
    }));

  const tailorNew = () => {
    const s =
      SAMPLE_TAILORS[
        (cvList.length - CV_OPTIONS.length) % SAMPLE_TAILORS.length
      ];
    const id = "t-" + uid();
    setCvList((l) => [
      ...l,
      {
        id,
        isMaster: false,
        tag: "Tailored",
        label: s.role,
        sub: `${s.company} · tailored copy`,
        role: s.role,
        company: s.company,
      },
    ]);
    setSelectedCvId(id);
    touch();
  };

  const onDeleteCv = (id) => {
    setCvList((l) => {
      const next = l.filter((o) => o.id !== id);
      if (id === selectedCvId) {
        const fb = next.find((o) => o.isMaster) || next[0];
        setSelectedCvId(fb ? fb.id : null);
      }
      return next;
    });
  };

  // Mock chat — illustrative. Recognizable chips apply a simple deterministic
  // edit so the chat→document loop is visible; the live route does real edits
  // via the edit-cv function.
  const onSendMessage = (text) => {
    setChatMessages((ms) => [
      ...ms,
      { id: uid(), role: "user", content: text },
    ]);
    setChatBusy(true);
    setTimeout(() => {
      const t = text.toLowerCase();
      let reply =
        "Got it — in the live version I'd edit the document directly here.";
      if (t.includes("tighten") || t.includes("bullet")) {
        setCv((m) => ({
          ...m,
          experiences: m.experiences.map((e) => ({
            ...e,
            bullets: e.bullets.map((x) => ({ ...x, text: tighten(x.text) })),
          })),
        }));
        setEditVersion((v) => v + 1);
        reply =
          "Tightened your bullets — led with the action, trimmed the filler.";
      } else if (t.includes("summary") || t.includes("headline")) {
        setCv((m) => ({
          ...m,
          header: {
            ...m.header,
            headline: "Full-Stack Developer & AI Evaluation Specialist",
          },
          summary:
            "Full-stack developer and AI-evaluation specialist who ships production web apps and rigorously tests LLM systems. Bridges technical build and business need, and learns fast with a bias for shipping.",
        }));
        setEditVersion((v) => v + 1);
        reply = "Rewrote your summary and added a headline.";
      } else if (t.includes("keyword")) {
        reply =
          "Surfaced ATS keywords already implied by your experience — no new facts invented.";
      } else if (t.includes("tailor")) {
        reply =
          "In the live version this tailors your CV to a specific job via refine-cv.";
      }
      setChatMessages((ms) => [
        ...ms,
        { id: uid(), role: "assistant", content: reply },
      ]);
      setChatBusy(false);
    }, 700);
  };

  const currentCv = cvList.find((o) => o.id === selectedCvId) || null;

  return (
    <CVStudioView
      key={`${selectedCvId}:${editVersion}`}
      cv={cv}
      onPatchHeader={onPatchHeader}
      onPatchSummary={onPatchSummary}
      onPatchExp={onPatchExp}
      onPatchBullet={onPatchBullet}
      onAddBullet={onAddBullet}
      onRemoveBullet={onRemoveBullet}
      onDragEnd={onDragEnd}
      onPatchEdu={onPatchEdu}
      onPatchSkills={onPatchSkills}
      onPatchLanguages={onPatchLanguages}
      templateId={templateId}
      onTemplateChange={setTemplateId}
      cvOptions={cvList}
      selectedCvId={selectedCvId}
      onSelectCv={setSelectedCvId}
      onTailorNew={tailorNew}
      onDeleteCv={onDeleteCv}
      currentCv={currentCv}
      saveState={saveState}
      onDownload={() => {}}
      coach={MockCoach}
      chatMessages={chatMessages}
      onSendMessage={onSendMessage}
      chatBusy={chatBusy}
    />
  );
}

export default function CVAgentPreview() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  );
  useEffect(() => {
    queryClient.setQueryData(["userProfile", FIXTURE_UID], {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Isaac Selig",
    });
  }, [queryClient]);

  const authValue = useMemo(
    () => ({
      user: { id: FIXTURE_UID, email: "isaacselig@gmail.com" },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Layout currentPageName="CVAgent">
          <MockStudio />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
