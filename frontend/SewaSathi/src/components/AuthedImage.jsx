import { useEffect, useState } from "react";
import { fetchFileObjectUrl } from "../api/fileApi";

/**
 * Renders an uploaded image that lives behind the authenticated /api/files endpoint.
 *
 * A normal <img src> cannot attach a bearer token, so the bytes are fetched through the
 * axios client and swapped in as an object URL. The URL is revoked on unmount and whenever
 * the source changes, otherwise every image the user scrolls past leaks a blob.
 */
export default function AuthedImage({ storedUrl, alt, className, onClick }) {
  // Keyed by its source and reset during render rather than in the effect, which would
  // queue an extra render pass on every image.
  const [state, setState] = useState({ src: storedUrl, objectUrl: null, failed: false });

  if (state.src !== storedUrl) {
    setState({ src: storedUrl, objectUrl: null, failed: false });
  }

  useEffect(() => {
    let cancelled = false;
    let created = null;

    fetchFileObjectUrl(storedUrl)
      .then((url) => {
        if (cancelled) {
          // Arrived after unmount — release it rather than leaving it dangling.
          if (url) URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setState({ src: storedUrl, objectUrl: url, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ src: storedUrl, objectUrl: null, failed: true });
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [storedUrl]);

  if (state.failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${className || ""}`}>
        Image unavailable
      </div>
    );
  }

  if (!state.objectUrl) {
    return <div className={`animate-pulse bg-slate-200 ${className || ""}`} aria-hidden="true" />;
  }

  return <img src={state.objectUrl} alt={alt} className={className} onClick={onClick} />;
}
