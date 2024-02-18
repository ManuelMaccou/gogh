import React from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './navigation';

const NavigationWrapper: React.FC = () => {
  const location = useLocation();
  const showNav = location.pathname !== "/"; // Hide on home page

  return (
    <Navigation showNav={showNav} />
  );
};

export default NavigationWrapper;
