import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

export function Tooltip({ content, children, side = 'top', className = '' }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  const updatePosition = () => {
    const element = triggerRef.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, right: box.right, bottom: box.bottom, width: box.width, height: box.height });
  };

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const handleViewportChange = () => updatePosition();
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [open]);

  let style: React.CSSProperties = { position: 'fixed' };
  if (rect) {
    if (side === 'bottom') {
      style = { position: 'fixed', left: rect.left + rect.width / 2, top: rect.bottom + 10, transform: 'translateX(-50%)' };
    } else if (side === 'left') {
      style = { position: 'fixed', left: rect.left - 10, top: rect.top + rect.height / 2, transform: 'translate(-100%, -50%)' };
    } else if (side === 'right') {
      style = { position: 'fixed', left: rect.right + 10, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' };
    } else {
      style = { position: 'fixed', left: rect.left + rect.width / 2, top: rect.top - 10, transform: 'translate(-50%, -100%)' };
    }
  }

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && rect && createPortal(
        <span
          role="tooltip"
          style={style}
          className="pointer-events-none z-[9999] w-max max-w-[320px] rounded-xl border border-[#000052]/10 bg-[#000052] px-3 py-2 text-left text-xs leading-relaxed text-white shadow-[0_12px_36px_rgba(0,0,82,0.24)]"
        >
          {content}
        </span>,
        document.body,
      )}
    </span>
  );
}
