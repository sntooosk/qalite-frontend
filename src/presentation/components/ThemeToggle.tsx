import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      aria-pressed={theme === 'dark'}
      data-theme-state={theme}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {theme === 'light' ? '🌞' : '🌙'}
      </span>
      <span className="theme-toggle__label">
        {theme === 'light' ? t('themeToggle.light') : t('themeToggle.dark')}
      </span>
    </button>
  );
};
