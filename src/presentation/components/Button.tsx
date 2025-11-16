import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  loadingText?: string;
}

const BUTTON_VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  ghost: 'button button-ghost',
};

export const Button = ({
  variant = 'primary',
  children,
  isLoading = false,
  loadingText,
  disabled,
  ...props
}: ButtonProps) => {
  const className = `${BUTTON_VARIANT_CLASS[variant]}${isLoading ? ' button-loading' : ''}`;

  return (
    <button className={className} disabled={disabled || isLoading} {...props}>
      {isLoading && <span className="button-spinner" aria-hidden />}
      <span className="button-label">{isLoading ? (loadingText ?? children) : children}</span>
    </button>
  );
};
