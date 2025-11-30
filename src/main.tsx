import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import './presentation/styles/global.css';

declare global {
  interface Event {
    path?: EventTarget[];
  }
}

if (typeof window !== 'undefined' && typeof Event !== 'undefined') {
  const eventPrototype = Event.prototype as Event & { path?: EventTarget[] };
  if (!('path' in eventPrototype)) {
    Object.defineProperty(eventPrototype, 'path', {
      get() {
        const composedPath = typeof this.composedPath === 'function' ? this.composedPath() : [];
        return composedPath ?? [];
      },
    });
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
