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

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const data = (await res.json()) as Me;
        if (!cancelled) setMe(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { me, loading };
}
