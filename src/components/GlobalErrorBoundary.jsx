import React from 'react';
import { captureException } from '@/lib/analytics';

/**
 * GlobalErrorBoundary — catches any render error in the component tree below it
 * and renders a clean "something went wrong" UI instead of a blank white screen.
 *
 * Usage: wrap your router / App in this component inside main.jsx
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
    // Forward to PostHog. captureException is safe to call before init —
    // it no-ops if posthog isn't loaded (e.g. error happened on /login
    // before PostHogProvider mounted).
    captureException(error, { componentStack: errorInfo?.componentStack });
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#f1f5f9',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            fontSize: '2rem',
          }}>
            ⚠️
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: 480, lineHeight: 1.6, marginBottom: '2rem' }}>
            An unexpected error occurred. Don't worry - your data is safe. Try refreshing the page or
            going back to the home screen.
          </p>

          {/* Error details (collapsible, visible in dev) */}
          {import.meta.env.DEV && this.state.error && (
            <details style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              padding: '1rem',
              marginBottom: '2rem',
              maxWidth: 600,
              textAlign: 'left',
              width: '100%',
            }}>
              <summary style={{ cursor: 'pointer', color: '#f87171', fontWeight: 600, marginBottom: '0.5rem' }}>
                Error details (dev only)
              </summary>
              <pre style={{ fontSize: '0.75rem', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => e.target.style.opacity = '0.85'}
            onMouseOut={e => e.target.style.opacity = '1'}
          >
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
