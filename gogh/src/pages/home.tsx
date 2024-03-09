import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import CreateListing from './marketplace/createListing';
import ProductDetailsModal from './marketplace/productDetailsModal';
import '../../src/styles.css';

interface FeaturedStoreImage {
    src: string;
    link: string;
}

interface User {
    _id: string;
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

    const [errorMessage, setErrorMessage] = useState<string>('');
    const [formError, setFormError] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsProductModalOpen] = useState<boolean>(false);

    const openModalWithProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsProductModalOpen(true);
    };

    const closeModal = () => {
        setIsProductModalOpen(false);
        setSelectedProduct(null);
    };

    const createListingRef = useRef<HTMLDivElement | null>(null);

    const scrollToListProduct = () => {
        if (createListingRef.current) {
          createListingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };


    React.useEffect(() => {
        const scriptId = 'neynar-script';

        const loadNeynarScript = () => {
            if (!document.getElementById(scriptId)) {
                const script = document.createElement('script');
                script.id = scriptId;
                script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js";
                script.async = true;
                document.body.appendChild(script);
            }
        };

        const removeNeynarScript = () => {
            const script = document.getElementById(scriptId);
            if (script) {
                document.body.removeChild(script);
            }
        };

        if (!isLoggedIn) {
            loadNeynarScript();
        } else {
            removeNeynarScript();
        }

        return () => {
            removeNeynarScript();
        };
    }, [isLoggedIn]);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    
        if (token) {
            axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(response => {
                setUser(response.data);
            }).catch(error => {
                console.error('Error fetching user details:', error);
                if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                    localStorage.removeItem('token');
                    setIsLoggedIn(false);
                    setUser(null);
                }
            });
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUser(null);
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/`);
            console.log(response.data);
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    React.useEffect(() => {
        fetchProducts();
    }, []);

    const onFormSubmit = async (formData: FormData) => {
        console.log('Submitting:', formData);
        
        try {
          const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/add`, formData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });

          if (response.status === 201) {
            console.log('Fetching products after submission...');
            fetchProducts(); // Call fetchProducts to update the list with the new submission
          }
          console.log('Product created successfully:', response.data);

        } catch (error: any) {
            console.error('Failed to create product:', error.response || error);
            setFormError('Failed to create product. Please try again.');
        }
    };

    const onSignInSuccess = async (data: any) => {
        console.log("Sign-in success with data:", data);
        
        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/farcaster_login`, {
                signer_uuid: data.signer_uuid,
                fid: data.fid
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);

                if (response.data.isAdmin !== undefined) {
                    localStorage.setItem('isAdmin', JSON.stringify(response.data.isAdmin));
                    console.log("isAdmin:", response.data.isAdmin);
                }
                const redirectUrl = response.data.redirect;
                window.location.reload();
                navigate(redirectUrl);
            } else {
                setErrorMessage("Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast");
            }
        } catch (error: unknown) {
            console.error("Error during Farcaster login:", error);
            if (axios.isAxiosError(error)) { 
                const axiosError = error as AxiosError;
                if (axiosError.response && axiosError.response.status === 404) {
                    setErrorMessage("Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast");
                } else {
                    setErrorMessage("An error occurred during the sign-in process.");
                }
            } else {
                setErrorMessage("An unexpected error occurred.");
            }
        }
    };

    React.useEffect(() => {
        (window as any).onSignInSuccess = onSignInSuccess;
        return () => {
            delete (window as any).onSignInSuccess;
        };
    }, [navigate]);

    return (
        <div className='main-container'>
            <header className="site-header">
                <h1>Gogh</h1>
                {!user ? (
                    <div className="neynar_signin" data-client_id={process.env.REACT_APP_NEYNAR_CLIENT_ID} data-success-callback="onSignInSuccess" data-variant="warpcast"></div>
                ) : (
                    <>
                        <div className="fc-user-tag">
                            <img src={user.fc_pfp} alt="User profile" className="fc-pfp" />
                            <p>{user.fc_username}</p>
                        </div>
                        <button onClick={logout} className="logout-button">Logout</button>
                    </>
                )}
            </header>
            <section className="hero-section">
                <h1 className="title">Buy and sell products on Farcaster</h1>
                <button className='list-item' onClick={scrollToListProduct}>List an item for sale</button>
            </section>
            <section className="submitted-products">
                <div className="marketplace-products-grid">
                {products.map((product) => (
                    <div key={product._id} className="marketplace-product-card" onClick={() => openModalWithProduct(product)}>
                    <img src={product.imageUrl} alt={product.title} className='marketplace-img'/>
                    <h3>{product.title}</h3>
                    <p>Location: {product.location}</p>
                    <p>Price: {product.price}</p>
                    <div className='fc-user-tag'>
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
                    isLoggedIn={isLoggedIn}
                    onFormSubmit={onFormSubmit} 
                    formError={formError} 
                    clearFormError={() => setFormError('')} 
                    supportedCities={supportedCities}
                    ref={createListingRef}
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
