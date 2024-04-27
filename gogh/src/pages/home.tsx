import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { useLocation } from 'react-router-dom';
import CreateListing from './marketplace/createListing';
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

const featuredStoreImages = [
    {src: 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1709498497078x837410041897568300/nouns_esports_img.jpg', link: "https://warpcast.com/esports/0xc9e47998"},
    {src: 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1709500013450x264616000700178980/swagcaster_feat_img.jpg', link: "https://warpcast.com/j4ck.eth/0xe3f60406"},
    {src: 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1709500231001x485695485453701900/chippi_feat_img.png', link: "https://warpcast.com/manuelmaccou.eth/0x14faed20"},
    {src: 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1709500585473x287938630848797440/shop_degen_feat_img.jpg', link: "https://warpcast.com/lluis/0x1b3847f0"},
  ];

const supportedCities = [
    "NYC",
    "LA",
    "San Francisco",
]


const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [initialFormData, setInitialFormData] = useState({});
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [formError, setFormError] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const { setUser } = useUser();
    const [showCreateListingModal, setShowCreateListingModal] = useState(false);

    const createListingRef = useRef<{ openCreateListingModal: () => void }>(null);
    
    const { ready, authenticated, getAccessToken, logout } = usePrivy();

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

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const city = searchParams.get('location');
        const shipping = searchParams.get('shipping') === 'true';
        const title = searchParams.get('title');
        const description = searchParams.get('description');
        const price = searchParams.get('price');
        const walletAddress = searchParams.get('walletAddress');
        const email = searchParams.get('email');

        if (ready) {
            if (title && authenticated && createListingRef.current) {
                createListingRef.current.openCreateListingModal();
                setInitialFormData({ location:city, shipping, title, description, price, walletAddress, email });
                setShowCreateListingModal(true);

            } else if (title && !authenticated && createListingRef.current) {
                createListingRef.current.openCreateListingModal();
                setInitialFormData({ location:city, shipping, title, description, price,walletAddress, email });
                setShowCreateListingModal(true);
                login();
            }
        }

    }, [location, authenticated, ready]);

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

    const onFormSubmit = async (formData: FormData, file: File | null): Promise<Product> => {
        const accessToken = await getAccessToken();
        
        try {
          const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/add`, formData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.status === 201) {
            const product = response.data
            openListingPage(product);
            return response.data;
        } else {
            throw new Error('Product creation failed');
        }

        } catch (error: any) {
            console.error('Failed to create product:', error.response || error);
            setFormError('Failed to create product. Please try again.');
            throw error;
        }
    };

    return (
        <div className='main-container'>
            <Header />
            <section className="hero-section">
                <h1 className="title">Buy and sell products on Farcaster</h1>
                <CreateListing 
                    ref={createListingRef}
                    onFormSubmit={onFormSubmit} 
                    formError={formError} 
                    setFormError={setFormError}
                    clearFormError={() => setFormError('')} 
                    supportedCities={supportedCities}
                    initialFormData={initialFormData}
                    showForm={showCreateListingModal}
                    onCloseModal={() => setShowCreateListingModal(false)}
                    login={login}
                />
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
            <section className="featured-stores-section">
                <div className="featured-stores">
                    <h2>Featured Stores</h2>
                    <div className="featured-store-masonry">
                        {featuredStoreImages.map((image, index) => (
                        <a key={index} href={image.link} target="_blank" className="featured-store-card">
                            <img src={image.src} alt={`Store ${index}`} />
                        </a>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
