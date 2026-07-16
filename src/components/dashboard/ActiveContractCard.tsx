import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  EscrowBadge,
  TaskTimer,
  Agent4StepTracker,
} from '../ui';
import type { Contract } from '../../lib/supabase';

interface Step {
  key: string;
  status: 'completed' | 'current' | 'pending';
}

interface ActiveContractCardProps {
  contract: Contract;
  activeStep: Step[];
}

export function ActiveContractCard({
  contract,
  activeStep,
}: ActiveContractCardProps) {
  const navigate = useNavigate();

  return (
    <div className="card">

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-semibold text-text-primary">
          Активный контракт
        </h2>

        <EscrowBadge status={contract.escrow_status} />
      </div>

      <div className="flex items-center gap-4 bg-primary-dark rounded-lg p-4 mb-6">
        <img
          src="https://placehold.co/64x64"
          alt="Company"
          className="w-16 h-16 rounded-xl border border-border"
        />

        <div className="flex-1">
          <p className="text-sm text-text-secondary">
            Компания
          </p>

          <h3 className="text-lg font-semibold text-text-primary">
            InCORE Insurance
          </h3>

          <p className="text-sm text-text-secondary mt-1">
            Статус: {contract.status}
          </p>
        </div>
      </div>

      <div className="bg-primary-dark rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-text-primary mb-2">
          {contract.title}
        </h3>

        <p className="text-text-secondary text-sm mb-4">
          {contract.description}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-sm">
              До дедлайна
            </span>

            <TaskTimer deadline={contract.deadline} />

            <p className="text-xs text-text-secondary mt-2">
              ⚠️ Менее 3 дней до дедлайна карточка станет
              оранжевой, менее суток — красной.
            </p>
          </div>

          <div className="text-right">
            <span className="text-text-muted text-sm">
              Средства в Escrow
            </span>

            <p className="text-2xl font-display font-bold text-gold">
              ${contract.escrow_amount?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4">
          Этап выполнения
        </h3>

        <Agent4StepTracker steps={activeStep} />

        <div className="grid grid-cols-2 gap-3 mt-6">

          <div className="bg-primary-dark rounded-lg p-3">
            <p className="text-xs text-text-secondary">
              Выполнено KPI
            </p>

            <p className="text-xl font-bold text-green-400">
              62%
            </p>
          </div>

          <div className="bg-primary-dark rounded-lg p-3">
            <p className="text-xs text-text-secondary">
              До выплаты
            </p>

            <p className="text-xl font-bold text-gold">
              18 дней
            </p>
          </div>

        </div>
      </div>

      <button
        onClick={() =>
          navigate(`/agent/contracts/${contract.id}`)
        }
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        Открыть контракт

        <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  );
}