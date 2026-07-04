import React, { useState, useEffect } from 'react';

interface TaskTimerProps {
  deadline: string | Date;
  onExpire?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function TaskTimer({ deadline, onExpire }: TaskTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false,
      };
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining.isExpired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const timeBlocks = [
    { value: timeRemaining.days, label: 'd' },
    { value: timeRemaining.hours, label: 'h' },
    { value: timeRemaining.minutes, label: 'm' },
    { value: timeRemaining.seconds, label: 's' },
  ];

  if (timeRemaining.isExpired) {
    return (
      <div className="flex items-center gap-2 text-error">
        <span className="text-sm font-medium">Deadline expired</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {timeBlocks.map((block, index) => (
        <React.Fragment key={block.label}>
          <div className="flex flex-col items-center">
            <span className="text-lg font-display font-bold text-text-primary tabular-nums">
              {String(block.value).padStart(2, '0')}
            </span>
            <span className="text-xs text-text-muted uppercase">{block.label}</span>
          </div>
          {index < timeBlocks.length - 1 && (
            <span className="text-lg font-bold text-text-muted self-start mt-0.5">:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
