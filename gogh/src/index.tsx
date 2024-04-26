import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {PrivyProvider} from '@privy-io/react-auth';
import { init as initAirstack } from "@airstack/airstack-react";

// Initialize Airstack SDK with a check for environment variable
const airstackApiKey = process.env.REACT_APP_AIRSTACK_API_KEY;
if (!airstackApiKey) {
  console.error('Airstack API key is not defined!');
} else {
  initAirstack(airstackApiKey);
}

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
