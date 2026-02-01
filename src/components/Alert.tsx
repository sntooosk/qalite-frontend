interface AlertProps {
  message: string;
  type?: 'error' | 'success' | 'info';
}

export const Alert = ({ message, type = 'info' }: AlertProps) => (
  <div className={`alert alert-${type}`}>{message}</div>
);
