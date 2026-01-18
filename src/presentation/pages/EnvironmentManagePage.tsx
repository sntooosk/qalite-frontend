import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { Button } from '../components/Button';
import { SelectInput } from '../components/SelectInput';
import { TextArea } from '../components/TextArea';
import { TextInput } from '../components/TextInput';
import {
  MOMENT_OPTIONS_BY_ENVIRONMENT,
  TEST_TYPES_BY_ENVIRONMENT,
  requiresReleaseField,
} from '../constants/environmentOptions';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useToast } from '../context/ToastContext';
import { DeleteEnvironmentModal } from '../components/environments/DeleteEnvironmentModal';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';

export const EnvironmentManagePage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const navigate = useNavigate();
  const { t: translation } = useTranslation();
  const { showToast } = useToast();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const { setActiveOrganization } = useOrganizationBranding();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [identificador, setIdentificador] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [tipoAmbiente, setTipoAmbiente] = useState('WS');
  const [tipoTeste, setTipoTeste] = useState('Smoke-test');
  const [momento, setMomento] = useState('');
  const [release, setRelease] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [environmentOrganization, setActiveOrganization]);

  useEffect(() => {
    if (!environment) {
      return;
    }

    setIdentificador(environment.identificador);
    setUrls(environment.urls.join('\n'));
    setJiraTask(environment.jiraTask);
    setTipoAmbiente(environment.tipoAmbiente);
    setTipoTeste(environment.tipoTeste);
    setMomento(environment.momento ?? '');
    setRelease(environment.release ?? '');
  }, [environment]);

  const isLocked = environment?.status === 'done';
  const suiteSummary = useMemo(
    () => Object.keys(environment?.scenarios ?? {}).length,
    [environment?.scenarios],
  );

  const tipoTesteOptions = useMemo(() => {
    const options = TEST_TYPES_BY_ENVIRONMENT[tipoAmbiente] ?? ['Smoke-test'];
    if (!options.includes(tipoTeste)) {
      setTipoTeste(options[0]);
    }
    return options;
  }, [tipoAmbiente, tipoTeste]);

  const momentoOptions = useMemo(() => {
    const options = MOMENT_OPTIONS_BY_ENVIRONMENT[tipoAmbiente] ?? [];
    if (options.length === 0 && momento) {
      setMomento('');
    }
    if (options.length > 0 && !options.includes(momento)) {
      setMomento(options[0]);
    }
    return options;
  }, [momento, tipoAmbiente]);

  const shouldDisplayReleaseField = requiresReleaseField(tipoAmbiente);

  useEffect(() => {
    if (!shouldDisplayReleaseField && release) {
      setRelease('');
    }
  }, [release, shouldDisplayReleaseField]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!environment) {
      return;
    }

    if (momentoOptions.length > 0 && !momento) {
      setFormError(translation('editEnvironmentModal.selectMomentError'));
      return;
    }

    if (shouldDisplayReleaseField && !release.trim()) {
      setFormError(translation('editEnvironmentModal.missingReleaseError'));
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const urlsList = urls
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      await environmentService.update(environment.id, {
        identificador: identificador.trim(),
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        tipoAmbiente,
        tipoTeste,
        momento: momentoOptions.length > 0 ? momento : null,
        release: shouldDisplayReleaseField ? release.trim() : null,
      });

      navigate(`/environments/${environment.id}`);
    } catch (error) {
      console.error(error);
      setFormError(translation('editEnvironmentModal.updateEnvironmentError'));
      showToast({
        type: 'error',
        message: translation('editEnvironmentModal.updateEnvironmentError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="page-container">
          <PageLoader message={translation('environment.loading')} />
        </div>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container">
          <button type="button" className="link-button" onClick={() => navigate(-1)}>
            {translation('environment.back')}
          </button>
          <p className="section-subtitle">{translation('environment.notFound')}</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              ← {translation('environment.back')}
            </Button>
            <h1 className="section-title">{translation('editEnvironmentModal.editEnvironment')}</h1>
            <p className="section-subtitle">{translation('editEnvironmentModal.updateInfo')}</p>
          </div>
        </div>

        <div className="page-section">
          <div className="card">
            <form className="environment-form" onSubmit={handleSubmit}>
              {formError && <p className="form-message form-message--error">{formError}</p>}
              <TextInput
                id="identificadorEditar"
                label={translation('editEnvironmentModal.identifier')}
                value={identificador}
                onChange={(event) => setIdentificador(event.target.value)}
                required
                disabled={isLocked}
              />
              <TextArea
                id="urlsEditar"
                label={translation('editEnvironmentModal.urls')}
                value={urls}
                onChange={(event) => setUrls(event.target.value)}
                disabled={isLocked}
              />
              <TextInput
                id="jiraEditar"
                label={translation('editEnvironmentModal.jiraTask')}
                value={jiraTask}
                onChange={(event) => setJiraTask(event.target.value)}
                disabled={isLocked}
              />
              <SelectInput
                id="tipoAmbienteEditar"
                label={translation('editEnvironmentModal.environmentType')}
                value={tipoAmbiente}
                onChange={(event) => setTipoAmbiente(event.target.value)}
                disabled={isLocked}
                options={[
                  { value: 'WS', label: 'WS' },
                  { value: 'TM', label: 'TM' },
                  { value: 'PROD', label: 'PROD' },
                ]}
              />
              <SelectInput
                id="tipoTesteEditar"
                label={translation('editEnvironmentModal.testType')}
                value={tipoTeste}
                onChange={(event) => setTipoTeste(event.target.value)}
                disabled={isLocked}
                options={tipoTesteOptions.map((option) => ({
                  value: option,
                  label: translation(option),
                }))}
              />
              {momentoOptions.length > 0 && (
                <SelectInput
                  id="momentoEditar"
                  label={translation('editEnvironmentModal.moment')}
                  value={momento}
                  onChange={(event) => setMomento(event.target.value)}
                  disabled={isLocked}
                  options={momentoOptions.map((option) => ({
                    value: option,
                    label: translation(option),
                  }))}
                />
              )}
              {shouldDisplayReleaseField && (
                <TextInput
                  id="releaseEditar"
                  label={translation('editEnvironmentModal.release')}
                  value={release}
                  onChange={(event) => setRelease(event.target.value)}
                  disabled={isLocked}
                />
              )}

              <p className="environment-suite-preview">
                {translation('editEnvironmentModal.suiteSummary')} {suiteSummary}
              </p>
              <div className="form-actions">
                <Button
                  type="submit"
                  disabled={isLocked}
                  isLoading={isSubmitting}
                  loadingText={translation('editEnvironmentModal.saving')}
                >
                  {translation('editEnvironmentModal.saveChanges')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                  {translation('cancel')}
                </Button>
              </div>

              <div className="modal-danger-zone">
                <div>
                  <h4>{translation('deleteEnvironmentModal.deleteEnvironment')}</h4>
                  <p>{translation('deleteEnvironmentModal.deleteEnvironmentWarning')}</p>
                </div>
                <button
                  type="button"
                  className="link-danger"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={isLocked}
                >
                  {translation('deleteEnvironmentModal.deleteEnvironment')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {environmentOrganization && (
          <div className="page-section">
            <OrganizationLogPanel organizationId={environmentOrganization.id} />
          </div>
        )}
      </section>

      <DeleteEnvironmentModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        environment={environment}
        onDeleted={() => navigate('/dashboard')}
      />
    </Layout>
  );
};
