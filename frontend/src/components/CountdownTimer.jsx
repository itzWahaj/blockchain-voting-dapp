// src/components/CountdownTimer.jsx
import React, { useEffect, useState } from "react";

export default function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  function getTimeRemaining(deadline) {
    const total = Date.parse(deadline) - Date.now();
    if (total <= 0) return null;

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { total, days, hours, minutes, seconds };
  }

  if (!timeLeft) return <p className="text-red-500">⏰ Deadline has passed!</p>;

  return (
    <div className="text-sm text-gray-700">
      ⏳ Time left: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
}
