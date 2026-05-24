'use client';

import { useEffect, useState } from 'react';
import { formatCountdown, secondsUntil } from '@/lib/time';

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    const tick = () => setSeconds(secondsUntil(expiresAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const expired = seconds <= 0;

  return (
    <span className={expired ? 'font-mono font-medium text-red-600' : 'font-mono font-medium text-[#2874f0]'}>
      {expired ? 'Expired' : formatCountdown(seconds)}
    </span>
  );
}
