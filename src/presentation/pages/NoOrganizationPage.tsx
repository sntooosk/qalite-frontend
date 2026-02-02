import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { CheckCircleIcon, SettingsIcon, UsersGroupIcon } from '../components/icons';

export const NoOrganizationPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <section className="list-grid">
        <div className="card">
          <div className="card-title-group">
            <span className="card-title-icon" aria-hidden>
              <UsersGroupIcon className="icon icon--lg" />
            </span>
            <div>
              <span className="badge">{t('noOrganization.badge')}</span>
              <h1 className="section-title">{t('noOrganization.title')}</h1>
            </div>
          </div>
          <p className="section-subtitle">{t('noOrganization.subtitle')}</p>
        </div>
        <div className="card">
          <div className="card-title-group">
            <span className="card-title-icon" aria-hidden>
              <SettingsIcon className="icon icon--lg" />
            </span>
            <h2 className="section-title">{t('noOrganization.steps')}</h2>
          </div>
          <ul className="list-with-icons">
            <li>
              <CheckCircleIcon aria-hidden className="icon" />
              <span>
                {t('noOrganization.update')} &quot;{t('profile')}&quot;.
              </span>
            </li>
            <li>
              <CheckCircleIcon aria-hidden className="icon" />
              <span>{t('noOrganization.confirm')}</span>
            </li>
            <li>
              <CheckCircleIcon aria-hidden className="icon" />
              <span>{t('noOrganization.invite')}</span>
            </li>
          </ul>
        </div>
      </section>
    </Layout>
  );
};
