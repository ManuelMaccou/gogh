import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar: React.FC = () => {
    return (
        <div className="sidebar">
            <div className="sidebar-content">
                <h2>Gogh Shopping</h2>
                <nav>
                    <ul>
                        <li><Link to="/account/create-listing">Create Listing</Link></li>
                        <li><Link to="/account/listings">View Listings</Link></li>
                    </ul>
                </nav>
            </div>
        </div>
    );
};

export default Sidebar;