interface PageLoaderProps {
  message?: string;
  variant?: 'page' | 'overlay';
  isFadingOut?: boolean;
}

export const PageLoader = ({
  message = 'Carregando...',
  variant = 'page',
  isFadingOut = false,
}: PageLoaderProps) => {
  const containerClass = [
    'page-loading',
    variant === 'overlay' ? 'page-loading--overlay' : 'page-loading--page',
    isFadingOut ? 'page-loading--fade-out' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className="page-loading__card">
        <span className="page-loading__spinner" aria-hidden="true" />
        <div className="page-loading__text">
          <p className="page-loading__eyebrow">Aguarde</p>
          <p className="page-loading__message">{message}</p>
        </div>
      </div>
    </div>
  );
};
