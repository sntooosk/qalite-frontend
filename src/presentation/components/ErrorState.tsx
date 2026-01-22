import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title,
  description,
  actionLabel = 'Tentar novamente',
  onRetry,
}: ErrorStateProps) => (
  <div className="error-state">
    <div className="error-state__content">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {onRetry && (
      <div className="error-state__action">
        <Button type="button" variant="secondary" onClick={onRetry}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);
