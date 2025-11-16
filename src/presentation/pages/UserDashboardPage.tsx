import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useOrganizationStores } from '../hooks/useOrganizationStores';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const organizationId = user?.organizationId ?? null;
  const { organization, stores, isLoading, status } = useOrganizationStores(organizationId);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    if (!user.organizationId) {
      navigate('/no-organization', { replace: true });
      return;
    }
  }, [isInitializing, navigate, user]);

  const handleSelectStore = (storeId: string) => {
    navigate(`/stores/${storeId}`);
  };

  const subtitle = useMemo(() => {
    if (organization?.name) {
      return `Você está colaborando com ${organization.name}. Selecione uma loja para continuar.`;
    }

    if (status === 'error') {
      return 'Não conseguimos carregar as lojas. Tente novamente ou fale com o administrador.';
    }

    return 'Escolha uma das lojas disponíveis para revisar as suítes de cenários.';
  }, [organization?.name, status]);

  const isError = status === 'error';
  const emptyStateTitle = isError ? 'Não foi possível carregar as lojas' : 'Nenhuma loja disponível ainda';
  const emptyStateDescription = isError
    ? 'Atualize a página ou tente novamente mais tarde. Se o problema persistir, contate o administrador.'
    : 'Peça para um administrador adicionar lojas à sua organização ou volte mais tarde.';

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">Biblioteca de lojas</span>
            <h1 className="section-title">Selecione uma loja para revisar seus cenários</h1>
            <p className="section-subtitle">{subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">Carregando lojas disponíveis...</p>
        ) : stores.length === 0 ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            action={
              isError ? (
                <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                  Tentar novamente
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
                  Revisar perfil
                </Button>
              )
            }
          />
        ) : (
          <div className="dashboard-grid">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                className="card card-interactive"
                onClick={() => handleSelectStore(store.id)}
              >
                <div className="card-header">
                  <h2 className="card-title">{store.name}</h2>
                  <span className="badge">{store.scenarioCount} cenários</span>
                </div>
                <div className="card-description">
                  <p>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};
