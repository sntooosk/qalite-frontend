import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { storeService } from '../../application/use-cases/StoreUseCase';
import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EnvironmentBugList } from '../components/environments/EnvironmentBugList';
import { EnvironmentSummaryCard } from '../components/environments/EnvironmentSummaryCard';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { useEnvironmentDetails } from '../hooks/useEnvironmentDetails';
import { useTranslation } from 'react-i18next';

export const PublicEnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const [storeName, setStoreName] = useState<string>('');
  const participants = useUserProfiles(environment?.participants ?? []);
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const { setActiveOrganization } = useOrganizationBranding();
  const { t, i18n } = useTranslation();
  const { formattedTime, formattedStart, formattedEnd } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
    {
      translation: t,
      locale: i18n.language,
    },
  );
  const { bugs, isLoading: isLoadingBugs } = useEnvironmentBugs(environment?.id ?? null);
  const { progressPercentage, progressLabel, scenarioCount, headerMeta, urls } =
    useEnvironmentDetails(environment, bugs);

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [environmentOrganization, setActiveOrganization]);

  useEffect(() => {
    if (environment?.publicShareLanguage && i18n.language !== environment.publicShareLanguage) {
      void i18n.changeLanguage(environment.publicShareLanguage);
    }
  }, [environment?.publicShareLanguage, i18n]);

  useEffect(() => {
    if (!environment?.storeId) {
      setStoreName('');
      return;
    }

    let isMounted = true;

    const fetchStoreName = async () => {
      try {
        const store = await storeService.getById(environment.storeId);
        if (isMounted) {
          setStoreName(store?.name?.trim() || '');
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setStoreName('');
        }
      }
    };

    void fetchStoreName();

    return () => {
      isMounted = false;
    };
  }, [environment?.storeId]);

  if (isLoading) {
    return (
      <Layout>
        <section className="page-container">
          <p className="section-subtitle">{t('publicEnvironment.loading')}</p>
        </section>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container">
          <h1 className="section-title">{t('publicEnvironment.notFound')}</h1>
          <p className="section-subtitle">{t('publicEnvironment.tryAgain')}</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container environment-page environment-page--public">
        <div className="environment-page__header">
          <div>
            <h1 className="section-title">{environment.identificador}</h1>
            <p className="section-subtitle">
              {environment.tipoAmbiente} · {environment.tipoTeste}
            </p>
            {headerMeta.length > 0 && <p className="section-subtitle">{headerMeta.join(' · ')}</p>}
          </div>
        </div>

        <div className="environment-summary-grid">
          <EnvironmentSummaryCard
            environment={environment}
            progressPercentage={progressPercentage}
            progressLabel={progressLabel}
            scenarioCount={scenarioCount}
            formattedTime={formattedTime}
            formattedStart={formattedStart}
            formattedEnd={formattedEnd}
            urls={urls}
            participants={participants}
            bugsCount={bugs.length}
            storeName={storeName}
          />
        </div>

        <div className="environment-evidence">
          <EnvironmentEvidenceTable environment={environment} isLocked readOnly />
        </div>
        <EnvironmentBugList
          environment={environment}
          bugs={bugs}
          isLocked
          isLoading={isLoadingBugs}
          onEdit={() => {}}
          showActions={false}
          showHeader={false}
        />
      </section>
    </Layout>
  );
};
