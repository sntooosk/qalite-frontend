import { Layout } from '../components/Layout';
import { UserPreferencesSection } from '../components/UserPreferencesSection';
import { ConnectedAccountsSection } from '../components/ConnectedAccountsSection';
import { useTranslation } from 'react-i18next';

export const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <section className="card settings-page-header">
        <h1 className="section-title">{t('settings.title')}</h1>
        <p className="section-subtitle">{t('settings.subtitle')}</p>
      </section>

      <UserPreferencesSection />
      <ConnectedAccountsSection />
    </Layout>
  );
};
