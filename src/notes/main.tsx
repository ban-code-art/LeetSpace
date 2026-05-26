import React from 'react';
import ReactDOM from 'react-dom/client';
import NotesLibrary from './NotesLibrary';
import '../sidepanel/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotesLibrary />
  </React.StrictMode>
);
