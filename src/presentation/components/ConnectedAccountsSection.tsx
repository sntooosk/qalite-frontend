import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Alert } from './Alert';
import { BrowserstackIcon, LinkIcon } from './icons';

const maskSecret = (value: string) => {
  if (!value) {
    return '••••';
  }

  const visible = value.slice(-4);
  return `•••• ${visible}`;
};

export const ConnectedAccountsSection = () => {
  const { t } = useTranslation();
  const { user, updateProfile, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const connectedCredentials = user?.browserstackCredentials ?? null;
  const isConnected = Boolean(connectedCredentials?.username || connectedCredentials?.accessKey);

  useEffect(() => {
    setUsername(connectedCredentials?.username ?? '');
    setAccessKey('');
    setIsEditing(!isConnected);
    setLocalError(null);
  }, [connectedCredentials?.accessKey, connectedCredentials?.username, isConnected]);

  const maskedAccessKey = useMemo(
    () => maskSecret(connectedCredentials?.accessKey ?? ''),
    [connectedCredentials?.accessKey],
  );

  const handleDisconnect = async () => {
    setLocalError(null);
    await updateProfile({ browserstackCredentials: null });
    setUsername('');
    setAccessKey('');
    setIsEditing(false);
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

    await updateProfile({
      browserstackCredentials: {
        username: trimmedUsername,
        accessKey: trimmedAccessKey,
      },
    });
    setAccessKey('');
    setIsEditing(false);
  };

  return (
    <section className="card settings-card">
      <div className="settings-card__header">
        <span className="card-title-icon">
          <LinkIcon aria-hidden className="icon icon--lg" />
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
              <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
                {t('connectedAccounts.update')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void handleDisconnect()}>
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

      {(isEditing || !isConnected) && (
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
            <Button type="submit" isLoading={isLoading} loadingText={t('saving')}>
              {isConnected ? t('connectedAccounts.save') : t('connectedAccounts.connect')}
            </Button>
            {isConnected && (
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                {t('cancel')}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
};
