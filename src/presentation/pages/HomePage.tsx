import { Link } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { Layout } from '../components/Layout';

export const HomePage = () => {
  const { user, hasRole } = useAuth();

  return (
    <Layout>
      <section className="hero">
        <div className="card">
          <span className="badge">Bem-vindo</span>
          <h1 className="section-title">Gerencie acessos com mais estilo</h1>
          {user ? (
            <p className="section-subtitle">
              Você está autenticado como <strong>{user.displayName || user.email}</strong> com o papel
              <strong> {user.role}</strong>.
            </p>
          ) : (
            <p className="section-subtitle">
              Faça login ou crie uma conta para acessar dashboards e recursos exclusivos com apenas alguns cliques.
            </p>
          )}

          <div className="flex flex-wrap gap-5 mt-6">
            {user ? (
              <>
                <Link to="/dashboard" className="button button-primary">
                  Dashboard do usuário
                </Link>
                {hasRole(['admin']) && (
                  <Link to="/admin" className="button button-secondary">
                    Painel administrativo
                  </Link>
                )}
                <Link to="/profile" className="button button-ghost">
                  Meu perfil
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="button button-primary">
                  Entrar
                </Link>
                <Link to="/register" className="button button-secondary">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-primary">O que você encontra por aqui</h2>
          <p className="mt-4 text-muted">
            Uma experiência moderna de autenticação, com fluxo simplificado e personalização para cada usuário.
          </p>
          <ul className="mt-6 list-disc pl-5 text-sm text-muted">
            <li>Interface responsiva com modo claro e escuro.</li>
            <li>Gestão de perfis com foto e atualização em tempo real.</li>
            <li>Proteção de rotas para diferentes perfis de acesso.</li>
          </ul>
        </div>
      </section>
    </Layout>
  );
};
