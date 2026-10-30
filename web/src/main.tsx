import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n/I18nContext';
import './styles/theme.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('ไม่พบ #root element');
}
createRoot(container).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
