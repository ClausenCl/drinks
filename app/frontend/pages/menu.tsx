import { useRouter } from "next/router";
import { useEffect } from "react";

export default function MenuPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/buy");
  }, [router]);

  return null;
}
