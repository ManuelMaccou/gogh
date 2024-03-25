import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useParams } from 'react-router-dom';
import { usePrivy, useWallets, useLogin, useConnectWallet } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import Header from '../header';


interface Product {
    _id: string;
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

interface User {
    _id: string;
    fid?: string;
    fc_username?: string;
    fc_pfp?: string;
    fc_bio?: string;
    fc_url?: string;
    email?: string;
    walletAddress?: string;
}

interface TransactionDetails {
    buyerFid: string;
    sellerFid: string;
    transactionHash: string;
    source: string;
  }

const Listing = () => {
    const [product, setProduct] = useState<Product | null>(null);
    const { setUser } = useUser();
    const {ready, authenticated, getAccessToken} = usePrivy();
    const {wallets} = useWallets();
    const { productId } = useParams<{ productId: string }>();
    const [selectedImage, setSelectedImage] = useState('');
    const [isPurchaseInitiated, setIsPurchaseInitiated] = useState(false);
    const [loginAction, setLoginAction] = useState<null | string>(null);

    useEffect(() => {
        console.log(`Authentication status: ${authenticated}, Ready status: ${ready}`);
    }, [authenticated, ready]);

    const fetchSingleProduct = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/single/${productId}`);
            setProduct(response.data);

        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    useEffect(() => {
        fetchSingleProduct();
    }, [productId]); 

    useEffect(() => {
        if (product?.featuredImage) {
          setSelectedImage(product.featuredImage);
        }
      }, [product?.featuredImage]);

    const { login } = useLogin({
        onComplete: async (user, isNewUser) => {
            const accessToken = await getAccessToken();

            const userPayload = {
                privyId: user.id,
                walletAddress: user.wallet?.address,
                ...(user.farcaster && {
                    fid: user.farcaster?.fid,
                    fc_username: user.farcaster?.displayName,
                    fc_pfp: user.farcaster?.pfp,
                    fc_bio: user.farcaster?.bio,
                    fc_url: `https://warpcast.com/${user.farcaster?.username}`,
                }),
            };

            try {
                if (isNewUser) {
                    console.log('listing login function used for new user');
                    try {

                        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/create`, userPayload, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });

                        console.log('lising page new user:', response);

                        if (response.status === 201) {
                            setUser(response.data.user);
                            if (loginAction === 'purchase') {
                                // Trigger the purchase flow
                                setIsPurchaseInitiated(true);
                                setLoginAction(null);
                            }
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
                        if (loginAction === 'purchase') {
                            // Trigger the purchase flow
                            setIsPurchaseInitiated(true);
                            setLoginAction(null);
                        }
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

    const { connectWallet } = useConnectWallet({
        onSuccess: (wallet) => {
            console.log(wallet);
        },
        onError: (error) => {
            console.log(error);
            setIsPurchaseInitiated(false);
        },
    });

    console.log('wallets:', wallets);

    useEffect(() => {
        if (isPurchaseInitiated) {
            if (!wallets[0]) {
                connectWallet();
            } else {
                console.log('checkpoint 1');
                buyProduct();
            }
        }
    }, [isPurchaseInitiated, authenticated, wallets]);

    console.log('states:', isPurchaseInitiated, authenticated, wallets, loginAction)

    const initiatePurchase = () => {
        if(!authenticated) {
            setLoginAction('purchase');
            login();
        } else if (authenticated && (!wallets || wallets.length === 0)) {
            console.log('auth no wallet');
            setIsPurchaseInitiated(true);
        } else if (authenticated && wallets && wallets.length > 0) {
            console.log('checkpoint 1');
            console.log('wallets at 1:', wallets);
            buyProduct();
        }
    };

    const saveTransaction = async (transactionDetails: TransactionDetails) => {
        try {
            const response = await fetch('http://localhost:3000/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionDetails),
            });
    
            if (!response.ok) {
                throw new Error('Failed to save transaction');
            }
    
            const data = await response.json();
            console.log('Transaction saved:', data);
            // Handle success
        } catch (error) {
            console.error('Error saving transaction:', error);
            // Handle error
        }
    };

    const buyProduct = async () => {
        const accessToken = await getAccessToken();
        console.log('buy product authentication status:', authenticated);
        try {
            console.log('connected wallets:', wallets)
    
            const wallet = wallets[0];
            const provider = await wallet.getEthereumProvider();

            // Confirm or switch to Base
            const chainId = wallet.chainId;
            console.log('chainId:', chainId);

            if (chainId !== "eip155:8453") {
                try {
                    console.log('Attempting to switch chain...');
                    await wallet.switchChain(8453);
                    console.log('Chain switched successfully.');
                } catch (error: unknown) {
                    console.error('Error switching chain:', error);
                
                    if (typeof error === 'object' && error !== null && 'code' in error) {
                        const errorCode = (error as { code: number }).code;
                        if (errorCode === 4001) {
                            console.log('User declined to switch networks.');
                            alert('You need to switch networks to proceed.');
                        } else {
                            alert('Failed to switch the network. Please try again.');
                        }
                    } else {
                        alert('An unexpected error occurred.');
                    }
                    setIsPurchaseInitiated(false);
                    return;
                }
            };
    
            const message = 'Confirm your purchase on Gogh';
            const address = wallet.address;
    
            // Sign the message
            let signature;
            try {
                signature = await provider.request({
                    method: 'personal_sign',
                    params: [message, address],
                });
                console.log('Signature:', signature);
            } catch (signError) {
                console.error('Error signing message:', signError);
                alert('Transaction cancelled or failed during signing.');
                setIsPurchaseInitiated(false);
                return;
            }
    
            // Verify signature
            try {
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/verifySignature`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        signature,
                        message,
                        address,
                    }),
                });

                if (!response.ok) {
                    setIsPurchaseInitiated(false);
                    throw new Error('Network response was not ok');
                }

                const verificationResult = await response.json();
    
                if (verificationResult.verified) {
                    console.log('The signature is verified by the server.');

                    const transactionRequest = {
                        to: "0x62f57efB1a37B93DbF56975fc6c9F2CD64BDd91c",
                        from: address,
                        value: "500000000000",
                    };
                    console.log('Transaction request:', transactionRequest);

                    try {
                        const transactionHash = await provider.request({
                            method: 'eth_sendTransaction',
                            params: [transactionRequest],
                        });
                        console.log('Transaction Hash:', transactionHash);

                        const transactionDetails = {
                            buyerFid: 'buyerFirebaseId', // Replace with actual buyer Firebase ID
                            sellerFid: 'sellerFirebaseId', // Replace with actual seller Firebase ID
                            transactionHash: transactionHash,
                            source: 'GoghMarketplace', // Adjust as necessary
                        };
                        await saveTransaction(transactionDetails);

                    } catch (transactionError) {
                        console.error('Transaction failed:', transactionError);
                        alert('Transaction failed. Please try again.');
                        setIsPurchaseInitiated(false);
                        return;
                    }
                } else {
                    console.log('The signature could not be verified by the server.');
                    alert('Signature verification failed.');
                    setIsPurchaseInitiated(false);
                }
            } catch (verificationError) {
                console.error('An error occurred during signature verification:', verificationError);
                alert('An error occurred during the verification process. Please try again.');
                setIsPurchaseInitiated(false);
            }
    
        } catch (error) {
            console.error('Unexpected error in buyProduct:', error);
            alert('An unexpected error occurred. Please try again.');
            setIsPurchaseInitiated(false);
        }
        setIsPurchaseInitiated(false);
    };

    if (!product) return <div>Loading...</div>;

    const shareUrl = `https://warpcast.com/~/compose?embeds[]=https://www.gogh.shopping/marketplace/frame/share/product/${product._id}`;
    const userName = product.user?.fc_username ?? product.user?.walletAddress?.slice(0, 6);
    const profilePicture = product.user?.fc_pfp ?? "/images/default-profile.jpg";

    return (
        <>
            <Header />
            <div className='listing-body'>
                <div className='image-gallery'>
                    <div className="main-image-container">
                        {selectedImage && <img src={selectedImage} alt={product?.title} className="main-image" />}
                    </div>
                    {product?.additionalImages && product.additionalImages.length > 0 && (
                    <div className="thumbnail-container">
                        <img
                        src={product?.featuredImage}
                        alt={product?.title}
                        onClick={() => setSelectedImage(product?.featuredImage)}
                        className={`thumbnail ${selectedImage === product?.featuredImage ? 'selected' : ''}`}
                        />
                        {product?.additionalImages.map((image, index) => (
                        <img
                            key={index}
                            src={image}
                            alt={`${product?.title} - ${index + 1}`}
                            onClick={() => setSelectedImage(image)}
                            className={`thumbnail ${selectedImage === image ? 'selected' : ''}`}
                        />
                        ))}
                    </div>
                    )}
                </div>
                <div className='product-details'>
                    <div className='product-info'>
                        <p className='product-price'>{product.price} USDC</p>
                        <h1>{product.title}</h1>
                        <p className='product-location'>Pickup/Dropoff in {product.location}</p>
                        <p className='product-description'>{product.description}</p>
                    </div>
                    <div className='share-buy-listing'>
                        <button
                        className='buy-button'
                        onClick={() => {
                            console.log('Button clicked', { ready, authenticated, wallets, isPurchaseInitiated });
                            initiatePurchase();
                        }}
                        disabled={!ready}
                        >
                        Buy now
                        </button>
                        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className='share-button'>
                        <p>Share</p>
                        <i className="fa-regular fa-share-from-square"></i>
                        </a>
                    </div>
                    {product.user?.fid && (
                    <div className='seller-section'>
                        <h2>Meet the seller</h2>
                        <div className='seller-profile'>
                            <img src={profilePicture} alt="User profile picture" className='seller-pfp' />
                            <div className='seller-info'>
                                <p className='seller-username'>{userName}</p>
                                <p className='seller-bio'>{product.user?.fc_bio}</p>
                            </div>
                        </div>
                        <div className='message-seller'>
                            <a href={product.user.fc_url} target="_blank" rel="noopener noreferrer" className='message-button'>
                                Message {userName}
                            </a>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Listing;
