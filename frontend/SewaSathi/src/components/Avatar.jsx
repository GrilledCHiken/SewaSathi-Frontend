import { useEffect, useState } from "react";
import { fetchFileObjectUrl } from "../api/fileApi";

/**
 * A person's profile picture, falling back to their initials. Same object-URL mechanism as
 * AuthedImage, but shows initials rather than a skeleton while loading — the header renders
 * one on every page, and a shimmering circle on each navigation would be worse.
 */
export default function Avatar({
  storedUrl,
  initials = "",
  className = "h-9 w-9",
  fallbackClassName = "bg-brand",
  alt = "",
}) {
  const [state, setState] = useState({ src: storedUrl, objectUrl: null });

  // Prop-derived state, reset during render, so switching accounts never paints the
  // previous person for a frame.
  if (state.src !== storedUrl) {
    setState({ src: storedUrl, objectUrl: null });
  }

  useEffect(() => {
    if (!storedUrl) return undefined;

    let cancelled = false;
    let created = null;

    fetchFileObjectUrl(storedUrl)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setState({ src: storedUrl, objectUrl: url });
      })
      .catch(() => {
        // A deleted or unreadable file just means initials — never an error state here.
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [storedUrl]);

  if (state.objectUrl) {
    return (
      <img
        src={state.objectUrl}
        alt={alt}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${fallbackClassName} ${className}`}
      aria-hidden={alt ? undefined : "true"}
    >
      {initials}
    </span>
  );
}
