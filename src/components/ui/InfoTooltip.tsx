import { Info } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { financialTooltips } from '../../i18n/financialTooltips';

type InfoTooltipProps = { children: ReactNode };

export function InfoTooltip({ children }: InfoTooltipProps) {
  const { t, i18n } = useTranslation();
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
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  const language = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0] as keyof typeof financialTooltips;

  const translateLegacyTooltip = (content: ReactNode): ReactNode => {
    if (typeof content !== 'string') return content;

    const dictionary = financialTooltips[language] || financialTooltips.ru;
    const exactTranslation = dictionary[content];
    if (exactTranslation) return exactTranslation;

    const normalized = content.replace(/\s+/g, ' ').trim();

    // Correct key for the annual-bonus tooltip used by CEODashboard.
    // The dictionary contains an older typo ("Иллный бонус"), so keep
    // backward compatibility here instead of changing financial logic.
    if (normalized === 'Сумма payout по активным контрактам. Годовой бонус в неё не включается.') {
      const translations: Record<string, string> = {
        ru: 'Сумма payout по активным контрактам. Годовой бонус в неё не включается.',
        en: 'Payout amount for active contracts. The annual bonus is not included.',
        kk: 'Белсенді келісімшарттар бойынша payout сомасы. Жылдық бонус бұл сомаға кірмейді.',
        az: 'Aktiv müqavilələr üzrə payout məbləği. İllik bonus bu məbləğə daxil edilmir.',
      };
      return translations[language] || translations.ru;
    }

    // Some older tooltip strings were partially translated before reaching this component.
    // Normalize these mixed-language variants so no Russian fragment remains in English UI.
    if (
      normalized.includes('LOCKED') &&
      (normalized.includes('со статусом') || normalized.includes('payment streams')) &&
      (normalized.includes('Эти средства ещё не доступны агенту') || normalized.includes('не доступны агенту'))
    ) {
      const translations: Record<string, string> = {
        ru: 'Сумма потоков выплат со статусом LOCKED по активным контрактам. Эти средства ещё не доступны агенту.',
        en: 'Amount of payment streams with LOCKED status for active contracts. These funds are not yet available to the agent.',
        kk: 'Белсенді келісімшарттар бойынша LOCKED мәртебесіндегі төлем ағындарының сомасы. Бұл қаражат әлі агентке қолжетімді емес.',
        az: 'Aktiv müqavilələr üzrə LOCKED statusunda olan ödəniş axınlarının məbləği. Bu vəsaitlər hələ agent üçün əlçatan deyil.',
      };
      return translations[language] || translations.ru;
    }

    return content;
  };

  return (
    <>
      <span className="inline-flex items-center align-middle ml-1">
        <button
          ref={buttonRef}
          type="button"
          aria-label={t('tooltips.information')}
          aria-expanded={open}
          onMouseEnter={show}
          onMouseLeave={scheduleClose}
          onFocus={show}
          onBlur={scheduleClose}
          onClick={() => {
            if (open) {
              clearCloseTimer();
              setOpen(false);
            } else {
              show();
            }
          }}
          className="inline-flex items-center justify-center text-[#000052]/40 hover:text-[#B8860B] focus:outline-none focus:text-[#B8860B]"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </span>
      {open && createPortal(
        <span
          role="tooltip"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          className="fixed z-[99999] w-72 max-w-[calc(100vw-24px)] rounded-lg bg-[#000052] px-3 py-2 text-left text-xs leading-relaxed text-white shadow-2xl"
          style={{ top: position.top, left: position.left }}
        >
          {translateLegacyTooltip(children)}
        </span>,
        document.body
      )}
    </>
  );
}
