import { useEffect, useState } from "react";
import httpClient from "../api/httpClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const PROVIDERS = {
  google: {
    label: "Continue with Google",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
    ),
  },
  facebook: {
    label: "Continue with Facebook",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"
        />
      </svg>
    ),
  },
};

/**
 * Social sign-in buttons, rendered only for providers the backend actually has credentials
 * for. A fresh checkout has none configured, and showing buttons that lead to a provider
 * error would be worse than showing nothing.
 *
 * Navigation uses a full page load rather than the router: the OAuth handshake is a
 * server-side redirect chain that has to leave the SPA entirely.
 */
export default function SocialSignIn({ className = "" }) {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    httpClient
      .get("/auth/providers")
      .then(({ data }) => {
        if (!cancelled) setProviders(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Older backend or a transient failure: fall back to password-only sign-in.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className={className}>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            or
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {providers.map((id) => {
          const provider = PROVIDERS[id];
          if (!provider) return null;
          return (
            <a
              key={id}
              href={`${API_ORIGIN}/oauth2/authorization/${id}`}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {provider.icon}
              {provider.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
