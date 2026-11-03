import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Whole seconds left until a deadline, ticking every 200 ms (based on the clock, so it stays correct
 * if the tab was in the background). `start(60)` begins a 60-second countdown.
 */
export default function useCountdown(initialSeconds = 0) {
  const deadline = useRef(Date.now() + initialSeconds * 1000);
  const [seconds, setSeconds] = useState(initialSeconds);

  const start = useCallback((s) => {
    deadline.current = Date.now() + s * 1000;
    setSeconds(s);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return { seconds, start };
}
