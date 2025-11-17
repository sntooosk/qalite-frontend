import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { PageLoader } from './PageLoader';

const ROUTE_MESSAGES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /^\/login/, message: 'Validando suas credenciais...' },
  { pattern: /^\/(register|forgot-password)/, message: 'Preparando acesso seguro...' },
  { pattern: /^\/dashboard/, message: 'Atualizando painel principal...' },
  { pattern: /^\/organization/, message: 'Organizando dados da empresa...' },
  { pattern: /^\/stores\//, message: 'Conectando à loja selecionada...' },
  { pattern: /^\/environments\//, message: 'Configurando o ambiente solicitado...' },
  { pattern: /^\/profile/, message: 'Carregando preferências do usuário...' },
  { pattern: /^\/admin/, message: 'Carregando console administrativo...' },
];

const getRouteMessage = (pathname: string) => {
  const routeMatch = ROUTE_MESSAGES.find((route) => route.pattern.test(pathname));

  if (routeMatch) {
    return routeMatch.message;
  }

  if (pathname === '/') {
    return 'Carregando experiências QaLite...';
  }

  return 'Carregando próximo módulo...';
};

const MIN_VISIBLE_MS = 550;
const FADE_OUT_MS = 220;

export const RouteTransitionOverlay = () => {
  const location = useLocation();
  const [isRendering, setIsRendering] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [message, setMessage] = useState(() => getRouteMessage(location.pathname));
  const isFirstRender = useRef(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setMessage(getRouteMessage(location.pathname));
    setIsRendering(true);
    setIsFadingOut(false);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);

      hideTimerRef.current = setTimeout(() => {
        setIsRendering(false);
        setIsFadingOut(false);
      }, FADE_OUT_MS);
    }, MIN_VISIBLE_MS);
  }, [location.key, location.pathname, location.search]);

  if (!isRendering) {
    return null;
  }

  return <PageLoader variant="overlay" message={message} isFadingOut={isFadingOut} />;
};
