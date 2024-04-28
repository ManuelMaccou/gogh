import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { useLocation } from 'react-router-dom';
import CreateListing from './marketplace/account/createListing';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useUser } from '../contexts/userContext';
import Header from './header';
import '../../src/styles.css';

interface User {
    privyId: string;
    _id: string;
    fid?: string;
    fc_username?: string;
    fc_pfp?: string;
    fc_bio?: string;
    fc_url?: string;
    email?: string;
    walletAddress?: string;
  }

interface Product {
    _id: string;
    status: string;
    shipping: boolean;
    farcon: boolean;
    location: string;
    title: string;
    description: string;
    featuredImage: string;
    additionalImages: string [];
    price: string;
    walletAddress: string;
    email: string;
    user: User;
}

const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [products, setProducts] = useState<Product[]>([]);
    const { setUser } = useUser();
    const createListingRef = useRef<{ openCreateListingModal: () => void }>(null);
    
    const { ready, authenticated, getAccessToken, logout } = usePrivy();

    const handleButtonClick = () => {
        if (!authenticated) {
          login();
          return;
        }
        navigate('/account/create-listing');
    };

    const { login } = useLogin({
        onComplete: async (user, isNewUser) => {

            const accessToken = await getAccessToken();

            const userPayload = {
                privyId: user.id,
                walletAddress: user.wallet?.address,
                ...(user.farcaster && {
                    fid: user.farcaster?.fid,
                    fc_username: user.farcaster?.displayName,
                    fc_fname: user.farcaster?.username,
                    fc_pfp: user.farcaster?.pfp,
                    fc_bio: user.farcaster?.bio,
                    fc_url: `https://warpcast.com/${user.farcaster?.username}`,
                }),
            };

            try {
                if (isNewUser) {
                    try {

                        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/create`, userPayload, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });

                        if (response.status === 201) {
                            setUser(response.data.user);
                        } else {
                            throw new Error('Failed to fetch user details');
                        }

                    } catch (error) {
                        if (axios.isAxiosError(error)) {
                            console.error('Error fetching user details:', error.response?.data?.message || error.message);
                        } else {
                            console.error('Unexpected error:', error);
                        }
                        setUser(null);
                    }
                    
                } else {
                    const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/lookup`, userPayload, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    
                    if (response.status === 200) {
                        setUser(response.data);
                    } else {
                        throw new Error('Failed to fetch user details');
                    }
                }
            } catch (error) {
                if (error instanceof AxiosError) {
                    console.error('Error fetching user details:', error.response?.data?.message || error.message);
                } else {
                    console.error('Unexpected error:', error);
                }
                setUser(null);
            }
        },
        onError: (error) => {
            console.error("Privy login error:", error);
        },
    });

    useEffect(() => {
        const fetchUserDetails = async () => {
            const accessToken = await getAccessToken();

            if (!accessToken) {
                setUser(null);
                return;
            }

            if (!authenticated) {
                setUser(null);
                return;
            }

            try {

                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/lookup`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                setUser(response.data);
            } catch(error) {
                console.error('Error fetching user details:', error);
                setUser(null);
            }
        };

        fetchUserDetails();
    }, [authenticated]);

    const openListingPage = (product: Product) => {
        const productId = product._id;
        navigate(`/listing/${productId}`);
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/?status=approved`);
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    return (
        <div className='main-container'>
            <Header />
            <section className="hero-section">
                <h1 className="title">Buy and sell products on Farcaster</h1>
                    {!authenticated ? (
                    <>
                        <button
                            disabled={!ready}
                            className="login-button"
                            onClick={(e) => {
                                e.preventDefault();
                                login();
                            }}
                            >
                            <p>Log in to add listing</p>
                        </button>
                    </>
                ) : (
                    <>
                        <div className="create-listing">
                            <button className="create-listing-button" onClick={handleButtonClick}>Create Listing</button>
                        </div>
                    </>

                )}
            </section>
            <section className="submitted-products">
                <div className="marketplace-products-grid">
                {products.map((product) => (
                    <div 
                        key={product._id}
                        className={`marketplace-product-card ${product.farcon ? 'farcon-border' : ''}`}
                        onClick={() => openListingPage(product)}
                    >
                        {product.farcon && (
                            <div className="farcon-ribbon">
                                <span>Pick up at FarCon</span>
                            </div>
                        )}
                        <div>
                            <img src={product.featuredImage} alt={product.title} className='marketplace-img'/>
                            <h3>{product.title}</h3>
                            <p>Location: {product.location}</p>
                            <p>Price: ${product.price}</p>
                        </div>
                        <div className='profile-card'>
                            {product.user && (
                            <>
                                <img 
                                src={product.user.fc_pfp || "/images/default-profile.jpg"}
                                onError={(e) => { 
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null; // Prevents infinite loop in case fallback image also fails
                                    target.src = "/images/default-profile.jpg";
                                }}
                                alt="User profile picture"
                                className='fc-pfp'
                            />
                                <span>{product.user.fc_username ?? product.user.walletAddress?.slice(0, 6)}</span>
                            </>
                            )}
                        </div>
                    </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HomePage;
