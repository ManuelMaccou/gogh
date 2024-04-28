import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();

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

    const handleEdit = (listingId: string) => {
        navigate(`/account/edit-listing/${listingId}`);
      };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            {listings.length > 0 ? (
                    listings.map((listing) => (
                        <div className='listing-card' key={listing._id} onClick={() => handleEdit(listing._id)}>
                            <div className='listing-featured-image'>
                                <img src={listing.featuredImage} alt={listing.title} />
                            </div>
                            <div className='listing-details'>
                                <h3>{listing.title}</h3>
                                <p>{listing.description}</p>
                                <p>Price: {listing.price}</p>
                            </div>
                        </div>
                    ))
            ) : (
                <p>No listings found.</p>
            )}
        </div>
    );
};

export default UserListings;
