import React from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import Header from '../../header';

const AccountPageContainer = () => {
    const navigate = useNavigate();
    const location = useLocation();

    type ButtonTextMap = {
        [key: string]: string;
    };

    const buttonTexts: ButtonTextMap = {
        '/account/create-listing': 'Create Listing',
        '/profile/purchases': 'View Purchases',
        '/profile/listings': 'View Listings'
    };

    const handleBackClick = () => {
        navigate(-1);  // Navigates back to the previous page
    };

    const getButtonText = () => {
        return buttonTexts[location.pathname] || 'Go Back';
    };

    return (
        <div className="container">
            <Header />
            <div className="account-page">
                <div className="sidebar">
                    <div className="sidebar-content">
                        <nav>
                            <ul>
                                <li><Link to="/account/create-listing">Create Listing</Link></li>
                                <li><Link to="/profile/purchases">View Purchases</Link></li>
                                <li><Link to="/profile/listings">View Listings</Link></li>
                            </ul>
                        </nav>
                    </div>
                </div>
                <div className="account-main-container">
                    <button className="back-button" onClick={handleBackClick}>
                        <i className="fa-solid fa-arrow-left-long"></i>
                        <span>{getButtonText()}</span>
                    </button>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AccountPageContainer;
