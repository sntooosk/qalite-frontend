import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/PageLoader';

export const HomePage = () => {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return <PageLoader message="Preparando sua sessão..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
