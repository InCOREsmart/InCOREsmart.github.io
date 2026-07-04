import { Fragment } from 'react';
import { Check } from 'lucide-react';

type StepStatus = 'completed' | 'current' | 'pending';

interface Step {
  key: string;
  status: StepStatus;
}

interface Agent4StepTrackerProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
}

export function Agent4StepTracker({ steps, orientation = 'horizontal' }: Agent4StepTrackerProps) {
  const stepLabels: Record<string, string> = {
    verification: 'Verification',
    execution: 'Execution',
    contract: 'Smart Contract',
    payout: 'Payout',
  };

  const getStatusStyles = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-success border-success',
          text: 'text-success',
          connector: 'bg-success',
        };
      case 'current':
        return {
          circle: 'bg-gold border-gold',
          text: 'text-gold',
          connector: 'bg-text-secondary/30',
        };
      case 'pending':
        return {
          circle: 'bg-transparent border-text-secondary/30',
          text: 'text-text-muted',
          connector: 'bg-text-secondary/30',
        };
    }
  };

  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col gap-4">
        {steps.map((step, index) => {
          const styles = getStatusStyles(step.status);
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${styles.circle} transition-all duration-300`}
                >
                  {step.status === 'completed' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className={`text-sm font-medium ${step.status === 'current' ? 'text-primary-dark' : 'text-text-muted'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-8 ${styles.connector}`} />
                )}
              </div>
              <div className="pt-1">
                <span className={`text-sm font-medium ${styles.text}`}>
                  {stepLabels[step.key]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const styles = getStatusStyles(step.status);
        return (
          <Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${styles.circle} transition-all duration-300`}
              >
                {step.status === 'completed' ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <span className={`text-sm font-medium ${step.status === 'current' ? 'text-primary-dark' : 'text-text-muted'}`}>
                    {index + 1}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-2 ${styles.text}`}>
                {stepLabels[step.key]}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${styles.connector}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
