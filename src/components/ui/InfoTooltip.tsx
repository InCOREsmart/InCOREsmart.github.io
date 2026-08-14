import { Info } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

type InfoTooltipProps = { children: ReactNode };

export function InfoTooltip({ children }: InfoTooltipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(288, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12));
    setPosition({ top: rect.bottom + 8, left });
  };
  const show = () => { clearCloseTimer(); updatePosition(); setOpen(true); };
  const scheduleClose = () => { clearCloseTimer(); closeTimerRef.current = window.setTimeout(() => setOpen(false), 120); };

  useEffect(() => {
    if (!open) return;
    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => { window.removeEventListener('resize', handleViewportChange); window.removeEventListener('scroll', handleViewportChange, true); };
  }, [open]);
  useEffect(() => () => clearCloseTimer(), []);

  return (
    <>
      <span className="inline-flex items-center align-middle ml-1">
        <button ref={buttonRef} type="button" aria-label={t('tooltips.information')} aria-expanded={open} onMouseEnter={show} onMouseLeave={scheduleClose} onFocus={show} onBlur={scheduleClose} onClick={() => { if (open) { clearCloseTimer(); setOpen(false); } else show(); }} className="inline-flex items-center justify-center text-[#000052]/40 hover:text-[#B8860B] focus:outline-none focus:text-[#B8860B]">
          <Info className="w-3.5 h-3.5" />
        </button>
      </span>
      {open && createPortal(
        <span role="tooltip" onMouseEnter={clearCloseTimer} onMouseLeave={scheduleClose} className="fixed z-[99999] w-72 max-w-[calc(100vw-24px)] rounded-lg bg-[#000052] px-3 py-2 text-left text-xs leading-relaxed text-white shadow-2xl" style={{ top: position.top, left: position.left }}>
          {children}
        </span>, document.body
      )}
    </>
  );
}
