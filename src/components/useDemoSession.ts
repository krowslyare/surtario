import { useEffect, useState } from "react";

export function useDemoSession() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    try {
      let value = localStorage.getItem("procurement-demo-session-v1");
      if (!value || !/^[a-f0-9]{64}$/.test(value)) {
        value = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("procurement-demo-session-v1", value);
      }
      setToken(value);
    } catch { setError(true); }
  }, []);
  return { token, error };
}
