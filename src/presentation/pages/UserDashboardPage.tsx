import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const firstName = user?.firstName || user?.displayName || user?.email || 'colaborador';

  return (
    <Layout>
      <section className="card">
        <span className="badge">Visão geral</span>
        <h1 className="section-title">Bem-vindo de volta, {firstName}.</h1>
        <p className="section-subtitle">
          Este painel foi simplificado para focar no fluxo de autenticação. A estrutura em camadas
          foi mantida para que você evolua o produto sem adicionar complexidade desnecessária.
        </p>

        <div className="stack">
          <Link to="/profile" className="text-link">
            Ajustar perfil
          </Link>
          <Button type="button" variant="ghost" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </section>
    </Layout>
  );
};
