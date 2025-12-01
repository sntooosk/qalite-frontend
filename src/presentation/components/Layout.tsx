import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { LogoutIcon, UserIcon } from './icons';
import qliteLogo from '../assets/logo.png';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { activeOrganization } = useOrganizationBranding();
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.email || '';
  const brandSource = activeOrganization;
  const brandName = brandSource?.name || 'QaLite';
  const brandLogo = qliteLogo;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand" aria-label={`Página inicial da ${brandName}`}>
          <img src={brandLogo} alt="Logo da QaLite" className="app-brand-logo" />
          <span className="app-brand-name">{brandSource?.name || brandName}</span>
        </Link>
        <nav className="header-actions">
          {user ? (
            <div className="header-user">
              <div className="header-user-info">
                <UserAvatar name={displayName} photoURL={user.photoURL} size="sm" />
                <div className="user-context">
                  <span className="user-greeting">Olá,</span>
                  <span className="user-name">{displayName}</span>
                  <span className="user-role">
                    {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </span>
                </div>
              </div>
              <div className="header-user-actions">
                <button
                  type="button"
                  className="header-profile"
                  onClick={() => navigate('/profile')}
                >
                  <UserIcon aria-hidden className="icon" />
                  <span>Perfil</span>
                </button>
                <Button type="button" variant="ghost" onClick={() => void logout()}>
                  <LogoutIcon aria-hidden className="icon" />
                  Sair
                </Button>
              </div>
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
