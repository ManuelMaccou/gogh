import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Header from '../../header';
import Sidebar from './sidebar';
import axios from 'axios';

interface MarketplaceProduct {
    _id: string;
    status: string;
    title: string;
    description: string;
    featuredImage: string;
    price: string;
}

const UserListings = () => {
    const [listings, setListings] = useState<MarketplaceProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { getAccessToken } = usePrivy();

    useEffect(() => {
        const fetchListings = async () => {
            const accessToken = await getAccessToken();
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/listings`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                setListings(response.data);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch listings. Please try again later.');
                setLoading(false);
                console.error(err);
            }
        };

        fetchListings();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <Header />
            <h2>Your Listings</h2>
            {listings.length > 0 ? (
                <ul>
                    {listings.map((listing) => (
                        <li key={listing._id}>
                            <h3>{listing.title}</h3>
                            <p>{listing.description}</p>
                            <img src={listing.featuredImage} alt={listing.title} style={{ width: '100px', height: '100px' }} />
                            <p>Price: {listing.price}</p>
                            {/* Add more fields as necessary */}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No listings found.</p>
            )}
        </div>
    );
};

export default UserListings;
