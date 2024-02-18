import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';

interface NavigationProps {
    showNav: boolean;
  }

  const Navigation: React.FC<NavigationProps> = ({ showNav }) => {
    const navigate = useNavigate();

    const [impersonateFid, setImpersonateFid] = useState('');
    const [currentFid, setCurrentFid] = useState(localStorage.getItem('currentFid') || '');
    const [isAdmin, setIsAdmin] = useState(false);

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const isLoggedIn = () => localStorage.getItem('token') !== null;

    const handleImpersonateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/impersonate`, { targetFid: impersonateFid }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('currentFid', impersonateFid);
            setCurrentFid(impersonateFid);
            navigate('/manage-store');
            
        } catch (error: unknown) { 
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || 'An error occurred';
                console.error("Error during impersonation:", message);
            } else {
                console.error("Error during impersonation:", error);
            }
        }
    };

    React.useEffect(() => {
        const isAdminFlag = localStorage.getItem('isAdmin') === 'true';
        setIsAdmin(isAdminFlag);
    }, []);


    if (!showNav) {
        return null;
    }

    return (
        <nav className="navigation">
            {isLoggedIn() && isAdmin && (
                <>
                <form onSubmit={handleImpersonateSubmit} className="impersonate-form">
                    <input
                    type="text"
                    value={impersonateFid}
                    onChange={(e) => setImpersonateFid(e.target.value)}
                    placeholder="Enter user's FID"
                    required
                    />
                    <button type="submit">Impersonate</button>
                </form>
                <p>Current FID: {currentFid}</p>
                </>
            )}
            {isLoggedIn() && (
                <div className="logout-container">
                    <button onClick={logout}>Logout</button>
                </div>
            )}
        </nav>
    );
};

export default Navigation;