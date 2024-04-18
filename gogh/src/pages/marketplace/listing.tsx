import { useEffect, useState, Fragment } from 'react';
import axios, { AxiosError } from 'axios';
import { useParams } from 'react-router-dom';
import { usePrivy, useWallets, useLogin, useConnectWallet } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import Header from '../header';
import SellerOnchainProfile from './listing/sellerOnchainProfile'
import ShippingForm from './listing/shippingForm';

interface Product {
    _id: string;
    location: string;
    shipping: boolean;
    farcon: boolean;
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
    shippingDetails?: ShippingDetails | null;
}

interface EmailDetails {
    to: string;
    from: string;
    templateId: string;
    dynamicTemplateData: {
      product_name: string;
      product_price: string;
      transaction_hash: string;
      buyer_username?: string;
      buyer_profile_url?: string;
    };
    cc: Array<{ email: string }>;
}

interface ShippingDetails {
    name: string;
    street: string;
    apartment: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

const Listing = () => {

    const isProduction = process.env.NODE_ENV === 'production';
    const web3 = new Web3(process.env.REACT_APP_ALCHEMY_API_URL);

    const [product, setProduct] = useState<Product | null>(null);
    const { setUser, user } = useUser();
    const {ready, authenticated, getAccessToken} = usePrivy();
    const { productId } = useParams<{ productId: string }>();
    const [selectedImage, setSelectedImage] = useState('');
    const [isPurchaseInitiated, setIsPurchaseInitiated] = useState(false);
    const [loginAction, setLoginAction] = useState<null | string>(null);
    const [showShippingOptions, setShowShippingOptions] = useState<boolean>(false);
    const [shipProduct, setShipProduct] = useState<boolean | null>(null);
    const [shippingDetailsComplete, setShippingDetailsComplete] = useState(false);
    const [shippingDetails, setShippingDetails] = useState<ShippingDetails | null>(null);
    
    const {wallets} = useWallets();
    const walletAddress = wallets[0]?.address;

    const navigate = useNavigate();

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
                    try {

                        const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/create`, userPayload, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });

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

    const handleCheckoutClick = () => {
        setShowShippingOptions(true);
    };
    
    const handleShippingOption = (choice: boolean) => {
        setShipProduct(choice);
        setShippingDetailsComplete(false); // Reset the completion status when switching options
      };

      const saveShippingDetails = (details: ShippingDetails) => {
        console.log('Shipping Details:', details);
        setShippingDetails(details);
        setShippingDetailsComplete(true);
      };

    const { connectWallet } = useConnectWallet({
        onSuccess: (wallet) => {},
        onError: (error) => {
            console.log(error);
            setIsPurchaseInitiated(false);
        },
    });

    useEffect(() => {
        if (isPurchaseInitiated) {
            if (!walletAddress) {
                connectWallet();
            } else {
                buyProduct();
            }
        }
    }, [isPurchaseInitiated, authenticated, walletAddress]);

    const initiatePurchase = () => {
        if(!authenticated) {
            setLoginAction('purchase');
            login();
        } else if (authenticated && (!wallets || wallets.length === 0)) {
            setIsPurchaseInitiated(true);
        } else if (authenticated && wallets && wallets.length > 0) {
            buyProduct();
        }
    };

    const saveTransaction = async (transactionDetails: TransactionDetails) => {
        try {
          const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/transaction/save`, transactionDetails);
          const data = response.data;
        } catch (error) {
        }
      };
      const emailSendingResults: Promise<any>[] = [];
      const sendEmail = async (emailDetails: EmailDetails) => {
        try {
          const accessToken = await getAccessToken();
          const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/send-confirm-email`, emailDetails, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error('Error response from Axios:', error.response);
            throw new Error(error.response?.data.error || 'Failed to send email');
          } else {
            // Handle non-Axios errors
            console.error('Error sending email:', error);
            throw new Error('An error occurred during email sending');
          }
        }
      };

    async function getConvertedAmount(usdcAmount: string | undefined) {
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/crypto/convert-usdc-to-wei`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usdcAmount }),
            });
    
            if (!response.ok) {
                throw new Error('Failed to convert USDC to Wei');
            }
    
            const data = await response.json();
            return data.hexWeiAmount;
        } catch (error) {
            console.error('Error converting USDC to Wei:', error);
            alert('Error converting currency. Please try again.');
        }
    }

    const buyProduct = async () => {
        const accessToken = await getAccessToken();
        try {
            const wallet = wallets[0];
            const address = wallet.address;
            const provider = await wallet.getEthereumProvider();

            // Confirm or switch to Base
            const privyChainId = wallet.chainId;
            const chainIdNum = process.env.REACT_APP_CHAIN_ID ? Number(process.env.REACT_APP_CHAIN_ID) : null;

            if (chainIdNum === null || isNaN(chainIdNum)) {
                console.error("Invalid chain ID in environment variables.");
                // Handle the error appropriately.
                setIsPurchaseInitiated(false);
                return;
            }

            if (privyChainId !== `eip155:${chainIdNum}`) {
                try {
                    await wallet.switchChain(chainIdNum);
                } catch (error: unknown) {
                    console.error('Error switching chain:', error);
                
                    if (typeof error === 'object' && error !== null && 'code' in error) {
                        const errorCode = (error as { code: number }).code;
                        if (errorCode === 4001) {
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
            
            // Sign the message
            const message = 
            `
            Purchase confirmation. \n
            Product: ${product?.title} \n
            Price: ${product?.price} \n
            Seller wallet address: ${product?.walletAddress} \n
            Your wallet address: ${address}.
            `;
            
            let signature;
            try {
                signature = await provider.request({
                    method: 'personal_sign',
                    params: [message, address],
                });
            } catch (signError) {
                console.error('Error signing message:', signError);
                alert('Transaction cancelled or failed during signing.');
                setIsPurchaseInitiated(false);
                return;
            }
    
            // Verify signature
            try {
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/crypto/verify-signature`, {
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


                // Send transaction
                if (verificationResult.verified) {

                    try {
                        const sanitizedAmount = product?.price.replace(/[^0-9.]/g, '');
                        const convertedAmount = await getConvertedAmount(sanitizedAmount);

                        
                        if (!user?.fid || !product || !product.user || !product.walletAddress || !product?.user?.fid) {
                            console.error('Error occured. User or product information is missing.');
                            alert('There was an error when trying to gather product or user information.');
                            return;
                        }

                        if (!convertedAmount) {
                            console.error('Error occured. Transaction amount is missing.');
                            alert('There was an error calculating the transaction amount.');
                            return;
                        }

                        const transactionHash = await provider.request({
                            method: 'eth_sendTransaction',
                            params: [
                                {
                                    from: address,
                                    to: product.walletAddress,
                                    value: convertedAmount,
                                },
                            ],
                        });

                        const transactionDetails = {
                            buyerFid: user.fid,
                            sellerFid: product.user.fid,
                            sellerProfile: product.user.fc_url,
                            sellerUsername: product.user.fc_username,
                            transactionHash: transactionHash,
                            source: 'Website',
                            shippingDetails: shipProduct ? shippingDetails : undefined,
                        };

                        try {
                            await saveTransaction(transactionDetails);
                            navigate(`/success/${transactionHash}`);
                        } catch (error) {
                            console.error('Failed to save transaction details:', error);
                            alert(`An error occured. You can still view your transaction on basescan.org. Transaction hash: ${transactionHash}.`);
                        }

                        // send confirm email to seller
                        if (product?.email) {
                            const shippingInfo = shippingDetails ? 
                            `Name: ${shippingDetails.name}<br>` +
                            `Street: ${shippingDetails.street}<br>` +
                            `Apartment: ${shippingDetails.apartment}<br>` +
                            `City: ${shippingDetails.city}, ${shippingDetails.state} ${shippingDetails.zip}<br>` +
                            `Country: ${shippingDetails.country}` : 
                            "Not applicable";

                            const emailDetails = {
                              to: product?.email,
                              from: 'admin@gogh.shopping',
                              templateId: 'd-48d7775469174e7092913745a9b7e307',
                              dynamicTemplateData: {
                                product_name: product?.title,
                                product_price: product?.price,
                                transaction_hash: transactionHash,
                                buyer_username: user?.fc_username,
                                buyer_profile_url: user?.fc_url,
                                shipping_info: shippingInfo,
                              },
                              cc: [{ email: 'manuel@gogh.shopping' }],
                            };
                            try {
                                const emailResponse = await sendEmail(emailDetails);
                                console.log('Email sent successfully:', emailResponse);
                            } catch (emailError) {
                                console.error('Failed to send confirmation email:', emailError);
                            }
                        }

                    } catch (transactionError) {
                        console.error('Transaction failed:', transactionError);
                        alert('Transaction failed. Please try again.');
                        setIsPurchaseInitiated(false);
                        return;
                    }

                } else {
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
            {product.farcon && (
                <div className="farcon-ribbon-listing">
                    <span>Option to pick up at FarCon</span>
                </div>
            )}
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
                        <p className='product-price'>{product.price ? `$${product.price}` : 'Free'}</p>
                        <h1>{product.title}</h1>
                        <p className='product-location'>Pickup/Dropoff in {product.location}</p>
                        {product.shipping === true && (
                            <>
                            <div className='product-shipping'>
                                <i className="fa-solid fa-truck-fast"></i>
                                <p>Shipping offered by seller</p>
                            </div>
                            </>
                        )}
                        <p className='product-description'>
                            {product.description.split('\n').map((line, index, array) => (
                                <Fragment key={index}>
                                    {line}
                                    {index < array.length - 1 && <br />}
                                </Fragment>
                            ))}
                        </p>
                    </div>
                    <div className='share-buy-listing'>
                        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className='share-button'>
                        <p>Share</p>
                        <i className="fa-regular fa-share-from-square"></i>
                        </a>
                    {product?.shipping && (
                        <>
                            <button className={`checkout-button ${showShippingOptions && 'active'}`} onClick={handleCheckoutClick}>
                            Check out
                            </button>
                            {showShippingOptions && (
                                <>
                                    <p>Select one</p>
                                    <div className='choose-shipping'>
                                        <button className={shipProduct === true ? 'active' : ''} onClick={() => handleShippingOption(true)}>Request shipping</button>
                                        <button className={shipProduct === false ? 'active' : ''} onClick={() => handleShippingOption(false)}>Pick Up</button>
                                    </div>
                                </>
                            )}
                        </>
                        )}
                        {shipProduct === true && <ShippingForm onSaveShippingDetails={saveShippingDetails} />}

                        {((!product?.shipping || shipProduct === false) || (shipProduct === true && shippingDetailsComplete)) && (
                            <button className='buy-button' onClick={buyProduct} disabled={!shippingDetailsComplete && shipProduct === true}>
                                Buy now
                            </button>
                        )}
                    </div>
                    {product.user?.fid && (
                    <div className='seller-section'>
                        <h2>Meet the seller</h2>
                        <SellerOnchainProfile sellerIdentity={product.walletAddress} />
                    </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Listing;
