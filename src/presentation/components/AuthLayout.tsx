import { ReactNode } from 'react';

const DEFAULT_LOGO_PATH = '/logo.png';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
}

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  hideHeader = false,
}: AuthLayoutProps) => (
  <div className="auth-page">
    {!hideHeader && (
      <header className="auth-page__topbar">
        <div className="auth-page__brand">
          <img src={DEFAULT_LOGO_PATH} alt="Logo QaLite" className="auth-page__brand-logo" />
          <span className="auth-page__brand-name">QaLite</span>
        </div>
      </header>
    )}
    <div className="auth-page__body">
      <section className="auth-page__panel">
        <div className="auth-page__panel-brand">
          <div className="auth-page__brand auth-page__brand--panel">
            <img
              src={DEFAULT_LOGO_PATH}
              alt="Logo QaLite"
              className="auth-page__brand-logo auth-page__brand-logo--panel"
            />
            <div className="auth-page__brand-text">
              <span className="auth-page__brand-name">QaLite</span>
              <span className="auth-page__brand-tagline">Quality Assurance Lite</span>
            </div>
          </div>
        </div>
        <div className="auth-page__panel-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="auth-page__panel-content">{children}</div>
        {footer && <div className="auth-page__panel-footer">{footer}</div>}
      </section>
    </div>
  </div>
);
