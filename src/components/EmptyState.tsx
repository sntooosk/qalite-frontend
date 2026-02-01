import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  helpText?: ReactNode;
}

export const EmptyState = ({ title, description, action, icon, helpText }: EmptyStateProps) => (
  <div className="empty-state" role="status" aria-live="polite">
    {icon && <div className="empty-state__icon">{icon}</div>}
    <div className="empty-state__content">
      <h2>{title}</h2>
      <p>{description}</p>
      {helpText && <div className="empty-state__meta">{helpText}</div>}
    </div>
    {action && <div className="empty-state__action">{action}</div>}
  </div>
);
