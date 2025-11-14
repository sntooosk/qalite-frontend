import { Layout } from '../components/Layout';

export const UserDashboardPage = () => (
  <Layout>
    <section className="list-grid">
      <div className="card">
        <span className="badge">Painel pessoal</span>
        <h1 className="section-title">Suas informações em um só lugar</h1>
        <p className="section-subtitle">
          Acompanhe atividades, personalize preferências e acesse rapidamente os módulos liberados para o
          seu perfil.
        </p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-primary">Próximos recursos</h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted">
          <li>Módulo de tarefas pessoais com metas diárias.</li>
          <li>Notificações em tempo real sobre eventos importantes.</li>
          <li>Integração com calendários externos e exportação.</li>
        </ul>
      </div>
    </section>
  </Layout>
);
