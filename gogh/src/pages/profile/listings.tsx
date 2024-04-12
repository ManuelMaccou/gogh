import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import Header from '../header';

interface MarketplaceProduct {
    _id: string;
    title: string;
    featuredImage: string;
}

const PurchasesPage: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceProduct[]>([]);
  const { user } = useUser();

  const { ready, authenticated, getAccessToken, logout } = usePrivy();

  useEffect(() => {
    const fetchListings = async () => {
        const accessToken = await getAccessToken();

        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/listings`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setListings(response.data);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    };

    if (user) {
        fetchListings();
    }
  }, [user]);

  // Trigger escrow signing here


  return (
    <>
    <Header />
    <div className='profile-page'>
        <div className="products-container">
            {listings.map((listing) => (
                <div key={listing._id} className="product-row">
                    <img src={listing.featuredImage} alt="Product" className="product-image" />
                    <div>
                        <h3>{listing.title}</h3>
                        {/* Placeholder for the transaction status */}
                        <p>Status: Pending</p>
                    </div>
                    <div>
                        <button className="cancel-button">Cancel</button>
                        <button className="confirm-button">Confirm</button>
                    </div>
                </div>
            ))}
        </div>
    </div>
    </>
  );
};

export default PurchasesPage;
