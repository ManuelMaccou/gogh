import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {PrivyProvider} from '@privy-io/react-auth';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Router>
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID!}
    >
      <App />
      </PrivyProvider>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
