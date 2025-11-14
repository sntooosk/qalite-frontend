import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button = ({ variant = 'primary', children, ...props }: ButtonProps) => {
  const classes: Record<typeof variant, string> = {
    primary: 'button button-primary',
    secondary: 'button button-secondary',
    ghost: 'button button-ghost'
  };

  return (
    <button className={classes[variant]} {...props}>
      {children}
    </button>
  );
};
