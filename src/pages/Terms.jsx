import React from "react";
import { Link } from "react-router-dom";

// Terms placeholder — route shell so the consent-checkbox link on
// /login resolves. Real terms content lands in a follow-up PR.
//
// Mirrors Privacy.jsx so the pair feels like one pass.
export default function Terms() {
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
          Terms of Service
        </h1>
        <p className="text-rd-text-secondary text-sm leading-relaxed">
          Placeholder. The full terms of service are being drafted and
          land here shortly. If you have a specific question in the
          meantime, email{" "}
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
