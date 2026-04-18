import { useEffect, useState } from "react";

export type Me = {
  id: string;
  name: string;
  role: "BEWOHNER" | "GETRAENKEMINISTER" | "ADMIN";
  houseId: string;
  pinVerified?: boolean;
  requirePinOnPurchase?: boolean;
  houseName?: string;
  houseColor?: string;
};

let cachedMe: Me | null | undefined;
let cachedAt = 0;
let inFlight: Promise<Me | null> | null = null;
const CACHE_TTL_MS = 10_000;

async function fetchMe(force = false) {
  const now = Date.now();
  if (!force && cachedMe !== undefined && now - cachedAt < CACHE_TTL_MS) {
    return cachedMe;
  }
  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const res = await fetch("/api/users/me");
    if (!res.ok) {
      cachedMe = null;
      cachedAt = Date.now();
      return null;
    }
    const data = (await res.json()) as Me;
    cachedMe = data;
    cachedAt = Date.now();
    return data;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadMe(force = false) {
      try {
        const data = await fetchMe(force);
        if (!cancelled) setMe(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMe();

    function onSessionChanged() {
      setLoading(true);
      cachedMe = undefined;
      cachedAt = 0;
      void loadMe(true);
    }
    window.addEventListener("drinks:session-changed", onSessionChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("drinks:session-changed", onSessionChanged);
    };
  }, []);

  return { me, loading };
}
