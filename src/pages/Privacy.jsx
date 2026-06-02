import React from "react";
import { Link } from "react-router-dom";

// Privacy placeholder — route shell so the consent-checkbox link on
// /login resolves. Real privacy content lands in a follow-up PR.
//
// The layout deliberately mirrors Terms.jsx so the pair feels like one
// pass. Cream background + Rokkitt heading + system body, no chrome.
export default function Privacy() {
  return (
    <div className="min-h-screen bg-rd-bg-page text-rd-text">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          to="/login"
          className="text-rd-coral hover:text-rd-coral-dark text-sm font-medium inline-flex items-center gap-1"
        >
          ← Back to sign in
        </Link>
        <h1 className="font-display font-bold text-3xl mt-6 mb-4">
          Privacy Policy
        </h1>
        <p className="text-rd-text-secondary text-sm leading-relaxed">
          Placeholder. The full privacy policy is being drafted and lands
          here shortly. If you have a specific question in the meantime,
          email{" "}
          <a
            href="mailto:eli@getajob.careers"
            className="text-rd-coral hover:text-rd-coral-dark font-medium"
          >
            eli@getajob.careers
          </a>
          .
        </p>
      </div>
    </div>
  );
}
