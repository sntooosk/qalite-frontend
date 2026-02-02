import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import qliteLogo from '../assets/logo.png';
import { AuthCard } from './AuthCard';
import { BottomSheetContainer } from './BottomSheetContainer';

interface AuthShellProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const MOBILE_MEDIA_QUERY = '(max-width: 640px)';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = () => setIsMobile(media.matches);

    handleChange();
    media.addEventListener?.('change', handleChange);

    return () => {
      media.removeEventListener?.('change', handleChange);
    };
  }, []);

  return isMobile;
};

export const AuthShell = ({ title, description, children, footer }: AuthShellProps) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const brandName = t('app.brandName');

  const content = (
    <>
      {(title || description) && (
        <div className="auth-shell__panel-header">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}
      <div className="auth-shell__panel-content">{children}</div>
      {footer && <div className="auth-shell__panel-footer">{footer}</div>}
    </>
  );

  return (
    <div className="auth-shell">
      <header className="auth-shell__header">
        <Link
          to="/"
          className="auth-shell__brand"
          aria-label={t('layout.homeAriaLabel', { brandName })}
        >
          <img
            src={qliteLogo}
            alt={t('layout.brandLogoAlt', { brandName })}
            className="auth-shell__logo"
          />
          <span className="auth-shell__brand-name">{brandName}</span>
        </Link>
      </header>
      <div className="auth-shell__body">
        {isMobile ? (
          <BottomSheetContainer>{content}</BottomSheetContainer>
        ) : (
          <AuthCard>{content}</AuthCard>
        )}
      </div>
    </div>
  );
};
