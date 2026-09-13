import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Popup } from './Popup';
import { installDevMock } from './devMock';

if (import.meta.env.DEV) installDevMock();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
