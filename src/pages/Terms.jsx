import React from "react";
import { Link } from "react-router-dom";

// Terms of Service — real content for launch. Tone is legitimate-policy
// (no "draft" banner). Mirrors Privacy.jsx structurally so the pair
// feels like one pass.

const LAST_UPDATED = "2026-06-07";

function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-10">
      <h2 className="font-display font-bold text-[20px] sm:text-[22px] text-rd-text mb-3 scroll-mt-20">
        {title}
      </h2>
      <div className="text-[14px] sm:text-[14.5px] text-rd-text-secondary leading-[1.65] space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-rd-bg-page text-rd-text">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link
          to="/"
          className="text-rd-coral hover:text-rd-coral-dark text-sm font-medium inline-flex items-center gap-1"
        >
          ← Back to Get A Job
        </Link>

        <h1 className="font-display font-bold text-[32px] sm:text-[36px] mt-6 mb-2 leading-tight">
          Terms of Service
        </h1>
        <p className="text-[12.5px] text-rd-text-tertiary font-mono">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-8 text-[14px] sm:text-[14.5px] text-rd-text-secondary leading-[1.65]">
          <p>
            These Terms of Service (the &ldquo;<strong>Terms</strong>&rdquo;) govern your access to and use of the Get A Job website at <a href="https://getajob.careers" className="text-rd-coral hover:text-rd-coral-dark font-medium">getajob.careers</a> and the related products and services (collectively, the &ldquo;<strong>Service</strong>&rdquo;). The Service is operated by Get A Job (&ldquo;<strong>Get A Job</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>our</strong>,&rdquo; or &ldquo;<strong>us</strong>&rdquo;), based in Israel.
          </p>
          <p className="mt-3">
            By creating an account or using the Service, you agree to be bound by these Terms and by our{" "}
            <Link to="/privacy" className="text-rd-coral hover:text-rd-coral-dark font-medium">Privacy Policy</Link>
            . If you do not agree, do not use the Service.
          </p>
        </div>

        <Section id="service" title="1. The Service">
          <p>
            Get A Job is an AI-powered career operating system designed primarily for early-career job seekers entering the Israeli tech market. The Service helps you prepare for, apply to, and follow through on job opportunities — including AI-generated career analysis, tailored CVs, LinkedIn content, interview preparation, networking outreach, and application tracking.
          </p>
          <p>
            <strong className="font-display text-rd-text">The Service is a tool, not a guarantee.</strong> Using Get A Job does not guarantee employment, job interviews, recruiter responses, salary outcomes, or any other career result. Job-market outcomes depend on many factors outside our control — the quality of your inputs, the labour market, employer decisions, and your own actions.
          </p>
        </Section>

        <Section id="eligibility" title="2. Eligibility">
          <p>
            You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Service. By using the Service, you represent that you meet this requirement, that you have the legal capacity to enter into these Terms, and that you are not barred from using the Service under applicable law.
          </p>
        </Section>

        <Section id="account" title="3. Your account">
          <p>
            You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You agree to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Provide accurate and current information when creating your account and updating your profile;</li>
            <li>Keep your password confidential and not share your account;</li>
            <li>Notify us immediately at{" "}
              <a href="mailto:security@getajob.careers" className="text-rd-coral hover:text-rd-coral-dark font-medium">security@getajob.careers</a>
              {" "}if you suspect unauthorized access;
            </li>
            <li>Comply with these Terms and all applicable laws.</li>
          </ul>
        </Section>

        <Section id="pilot-access" title="4. Pilot access">
          <p>
            Get A Job is currently offered free of charge as part of a limited pilot. We do not collect or process payment information at this time, and there is no automatic conversion to a paid plan: your free pilot access does not turn into a paid subscription on its own.
          </p>
          <p>
            We may introduce paid subscription plans in the future. If we do, we will give you reasonable advance notice and updated Terms before any charge is taken. You will not be charged unless you actively sign up for a paid plan after that notice.
          </p>
          <p>
            During the pilot we may also change, suspend, or discontinue features at any time as we learn what works. We will try to give notice when changes are material.
          </p>
        </Section>

        <Section id="acceptable-use" title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Provide false or misleading information about your background, experience, or qualifications;</li>
            <li>Upload another person&rsquo;s personal data (e.g., a colleague&rsquo;s CV, an interviewer&rsquo;s contact details) without that person&rsquo;s consent;</li>
            <li>Use the Service to harass, defame, or harm any person, or to send unsolicited bulk messages;</li>
            <li>Scrape, crawl, or otherwise extract data from the Service except as expressly permitted in writing;</li>
            <li>Reverse engineer, decompile, or attempt to extract the underlying models, prompts, or proprietary logic of the Service;</li>
            <li>Use the Service to build a competing product or service;</li>
            <li>Interfere with the Service&rsquo;s security or operation, attempt to gain unauthorized access to other accounts, or transmit malicious code;</li>
            <li>Use the Service in violation of any applicable law or third-party rights.</li>
          </ul>
          <p className="!mt-4">
            We may investigate and take action against violations, including suspending or terminating accounts.
          </p>
        </Section>

        <Section id="ip" title="6. Intellectual property">
          <p>
            <strong className="font-display text-rd-text">Our property.</strong> The Service — including the software, the look and feel, the underlying models and prompts, the role and skill libraries, and all other materials we provide — is owned by Get A Job or our licensors and is protected by intellectual-property laws. Except for the limited license we grant you to use the Service in accordance with these Terms, no rights are transferred to you.
          </p>
          <p>
            <strong className="font-display text-rd-text">Your content.</strong> You retain ownership of the content you submit to the Service — including your profile data, uploaded CVs, and any text you write. You grant Get A Job a worldwide, non-exclusive, royalty-free license to host, store, process, transmit, and display your content for the limited purpose of operating the Service and providing the features you have requested. This license includes the right to transmit your content to the subprocessors listed in our{" "}
            <Link to="/privacy" className="text-rd-coral hover:text-rd-coral-dark font-medium">Privacy Policy</Link>
            {" "}(for example, sending your profile and prompt to OpenAI to generate a CV). The license ends when you delete the relevant content or your account, except as required to comply with law or as described in the Privacy Policy.
          </p>
          <p>
            <strong className="font-display text-rd-text">AI outputs.</strong> Subject to your compliance with these Terms, you may use the AI-generated outputs we produce for you (CVs, LinkedIn posts, outreach drafts, etc.) for your personal job-search purposes. AI outputs may not be unique to you and may resemble outputs generated for other users.
          </p>
        </Section>

        <Section id="ai-disclaimer" title="7. AI output disclaimer">
          <p>
            The Service uses large language models (currently provided by OpenAI) to generate text from your inputs. AI-generated outputs may be inaccurate, incomplete, out of date, or unsuitable for your specific situation. They are <strong className="font-display text-rd-text">drafts, not finished products</strong>.
          </p>
          <p>
            You are responsible for reviewing every AI-generated output before relying on it or sending it to a third party. In particular, you should manually check tailored CVs, outreach messages, LinkedIn posts and comments, and any factual claims about yourself, your employers, your education, or other people before they leave the Service. Get A Job is not responsible for the consequences of an AI output you sent without reviewing it.
          </p>
        </Section>

        <Section id="no-advice" title="8. No professional advice">
          <p>
            The Service provides AI-assisted career tooling. It does <strong className="font-display text-rd-text">not</strong> provide legal advice, financial advice, medical advice, immigration advice, or licensed career-counselling services. Any guidance the Service provides is informational only and should not be relied on as a substitute for advice from a qualified professional.
          </p>
        </Section>

        <Section id="disclaimers" title="9. Disclaimers">
          <p className="uppercase tracking-wide text-[12.5px] text-rd-text">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
          </p>
          <p>
            The Service is provided &ldquo;<strong>as is</strong>&rdquo; and &ldquo;<strong>as available</strong>,&rdquo; without warranties of any kind, whether express, implied, or statutory — including warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy. We do not warrant that the Service will be uninterrupted, error-free, secure, or that defects will be corrected; that the AI outputs will be accurate, complete, or suitable for any particular purpose; or that using the Service will result in any specific job-search outcome.
          </p>
        </Section>

        <Section id="liability" title="10. Limitation of liability">
          <p className="uppercase tracking-wide text-[12.5px] text-rd-text">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
          </p>
          <p>
            In no event will Get A Job, its founders, employees, or service providers be liable to you for any indirect, incidental, special, consequential, exemplary, or punitive damages — including loss of profits, revenue, data, goodwill, or job opportunities — arising out of or relating to your use of the Service, even if we have been advised of the possibility of such damages.
          </p>
          <p>
            Our total cumulative liability to you for all claims arising out of or relating to the Service in any twelve-month period will not exceed the greater of (a) the total amount you paid us in the twelve months preceding the event giving rise to the claim, or (b) one hundred US dollars (US$100).
          </p>
          <p>
            Some jurisdictions do not allow the exclusion or limitation of certain damages. To the extent such laws apply to you, the disclaimers and limitations above apply only to the maximum extent permitted by law and do not limit any liability that cannot be limited.
          </p>
        </Section>

        <Section id="termination" title="11. Termination">
          <p>
            You may stop using the Service at any time and delete your account from <strong className="font-display text-rd-text">Settings → Danger zone</strong>. We may suspend or terminate your access to the Service if you violate these Terms, if we are required to do so by law, if continued operation would create an unreasonable risk to us or other users, or if we discontinue the Service. Where reasonably possible, we will give you notice.
          </p>
          <p>
            On termination, your right to use the Service ends, and the provisions of these Terms that by their nature should survive termination — including IP ownership, disclaimers, limitations of liability, and governing law — will survive.
          </p>
        </Section>

        <Section id="governing-law" title="12. Governing law and disputes">
          <p>
            These Terms are governed by the laws of the State of Israel, without regard to its conflict-of-laws rules. The competent courts of Tel Aviv–Jaffa, Israel, have exclusive jurisdiction over any dispute arising out of or in connection with these Terms or the Service, except where applicable law gives consumers in your jurisdiction a non-waivable right to bring proceedings in their local courts.
          </p>
          <p>
            Before starting formal proceedings, we encourage you to contact us at{" "}
            <a href="mailto:legal@getajob.careers" className="text-rd-coral hover:text-rd-coral-dark font-medium">legal@getajob.careers</a>
            {" "}so we can try to resolve the issue informally.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to these Terms">
          <p>
            We may update these Terms from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date at the top of this page. If the changes are material, we will provide reasonable notice (for example, by email or via an in-app notice) before they take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms. If you do not accept the changes, your remedy is to stop using the Service and delete your account.
          </p>
        </Section>

        <Section id="misc" title="14. Miscellaneous">
          <p>
            These Terms (together with the{" "}
            <Link to="/privacy" className="text-rd-coral hover:text-rd-coral-dark font-medium">Privacy Policy</Link>
            ) are the entire agreement between you and Get A Job regarding the Service and supersede any prior agreements. If any provision is held unenforceable, the remaining provisions remain in effect. Our failure to enforce any right or provision is not a waiver of that right or provision. You may not assign these Terms without our prior written consent; we may assign them to a successor in connection with a merger, acquisition, or sale of assets.
          </p>
        </Section>

        <Section id="contact" title="15. Contact us">
          <p>
            Get A Job, Israel.
          </p>
          <p>
            Email:{" "}
            <a href="mailto:legal@getajob.careers" className="text-rd-coral hover:text-rd-coral-dark font-medium">
              legal@getajob.careers
            </a>
          </p>
        </Section>

        <footer className="mt-16 pt-6 border-t border-rd-border-subtle flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-rd-text-tertiary">
          <span>© 2026 Get A Job</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-rd-coral hover:text-rd-coral-dark font-medium">
              Privacy Policy
            </Link>
            <Link to="/" className="text-rd-coral hover:text-rd-coral-dark font-medium">
              Home
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
