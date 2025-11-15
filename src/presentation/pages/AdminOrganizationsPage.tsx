import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import { organizationService } from '../../application/services/OrganizationService';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';

export const AdminOrganizationsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        const data = await organizationService.list();
        setOrganizations(data);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as organizações.' });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrganizations();
  }, [showToast]);

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">Painel do administrador</span>
            <h1 className="section-title">Organizações cadastradas</h1>
            <p className="section-subtitle">
              Selecione uma organização para visualizar todas as lojas disponíveis e acompanhar seus cenários.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/manage')}>
            Gerenciar organizações
          </Button>
        </div>

        {isLoading ? (
          <p className="section-subtitle">Carregando organizações do Firestore...</p>
        ) : organizations.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhuma organização cadastrada</h2>
            <p className="section-subtitle">
              Utilize a área de gerenciamento para cadastrar a primeira organização e começar a administrar suas lojas.
            </p>
            <Button type="button" onClick={() => navigate('/admin/manage')}>
              Acessar gerenciamento
            </Button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                className="card card-interactive"
                onClick={() => navigate(`/admin/organizations/${organization.id}/stores`)}
              >
                <div className="card-header">
                  <h2 className="card-title">{organization.name}</h2>
                  <span className="badge">
                    {organization.members.length} membro{organization.members.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="card-description">
                  {organization.description || 'Organização sem descrição cadastrada até o momento.'}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};
