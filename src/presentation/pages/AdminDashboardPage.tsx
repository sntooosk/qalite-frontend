import { Layout } from '../components/Layout';

export const AdminDashboardPage = () => (
  <Layout>
    <section className="list-grid">
      <div className="card">
        <span className="badge">Somente admins</span>
        <h1 className="section-title">Visão estratégica da plataforma</h1>
        <p className="section-subtitle">
          Gerencie usuários, papéis e configurações avançadas com segurança e visibilidade total das
          operações.
        </p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-primary">Próximos passos</h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted">
          <li>Adicionar relatórios avançados de auditoria.</li>
          <li>Gerenciar permissões por módulo e grupo.</li>
          <li>Integrar métricas em tempo real do Firestore.</li>
        </ul>
      </div>
    </section>
  </Layout>
);
