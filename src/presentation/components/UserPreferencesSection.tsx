import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserPreferences } from '../../domain/entities/auth';
import { Button } from './Button';
import { SelectInput } from './SelectInput';
import { SettingsIcon } from './icons';
import { useUserPreferences } from '../context/UserPreferencesContext';

export const UserPreferencesSection = () => {
  const { t } = useTranslation();
  const { preferences, updatePreferences, isSaving } = useUserPreferences();
  const [draft, setDraft] = useState<UserPreferences>(preferences);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const themeOptions = [
    { value: 'system', label: t('preferences.themeSystem') },
    { value: 'light', label: t('preferences.themeLight') },
    { value: 'dark', label: t('preferences.themeDark') },
  ];

  const languageOptions = [
    { value: 'pt', label: t('language.optionLongPt') },
    { value: 'en', label: t('language.optionLongEn') },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.theme === preferences.theme && draft.language === preferences.language) {
      return;
    }

    await updatePreferences(draft);
  };

  const hasChanges = draft.theme !== preferences.theme || draft.language !== preferences.language;

  return (
    <section className="card settings-card">
      <div className="settings-card__header">
        <span className="card-title-icon">
          <SettingsIcon aria-hidden className="icon icon--lg" />
        </span>
        <div>
          <h2 className="section-title">{t('preferences.title')}</h2>
          <p className="section-subtitle">{t('preferences.subtitle')}</p>
        </div>
      </div>
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-form__grid">
          <SelectInput
            id="preferences-theme"
            label={t('preferences.themeLabel')}
            value={draft.theme}
            options={themeOptions}
            onChange={(event) => {
              const next = { ...draft, theme: event.target.value as UserPreferences['theme'] };
              setDraft(next);
            }}
          />
          <SelectInput
            id="preferences-language"
            label={t('preferences.languageLabel')}
            value={draft.language}
            options={languageOptions}
            onChange={(event) => {
              const next = {
                ...draft,
                language: event.target.value as UserPreferences['language'],
              };
              setDraft(next);
            }}
          />
        </div>
        <div className="settings-form__actions">
          <Button
            type="submit"
            isLoading={isSaving}
            loadingText={t('saving')}
            disabled={!hasChanges}
          >
            {t('preferences.save')}
          </Button>
          {!hasChanges && <span className="settings-form__hint">{t('preferences.upToDate')}</span>}
        </div>
      </form>
    </section>
  );
};
