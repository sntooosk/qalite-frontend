import { Link } from 'react-router-dom';

import { Layout } from '../components/Layout';

export const ForbiddenPage = () => (
  <Layout>
    <section className="mx-auto max-w-md rounded-2xl bg-surface p-10 text-center shadow-xl">
      <h1 className="text-3xl font-bold text-danger">403</h1>
      <p className="mt-4 text-muted">
        Você não tem permissão para acessar esta página. Entre em contato com o administrador ou
        volte ao início.
      </p>
      <Link to="/" className="button button-primary mt-6 inline-flex">
        Voltar para o início
      </Link>
    </section>
  </Layout>
);
