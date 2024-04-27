import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import LoginButton from './loginButton'; // Adjust the import path as needed

const ProtectedRoute = () => {
    const { ready, authenticated } = usePrivy();

    if (!ready) {
        return <div>Loading...</div>; // Shows loading until Privy is ready
    }

    if (!authenticated) {
        // User is not authenticated, show login button
        return (
            <div style={{ width: '300px', margin: '100px auto', textAlign: 'center' }}>
                <p>You must be logged in to view this page.</p>
                <LoginButton buttonText="Log In"  />
            </div>
        );
    }

    return <Outlet />; // User is authenticated, render the child route
};

export default ProtectedRoute;