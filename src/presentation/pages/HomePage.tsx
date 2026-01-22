import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { PageShellSkeleton } from '../components/skeletons/PageShellSkeleton';

export const HomePage = () => {
  const { user, hasRole, isInitializing } = useAuth();

  const { t: translation } = useTranslation();

  if (isInitializing) {
    return <PageShellSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasRole(['admin'])) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
