import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { App } from './App';
import './index.css';

// Zod 4 domyślnie próbuje kompilować walidatory przez `new Function` (JIT). Nasze CSP słusznie
// blokuje eval, a Firefox zgłasza wtedy błąd w konsoli - tryb jitless pomija tę próbę.
z.config({ jitless: true });

const root = document.getElementById('root');
if (!root) throw new Error('Brak elementu #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
