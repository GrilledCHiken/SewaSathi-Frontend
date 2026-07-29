import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in component tree:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface-muted px-4 text-center">
          <h1 className="text-xl font-bold text-ink">Something went wrong.</h1>
          <p className="max-w-sm text-sm text-ink-muted">
            This page hit an unexpected error. Try reloading — if it keeps happening, let us know.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
