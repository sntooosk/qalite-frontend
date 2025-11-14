import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.email || '';

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          <span className="app-logo">QaLite</span>
          <span className="app-brand-subtitle">Auth Experience</span>
        </Link>
        <nav className="header-actions">
          <ThemeToggle />
          {user ? (
            <div className="header-user">
              <div className="user-context">
                <span className="user-greeting">Olá,</span>
                <span className="user-name">{displayName}</span>
                <span className="user-role">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
              </div>
              <UserAvatar
                name={displayName}
                photoURL={user.photoURL}
                size="sm"
                onClick={() => navigate('/profile')}
              />
              <Button type="button" variant="ghost" onClick={() => void logout()}>
                Sair
              </Button>
            </div>
          ) : (
            <div className="header-auth">
              <Link to="/login" className="text-link">
                Entrar
              </Link>
              <Button type="button" onClick={() => navigate('/register')}>
                Criar conta
              </Button>
            </div>
          )}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
