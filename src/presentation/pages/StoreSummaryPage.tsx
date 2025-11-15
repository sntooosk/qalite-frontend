import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import type { Store, StoreScenario } from '../../domain/entities/Store';
import { organizationService } from '../../application/services/OrganizationService';
import { storeService } from '../../application/services/StoreService';
import { useAuth } from '../../application/hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';

export const StoreSummaryPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();

  const [store, setStore] = useState<Store | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!storeId) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoadingStore(true);
        setIsLoadingScenarios(true);

        const data = await storeService.getById(storeId);

        if (!data) {
          showToast({ type: 'error', message: 'Loja não encontrada.' });
          navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
          return;
        }

        if (user.role !== 'admin' && user.organizationId !== data.organizationId) {
          showToast({ type: 'error', message: 'Você não tem permissão para acessar esta loja.' });
          navigate('/dashboard', { replace: true });
          return;
        }

        setStore(data);

        const [organizationData, scenariosData] = await Promise.all([
          organizationService.getById(data.organizationId),
          storeService.listScenarios(data.id)
        ]);

        if (organizationData) {
          setOrganization(organizationData);
        }
        setScenarios(scenariosData);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar os detalhes da loja.' });
      } finally {
        setIsLoadingStore(false);
        setIsLoadingScenarios(false);
      }
    };

    void fetchData();
  }, [isInitializing, navigate, showToast, storeId, user]);

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
            >
              &larr; Voltar
            </button>
            <h1 className="section-title">{isLoadingStore ? 'Carregando loja...' : store?.name ?? 'Loja'}</h1>
            {store && (
              <p className="section-subtitle">
                {organization?.name ? `${organization.name} • ` : ''}
                {store.site ? `${store.site} • ` : ''}
                {store.stage || 'Ambiente não informado'}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          {isLoadingStore ? (
            <p className="section-subtitle">Sincronizando dados da loja...</p>
          ) : !store ? (
            <p className="section-subtitle">Não foi possível encontrar os detalhes desta loja.</p>
          ) : (
            <div className="store-summary">
              <div className="store-summary-meta">
                <div>
                  <span className="badge">Resumo</span>
                  <h2 className="text-xl font-semibold text-primary">Informações gerais</h2>
                </div>
                <div className="store-summary-stats">
                  <span>
                    <strong>Cenários:</strong> {scenarios.length}
                  </span>
                  <span>
                    <strong>Ambiente:</strong> {store.stage || 'Não informado'}
                  </span>
                  <span>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </span>
                </div>
              </div>

              <div className="scenario-table-wrapper">
                {isLoadingScenarios ? (
                  <p className="section-subtitle">Carregando massa de cenários...</p>
                ) : scenarios.length === 0 ? (
                  <p className="section-subtitle">
                    Nenhum cenário cadastrado para esta loja ainda. Solicite a um responsável a criação da massa de testes.
                  </p>
                ) : (
                  <table className="scenario-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Categoria</th>
                        <th>Automação</th>
                        <th>Criticidade</th>
                        <th>Observação</th>
                        <th>BDD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((scenario) => (
                        <tr key={scenario.id}>
                          <td>{scenario.title}</td>
                          <td>{scenario.category}</td>
                          <td>{scenario.automation}</td>
                          <td>{scenario.criticality}</td>
                          <td className="scenario-observation">{scenario.observation}</td>
                          <td className="scenario-bdd">{scenario.bdd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};
