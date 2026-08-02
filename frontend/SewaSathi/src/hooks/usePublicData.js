import { useEffect, useState } from "react";
import {
  getContactInfo,
  getPublicServices,
  getPublicStats,
} from "../api/publicApi";

/**
 * Live platform figures for the marketing pages.
 *
 * The same three payloads are wanted by several pages each — the stats block
 * appears on Home, How It Works, Safety and About Us — and a visitor moves
 * between them in one session. Each fetch is therefore kept as a module-level
 * promise and shared: the request happens once per page load, not once per
 * navigation.
 *
 * There is no error state, matching the rest of the app: a failed load leaves
 * the value null and the page renders its skeleton or empty state. These are
 * decorative figures on a page that still works without them, so a red banner
 * would be louder than the problem.
 */

const cache = new Map();

function load(key, fetcher) {
  if (!cache.has(key)) {
    // Cache the promise, not the result, so parallel callers on first paint
    // share one request instead of racing to start their own.
    cache.set(
      key,
      fetcher().catch(() => null),
    );
  }
  return cache.get(key);
}

/** Drops the cached copies so the next mount refetches. Used by tests. */
export function clearPublicDataCache() {
  cache.clear();
}

function usePublicResource(key, fetcher) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    load(key, fetcher).then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [key, fetcher]);

  return { data, loading };
}

/** Platform-wide counters: workers, customers, tasks, reviews, cities. */
export function usePublicStats() {
  const { data, loading } = usePublicResource("stats", getPublicStats);
  return { stats: data, loading };
}

/** The service catalogue with live demand, ratings and starting rates. */
export function usePublicServices() {
  const { data, loading } = usePublicResource("services", getPublicServices);
  return { services: data ?? [], loading };
}

/** Support email, phone, address and hours, as configured on the server. */
export function useContactInfo() {
  const { data, loading } = usePublicResource("contact-info", getContactInfo);
  return { contactInfo: data, loading };
}
