import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Alternar tema">
      <span aria-hidden>{theme === 'light' ? '🌞' : '🌙'}</span>
    </button>
  );
};
