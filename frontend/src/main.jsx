import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in React tree:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-view" style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2>YatraSetu Application Crash Detected</h2>
          <pre id="error-boundary-details" style={{ whiteSpace: 'pre-wrap', background: '#ffffff', padding: '1rem', border: '1px solid #f87171', borderRadius: '6px' }}>
            {this.state.error && this.state.error.toString()}
            {"\n\nStack:\n"}
            {this.state.error && this.state.error.stack}
            {"\n\nComponent Stack:\n"}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button
            id="error-boundary-reset-btn"
            onClick={() => {
              try {
                localStorage.removeItem("yatrasetu_user");
                localStorage.removeItem("yatrasetu_token");
              } catch (e) {}
              window.location.href = "/";
            }}
            style={{ padding: '12px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '1rem', fontWeight: 700 }}
          >
            Clear Session &amp; Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
