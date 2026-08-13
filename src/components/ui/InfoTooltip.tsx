import { Info } from 'lucide-react';
import { ReactNode } from 'react';

type InfoTooltipProps = {
  children: ReactNode;
};

export function InfoTooltip({ children }: InfoTooltipProps) {
  return (
    <span className="group relative inline-flex items-center align-middle ml-1">
      <button
        type="button"
        aria-label="Информация"
        className="inline-flex items-center justify-center text-[#000052]/40 hover:text-[#B8860B] focus:outline-none focus:text-[#B8860B]"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <span className="pointer-events-none absolute z-50 left-1/2 top-full mt-2 hidden w-72 -translate-x-1/2 rounded-lg bg-[#000052] px-3 py-2 text-left text-xs leading-relaxed text-white shadow-xl group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}
