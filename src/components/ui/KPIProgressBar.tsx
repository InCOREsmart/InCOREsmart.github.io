interface KPIProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  showPercentage?: boolean;
  color?: 'gold' | 'success' | 'orange';
}

export function KPIProgressBar({
  label,
  current,
  target,
  unit = '',
  showPercentage = true,
  color = 'gold',
}: KPIProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  const colorClasses = {
    gold: 'bg-gradient-to-r from-gold-dark to-gold',
    success: 'bg-gradient-to-r from-success-dark to-success',
    orange: 'bg-gradient-to-r from-orange-dark to-orange',
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm font-medium text-text-primary">
          {current.toLocaleString()}{unit} / {target.toLocaleString()}{unit}
          {showPercentage && <span className="ml-2 text-gold">({percentage.toFixed(0)}%)</span>}
        </span>
      </div>
      <div className="h-2 bg-primary-dark rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
