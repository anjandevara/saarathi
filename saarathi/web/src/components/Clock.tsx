"use client";

import { useEffect, useState } from "react";

// Live clock in the top bar. Starts as a placeholder so server and client
// render the same thing (no hydration mismatch), then ticks on the client.
export default function Clock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      setT(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <b>{t}</b>;
}
