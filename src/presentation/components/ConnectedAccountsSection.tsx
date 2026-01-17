import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Alert } from './Alert';
import { BrowserstackIcon } from './icons';

const maskSecret = (value: string) => {
  if (!value) {
    return '••••';
  }

  const visible = value.slice(-4);
  return `•••• ${visible}`;
};

export const ConnectedAccountsSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);

  const organizationId = user?.organizationId ?? null;
  const connectedCredentials = organization?.browserstackCredentials ?? null;
  const isConnected = Boolean(connectedCredentials?.username || connectedCredentials?.accessKey);

  useEffect(() => {
    setUsername(connectedCredentials?.username ?? '');
    setAccessKey('');
    setIsEditing(!isConnected && Boolean(organizationId));
    setLocalError(null);
  }, [
    connectedCredentials?.accessKey,
    connectedCredentials?.username,
    isConnected,
    organizationId,
  ]);

  useEffect(() => {
    if (!organizationId) {
      setOrganization(null);
      return;
    }

    let isMounted = true;

    const fetchOrganization = async () => {
      setIsLoadingOrganization(true);
      try {
        const data = await organizationService.getById(organizationId);
        if (isMounted) {
          setOrganization(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setOrganization(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingOrganization(false);
        }
      }
    };

    void fetchOrganization();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const maskedAccessKey = useMemo(
    () => maskSecret(connectedCredentials?.accessKey ?? ''),
    [connectedCredentials?.accessKey],
  );

  const buildOrganizationPayload = (nextCredentials: Organization['browserstackCredentials']) => {
    if (!organization) {
      return null;
    }

    return {
      name: organization.name,
      description: organization.description,
      slackWebhookUrl: organization.slackWebhookUrl ?? '',
      emailDomain: organization.emailDomain ?? '',
      browserstackCredentials: nextCredentials ?? null,
    };
  };

  const handleDisconnect = async () => {
    if (!organization) {
      setLocalError(t('connectedAccounts.organizationRequired'));
      return;
    }

    setLocalError(null);
    try {
      setIsSaving(true);
      const payload = buildOrganizationPayload(null);
      if (!payload) {
        return;
      }
      const updated = await organizationService.update(organization.id, payload);
      setOrganization(updated);
      setUsername('');
      setAccessKey('');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setLocalError(t('connectedAccounts.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const trimmedUsername = username.trim();
    const trimmedAccessKey = accessKey.trim();

    if (!trimmedUsername || !trimmedAccessKey) {
      setLocalError(t('connectedAccounts.browserstackRequired'));
      return;
    }

    if (!organization) {
      setLocalError(t('connectedAccounts.organizationRequired'));
      return;
    }

    try {
      setIsSaving(true);
      const payload = buildOrganizationPayload({
        username: trimmedUsername,
        accessKey: trimmedAccessKey,
      });
      if (!payload) {
        return;
      }
      const updated = await organizationService.update(organization.id, payload);
      setOrganization(updated);
      setAccessKey('');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setLocalError(t('connectedAccounts.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card settings-card">
      <div className="settings-card__header">
        <span className="card-title-icon">
          <BrowserstackIcon aria-hidden className="icon icon--lg" />
        </span>
        <div>
          <h2 className="section-title">{t('connectedAccounts.title')}</h2>
          <p className="section-subtitle">{t('connectedAccounts.subtitle')}</p>
        </div>
      </div>

      {localError && <Alert type="error" message={localError} />}

      <div className="connected-account">
        <div className="connected-account__summary">
          <span className="connected-account__icon">
            <BrowserstackIcon aria-hidden className="icon icon--lg" />
          </span>
          <div>
            <h3>{t('connectedAccounts.browserstackTitle')}</h3>
            <p className="connected-account__description">
              {t('connectedAccounts.browserstackDescription')}
            </p>
            {isConnected ? (
              <div className="connected-account__details">
                <span>
                  {t('connectedAccounts.username')}: {connectedCredentials?.username}
                </span>
                <span>
                  {t('connectedAccounts.accessKey')}: {maskedAccessKey}
                </span>
              </div>
            ) : (
              <span className="connected-account__status connected-account__status--off">
                {t('connectedAccounts.disconnected')}
              </span>
            )}
          </div>
        </div>

        <div className="connected-account__actions">
          {isConnected && !isEditing ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditing(true)}
                disabled={isSaving || isLoadingOrganization}
              >
                {t('connectedAccounts.update')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleDisconnect()}
                disabled={isSaving || isLoadingOrganization}
              >
                {t('connectedAccounts.disconnect')}
              </Button>
            </>
          ) : (
            <span className="connected-account__status connected-account__status--on">
              {t('connectedAccounts.connectPrompt')}
            </span>
          )}
        </div>
      </div>

      {!organizationId && (
        <p className="section-subtitle">{t('connectedAccounts.organizationRequired')}</p>
      )}

      {organizationId && (isEditing || !isConnected) && (
        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-form__grid">
            <TextInput
              id="browserstack-username"
              label={t('connectedAccounts.username')}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t('connectedAccounts.usernamePlaceholder')}
              required
            />
            <TextInput
              id="browserstack-access-key"
              label={t('connectedAccounts.accessKey')}
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder={t('connectedAccounts.accessKeyPlaceholder')}
              type="password"
              required
            />
          </div>
          <p className="form-hint">{t('connectedAccounts.browserstackHint')}</p>
          <div className="settings-form__actions">
            <Button
              type="submit"
              isLoading={isSaving}
              loadingText={t('saving')}
              disabled={isLoadingOrganization}
            >
              {isConnected ? t('connectedAccounts.save') : t('connectedAccounts.connect')}
            </Button>
            {isConnected && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving || isLoadingOrganization}
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
};
