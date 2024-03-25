import React from 'react';
// Assuming Privy provides hooks for authentication, adjust import paths as necessary
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../contexts/userContext';
import LoginButton from '../loginButton';

const Header = () => {
    const { ready, authenticated, getAccessToken, logout } = usePrivy();
    const { user } = useUser();

    const userName = user?.fc_username ?? user?.walletAddress?.slice(0, 6);

    const handleLogout = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        logout();
    };

    return (
        <header className="site-header">
            <div>
                <a href="/">
                    <img className='header-logo' src="/logo192.png" alt="Logo" />
                </a>
            </div>

            <div className='header-nav'>
                {!authenticated && (
                     <LoginButton buttonText="Log In" />
                )}

                {authenticated && ready && user && (
                <>
                    <div className="profile-card">
                        {user?.fc_pfp && (
                            <img src={user?.fc_pfp} alt="User profile" className="fc-pfp" />
                        )}
                        <p>{userName}</p>
                    </div>
                    <button
                        className="logout-button"
                        disabled={!ready}
                        onClick={handleLogout}
                    >
                        Log out
                    </button>
                </>
                )}
            </div>
        </header>
    );
};

export default Header;
