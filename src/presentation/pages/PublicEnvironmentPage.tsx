import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EnvironmentBugList } from '../components/environments/EnvironmentBugList';
import { EnvironmentSummaryCard } from '../components/environments/EnvironmentSummaryCard';
import { useEnvironmentResource } from '../hooks/useEnvironmentResource';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { useEnvironmentDetails } from '../hooks/useEnvironmentDetails';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../components/ErrorState';
import { EnvironmentPageSkeleton } from '../components/skeletons/EnvironmentPageSkeleton';

export const PublicEnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading, error, refetch } = useEnvironmentResource(environmentId);
  const {
    profiles: participants,
    isLoading: isLoadingParticipants,
    error: participantsError,
    refetch: refetchParticipants,
  } = useUserProfiles(environment?.participants ?? []);
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const { setActiveOrganization } = useOrganizationBranding();
  const { formattedTime, formattedStart, formattedEnd } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
  );
  const {
    bugs,
    isLoading: isLoadingBugs,
    error: bugsError,
    refetch: refetchBugs,
  } = useEnvironmentBugs(environment?.id ?? null);
  const { progressPercentage, progressLabel, scenarioCount, headerMeta, urls } =
    useEnvironmentDetails(environment, bugs);

  const { t, i18n } = useTranslation();

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

  if (isLoading) {
    return (
      <Layout>
        <EnvironmentPageSkeleton isPublic />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <section className="page-container">
          <ErrorState
            title={t('publicEnvironment.loadError')}
            description={error}
            actionLabel={t('retry')}
            onRetry={refetch}
          />
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
            isParticipantsLoading={isLoadingParticipants}
            participantsError={participantsError}
            onRetryParticipants={refetchParticipants}
            bugsCount={bugs.length}
          />
        </div>

        <div className="environment-evidence">
          <EnvironmentEvidenceTable
            environment={environment}
            isLocked
            readOnly
            organizationId={environmentOrganization?.id ?? null}
          />
        </div>
        <EnvironmentBugList
          environment={environment}
          bugs={bugs}
          isLocked
          isLoading={isLoadingBugs}
          error={bugsError}
          onEdit={() => {}}
          showActions={false}
          showHeader={false}
          onRetry={refetchBugs}
        />
      </section>
    </Layout>
  );
};
