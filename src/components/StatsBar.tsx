import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/app/hooks';

/** Messages per second and data freshness: the numbers you watch when tuning a live UI. */
export function StatsBar() {
  const messages = useAppSelector((s) => s.connection.messages);
  const lastMessageAt = useAppSelector((s) => s.connection.lastMessageAt);
  const notice = useAppSelector((s) => s.connection.notice);
  const sample = useRef({ messages, at: Date.now() });
  const [rate, setRate] = useState(0);
  const [age, setAge] = useState(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const lastRef = useRef(lastMessageAt);
  lastRef.current = lastMessageAt;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRate(
        Math.round(
          ((messagesRef.current - sample.current.messages) * 1000) / (now - sample.current.at),
        ),
      );
      sample.current = { messages: messagesRef.current, at: now };
      setAge(lastRef.current ? now - lastRef.current : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="stats">
      {notice && <p className="notice">{notice}</p>}
      <span>{rate} updates/s</span>
      <span className={age > 5000 ? 'stale' : ''}>
        last update {lastMessageAt ? `${(age / 1000).toFixed(1)} s ago` : '—'}
      </span>
      <span>batched per animation frame</span>
    </footer>
  );
}
