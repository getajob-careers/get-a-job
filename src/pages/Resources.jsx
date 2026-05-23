import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import NetworkingPrinciples from "@/components/linkedin/networking/NetworkingPrinciples";

const GUIDES = [
  {
    title: "LinkedIn Networking — Strategy & Principles",
    component: NetworkingPrinciples,
  },
  {
    title: "How to Read a Job Description",
    content: `Most students read job descriptions and feel immediately disqualified. That's because they're reading them wrong.

**What a Job Description Actually Is:**
A job description is a wishlist — not a minimum requirement list. Companies write the ideal candidate. They rarely get that person.

**How to Read It Correctly:**
1. Split requirements into: Must Have vs. Nice to Have
2. Look for keywords that repeat — those are the actual priorities
3. Ignore inflated requirements (e.g., "5 years experience" for junior roles)
4. Focus on the 3 core responsibilities — that's 80% of the job
5. Note every tool and software mentioned — that's your skills gap list

**The 70% Rule:**
If you meet 70% of the listed requirements, the role is likely within range. Below 50% = Track 3 territory.

**What NOT To Do:**
- Do not read the full description and apply immediately
- Do not skip the "required skills" section
- Do not assume you need every qualification listed
- Do not apply without mapping your skills to the specific requirements

**Practical Exercise:**
Take any job description. Highlight: core responsibilities in blue, required skills in red, tools in green. Then map each red/green item to something on your profile. What's unmatched? That's your gap list.`,
  },
  {
    title: "How Hiring Works",
    content: `Most hiring doesn't happen through job boards. Here's how it actually works:

**1. Internal Referrals**
Companies prioritize candidates referred by current employees. Referred candidates are 4x more likely to be hired. This is not favoritism — it's risk reduction. A referral signals pre-vetting.

**2. Recruiter Sourcing**
Recruiters actively search LinkedIn, GitHub, and industry networks for candidates with specific skill matches. If your profile doesn't match the keywords, you're invisible.

**3. Job Postings**
Public postings receive hundreds of applications. Most are filtered by ATS (Applicant Tracking Systems) before a human sees them. Only 2-5% of applicants typically get interviews through cold applications.

**4. The Hidden Market**
An estimated 70-80% of positions are never publicly posted. They're filled through networks, referrals, and direct outreach.

**What This Means For You:**
- Cold applying alone is the lowest-probability strategy
- Building relationships with people at target companies is essential
- Your LinkedIn profile is your public resume — optimize it
- Skills must be demonstrable, not just listed`,
  },
  {
    title: "Why Referrals Matter",
    content: `Referrals are not about "who you know." They're about reducing hiring risk.

**The Employer's Perspective:**
- A referral means someone inside the company vouches for you
- It reduces the risk of a bad hire (which costs 30-50% of annual salary)
- Referred candidates are hired 55% faster than those from career sites

**How To Get Referrals Without "Networking":**
1. Identify people at your target company on LinkedIn
2. Send a specific, concise message explaining what role you're interested in and why
3. Ask for a 15-minute informational conversation — not a referral
4. Demonstrate competence in the conversation
5. Follow up with a thank you and your resume

**What NOT To Do:**
- Don't ask strangers for referrals immediately
- Don't send generic "I'd love to connect" messages
- Don't mass-message 50 people at the same company
- Don't treat networking as a transaction

**Key Principle:**
Referrals are earned through demonstrated competence and genuine professional interest, not through volume of requests.`,
  },
  {
    title: "How To Use LinkedIn Correctly",
    content: `LinkedIn is a professional search engine. Treat it like one.

**Profile Optimization:**
- Headline: Use your target role + key skills (not "Aspiring" or "Looking for opportunities")
- Summary: 3-4 sentences describing what you do, what you know, and what you're building toward
- Experience: Focus on measurable outcomes, not responsibilities
- Skills: List only skills you can demonstrate in an interview

**Content Strategy:**
- Share projects you've completed (with learnings)
- Comment thoughtfully on industry posts
- Post about skills you're building (not motivational content)
- Engage with employees at target companies

**What To Avoid:**
- "Open to work" badges (controversial but often seen as desperate by recruiters)
- Sharing every certification without context
- Posting motivational quotes instead of professional insights
- Having an incomplete profile

**Search Optimization:**
Recruiters search by: job title, skills, location, and company.
If these aren't in your profile, you won't appear in searches.`,
  },
  {
    title: "How To Prepare Before Applying",
    content: `Applying without preparation is wasting your time and the employer's.

**Before You Apply, Verify:**
1. You meet at least 70% of the listed requirements
2. You can articulate why you want THIS role at THIS company
3. Your resume is tailored to this specific position
4. You've researched the company's recent news, products, and challenges
5. You have (or are building) a connection at the company

**Application Checklist:**
- Resume customized for the role (not a generic version)
- Cover letter that addresses specific job requirements (if required)
- Portfolio/projects that demonstrate relevant skills
- LinkedIn profile that matches your application
- Prepared answers for "Why this company?" and "Why this role?"

**The 70% Rule:**
If you meet less than 70% of the requirements, the role is likely Track 2 or Track 3. Apply strategically — don't waste applications on roles where you have less than 50% match.

**Quality Over Quantity:**
5 well-prepared applications will outperform 50 cold applications. Every time.`,
  },
  {
    title: "How to Interpret Rejection",
    content: `Rejection is data. Most students treat it as identity. It's not.

**What Rejection Actually Means:**
- You were not the best match for that role at that moment
- It says nothing about your long-term career potential
- It often reflects hiring priorities you cannot see (internal candidates, budget freezes, role changes)

**Why Rejection Happens (Usually):**
1. Skill mismatch — you were under-qualified or over-qualified
2. CV/application was generic — didn't match the language of the job
3. No internal champion — you cold applied without a referral
4. Timing — role was already filled internally when you applied
5. Interview performance — specific gap in communication or technical depth

**How to Extract Signal From Rejection:**
- If rejected before interview: problem is CV, application, or skills on paper
- If rejected after first interview: problem is interview communication or fit perception
- If rejected after final round: problem is a specific technical or cultural mismatch

**What To Do After Rejection:**
1. Log it in your tracker with a reason hypothesis
2. Identify which stage it happened
3. Update your gap list accordingly
4. Do NOT apply to the same company again immediately
5. Do NOT take it personally — move to next application with improved process

**Key Principle:**
5 structured applications with learning loops will outperform 50 emotional applications. Every time.`,
  },
  {
    title: "How To Close Skill Gaps",
    content: `Identifying a skill gap is step one. Closing it requires structured action.

**The Skill Gap Closure Framework:**

**Step 1: Identify the Exact Gap**
- Compare job requirements to your current skills
- Be specific: "Python data analysis" not just "coding"
- Prioritize gaps that appear in multiple Track 1 roles

**Step 2: Learn the Skill**
- Take one focused course (not five)
- Prefer project-based learning over lecture-based
- Set a 2-4 week completion timeline
- Recommended: Coursera, edX, or industry-specific platforms

**Step 3: Build a Project**
- Apply the skill in a real or realistic project
- Document the process and outcomes
- Make it publicly visible (GitHub, portfolio site)
- This is your proof of competence

**Step 4: Network Around the Skill**
- Share what you built on LinkedIn
- Connect with professionals who use this skill daily
- Ask for feedback on your project
- This creates visibility and credibility simultaneously

**Step 5: Update Everything**
- Add the skill to your profile
- Update your resume
- Recalculate your role qualifications

**Key Principle:**
One skill, fully demonstrated, is worth more than five skills listed on a resume.`,
  },
];

