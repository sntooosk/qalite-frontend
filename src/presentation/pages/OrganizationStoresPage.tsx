import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import type { Store } from '../../domain/entities/Store';
import { organizationService } from '../../application/services/OrganizationService';
import { storeService } from '../../application/services/StoreService';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';

export const OrganizationStoresPage = () => {
  const navigate = useNavigate();
  const { organizationId } = useParams<{ organizationId: string }>();
  const { showToast } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      navigate('/admin', { replace: true });
      return;
    }

    const fetchOrganization = async () => {
      try {
        setIsLoadingOrganization(true);
        const data = await organizationService.getById(organizationId);

        if (!data) {
          showToast({ type: 'error', message: 'Organização não encontrada.' });
          navigate('/admin', { replace: true });
          return;
        }

        setOrganization(data);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar a organização selecionada.' });
        navigate('/admin', { replace: true });
      } finally {
        setIsLoadingOrganization(false);
      }
    };

    void fetchOrganization();
  }, [navigate, organizationId, showToast]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const data = await storeService.listByOrganization(organizationId);
        setStores(data);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as lojas desta organização.' });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [organizationId, showToast]);

  const handleSelectStore = (storeId: string) => {
    navigate(`/stores/${storeId}`);
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate('/admin')}>
              &larr; Voltar para as organizações
            </button>
            <h1 className="section-title">
              {isLoadingOrganization ? 'Carregando organização...' : organization?.name ?? 'Organização'}
            </h1>
            <p className="section-subtitle">
              {organization?.description || 'Visualize todas as lojas vinculadas a esta organização.'}
            </p>
          </div>
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">Carregando lojas vinculadas...</p>
        ) : stores.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhuma loja cadastrada</h2>
            <p className="section-subtitle">
              Cadastre novas lojas na área de gerenciamento para começar a montar a massa de cenários desta organização.
            </p>
          </div>
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
                  <p>
                    <strong>Ambiente:</strong> {store.stage || 'Não informado'}
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
