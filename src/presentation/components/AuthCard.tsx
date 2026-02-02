import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
}

export const AuthCard = ({ children }: AuthCardProps) => (
  <section className="auth-card">{children}</section>
);
