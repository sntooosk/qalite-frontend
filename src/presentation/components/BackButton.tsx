import { Button } from './Button';

interface BackButtonProps {
  label: string;
  onClick: () => void;
  dataTestId?: string;
}

export const BackButton = ({ label, onClick, dataTestId }: BackButtonProps) => (
  <Button type="button" variant="ghost" onClick={onClick} data-testid={dataTestId}>
    ← {label}
  </Button>
);
