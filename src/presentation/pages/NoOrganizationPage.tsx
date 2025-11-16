import { Layout } from '../components/Layout';

export const NoOrganizationPage = () => (
  <Layout>
    <section className="list-grid">
      <div className="card">
        <span className="badge">Pending configuration</span>
        <h1 className="section-title">You are not linked to an organization yet</h1>
        <p className="section-subtitle">
          Contact an administrator to be added to a team and unlock QaLite resources.
        </p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-primary">What can you do now?</h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted">
          <li>Make sure your profile data is updated under &quot;Profile&quot;.</li>
          <li>Confirm your account email with the administrator in charge.</li>
          <li>Log in again once you are invited to access your organization.</li>
        </ul>
      </div>
    </section>
  </Layout>
);