export default function Resources() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
          Resources
        </h1>
        <p className="text-sm text-[#A3A3A3] mt-1">
          Structured guides on how hiring actually works.
        </p>
      </div>

      <div className="space-y-3">
        {GUIDES.map((guide, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-6 py-5 flex items-center justify-between text-left"
            >
              <h2 className="text-sm font-semibold text-[#0A0A0A]">
                {guide.title}
              </h2>
              {openIndex === i ? (
                <ChevronUp className="w-4 h-4 text-[#A3A3A3] flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A3A3A3] flex-shrink-0" />
              )}
            </button>
            {openIndex === i && (
              <div className="px-6 pb-6 border-t border-[#F0F0F0] pt-4">
                {guide.component ? (
                  <guide.component />
                ) : (
                <div className="prose-career">
                  {guide.content.split("\n").map((line, j) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return (
                        <h3
                          key={j}
                          className="text-sm font-semibold text-[#0A0A0A] mt-4 mb-1"
                        >
                          {line.replace(/\*\*/g, "")}
                        </h3>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <p
                          key={j}
                          className="text-sm text-[#525252] pl-4 py-0.5 leading-relaxed"
                        >
                          {line}
                        </p>
                      );
                    }
                    if (line.match(/^\d+\./)) {
                      return (
                        <p
                          key={j}
                          className="text-sm text-[#525252] pl-4 py-0.5 leading-relaxed"
                        >
                          {line}
                        </p>
                      );
                    }
                    if (line.trim() === "") return <div key={j} className="h-2" />;
                    return (
                      <p
                        key={j}
                        className="text-sm text-[#525252] leading-relaxed"
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}