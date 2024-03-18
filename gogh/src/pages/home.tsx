import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { useLocation } from 'react-router-dom';
import CreateListing from './marketplace/createListing';
import ProductDetailsModal from './marketplace/productDetailsModal';
// import LoginModal from '../loginModal';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import '../../src/styles.css';

interface FeaturedStoreImage {
    src: string;
    link: string;
}

interface User {
    privyId: string;
    _id: string;
    fid: string;
    fc_username: string;
    fc_pfp: string;
    fc_profile: string;
  }

interface Product {
    _id: string;
    location: string;
    title: string;
    description: string;
    imageUrl: string;
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
]


const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [initialFormData, setInitialFormData] = useState({});
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [formError, setFormError] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsProductModalOpen] = useState<boolean>(false);
    // const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
    const [showCreateListingModal, setShowCreateListingModal] = useState(false);

    const createListingRef = useRef<{ openCreateListingModal: () => void }>(null);

    
    const { ready, authenticated, getAccessToken, logout } = usePrivy();

    const { login } = useLogin({
        onComplete: async (user, isNewUser) => {
            const accessToken = await getAccessToken();

            const userPayload = {
                privyId: user.id,
                ...(user.farcaster && {
                    fid: user.farcaster.fid,
                    fc_username: user.farcaster.displayName,
                    fc_pfp: user.farcaster.pfp,
                    fc_profile: `https://warpcast.com/${user.farcaster.username}`,
                }),
            };
            

            try {
 
                if (isNewUser) {
                    console.log('userPayload:', userPayload);
                    try {

                        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/create`, userPayload, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });

                        if (response.status === 201) {
                            setUser(response.data);
                            console.log('User details:', response.data);
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
                        console.log('User details:', response.data);
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
            console.log('auth status 1:', authenticated)

            if (!accessToken) {
                console.log("No access token available. User might not be logged in.");
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

    const openModalWithProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsProductModalOpen(true);
    };

    const closeModal = () => {
        setIsProductModalOpen(false);
        setSelectedProduct(null);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const city = searchParams.get('city');
        const title = searchParams.get('title');
        const description = searchParams.get('description');
        const price = searchParams.get('price');
        const walletAddress = searchParams.get('walletAddress');
        const email = searchParams.get('email');

        if (city && authenticated && createListingRef.current) {
            createListingRef.current.openCreateListingModal();
            setInitialFormData({ location:city, title, description, price, walletAddress, email });
            setShowCreateListingModal(true);

        } else if (city && !authenticated && createListingRef.current) {
            createListingRef.current.openCreateListingModal();
            setInitialFormData({ location:city, title, description, price,walletAddress,email });
            login();
        }

    }, [location, authenticated]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/`);
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    React.useEffect(() => {
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
            console.log('Fetching products after submission...');
            fetchProducts();
            openModalWithProduct(response.data);
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
            <header className="site-header">
                <h1>Gogh</h1>

                {!authenticated && (
                <button
                    disabled={!ready}
                    className="login-button"
                    onClick={(e) => {
                        e.preventDefault();
                        login();
                    }}
                >
                        <img src='https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710523060105x590377080657276200/Farcaster%20Icon.png' alt="Farcaster" className="fc-icon" />
                        <p>Log in</p>
                </button>
            )}

            {authenticated && user && (
                <><button
                        className="logout-button"
                        disabled={!ready}
                        onClick={handleLogout}>
                        Log out
                    </button><div className="profile-card">
                            <img src={user?.fc_pfp} alt="User profile" className="fc-pfp" />
                            <p>{user?.fc_username}</p>
                        </div></>

            )}

            </header>
            <section className="hero-section">
                <h1 className="title">Buy and sell products on Farcaster</h1>
                <button className='list-item'>List an item for sale</button>
            </section>
            <section className="submitted-products">
                <div className="marketplace-products-grid">
                {products.map((product) => (
                    <div key={product._id} className="marketplace-product-card" onClick={() => openModalWithProduct(product)}>
                    <img src={product.imageUrl} alt={product.title} className='marketplace-img'/>
                    <h3>{product.title}</h3>
                    <p>Location: {product.location}</p>
                    <p>Price: {product.price}</p>
                    <div className='profile-card'>
                        {product.user && (
                            <>
                                <a href={product.user.fc_profile} className="fc-profile-url" target="_blank" rel="noopener noreferrer">
                                <img src={product.user.fc_pfp} alt="User profile" className='fc-pfp'/>
                                <span>{product.user.fc_username}</span>
                                </a>
                            </>
                            )}
                        </div>
                    </div>
                    ))}
                    <ProductDetailsModal
                    isOpen={isModalOpen}
                    onRequestClose={closeModal}
                    product={selectedProduct}
                    />
                </div>
            </section>
            <section className="local-section">
                <h2>Local Marketplace</h2>
                <h3>Current cities supported:</h3>
                <div className="cities-container">
                    {supportedCities.map((city, index) => (
                        <div key={index} className="cities-item">
                            <p>{city}</p>
                        </div>
                    ))}
                </div>
                <CreateListing 
                    ref={createListingRef}
                    onFormSubmit={onFormSubmit} 
                    formError={formError} 
                    clearFormError={() => setFormError('')} 
                    supportedCities={supportedCities}
                    initialFormData={initialFormData}
                    showForm={showCreateListingModal}
                    onCloseModal={() => setShowCreateListingModal(false)}
                    login={login}
                />
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
