import { useEffect, useState, Fragment } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { useParams } from 'react-router-dom';
import { usePrivy, useWallets, useLogin, useConnectWallet } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import Header from '../header';
import { createEscrow, getGoghContract, toEscrow, } from "../../utils/goghContract";

interface Product {
    _id: string;
    location: string;
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
    facebookUser?: boolean;
    fb_url?: string;
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

    const isProduction = process.env.NODE_ENV === 'production';
    const web3 = new Web3(process.env.REACT_APP_ALCHEMY_API_URL);

    const [product, setProduct] = useState<Product | null>(null);
    const { setUser, user } = useUser();
    const {ready, authenticated, getAccessToken} = usePrivy();
    const { productId } = useParams<{ productId: string }>();
    const [selectedImage, setSelectedImage] = useState('');
    const [isPurchaseInitiated, setIsPurchaseInitiated] = useState(false);
    const [loginAction, setLoginAction] = useState<null | string>(null);
    
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

    const saveTransaction = async (transactionDetails: TransactionDetails): Promise<AxiosResponse<any>> => {
        try {
            const accessToken = await getAccessToken();

            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/transaction/save`, transactionDetails, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return response;
        } catch (error) {
            throw new Error('Failed to save transaction. Please try again.');
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

    async function getConvertedAmountWithoutHext(usdcAmount: string | undefined) {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_BASE_URL}/api/crypto/convert-usdc-to-wei-without-hex`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ usdcAmount }),
            }
          );
    
          if (!response.ok) {
            throw new Error("Failed to convert USDC to Wei");
          }
    
          const data = await response.json();
          return data.weiAmount;
        } catch (error) {
          console.error("Error converting USDC to Wei:", error);
          alert("Error converting currency. Please try again.");
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
            
            const ethersProvider = await wallet.getEthersProvider();
            const signer = ethersProvider.getSigner();
            const goghContract = getGoghContract(signer);
            const uid = parseInt(Math.random().toString().slice(-15));
            const sanitizedAmount = product?.price.replace(/[^0-9.]/g, "");
            const convertedAmount = await getConvertedAmountWithoutHext(
                sanitizedAmount
            );
            if (!convertedAmount) {
                console.error("Error occured. Transaction amount is missing.");
                alert("There was an error calculating the transaction amount.");
                return;
            }

            const escrow = await createEscrow({
                contract: goghContract,
                uid,
                recipientAddress: product?.walletAddress || "",
                tokenAddress: "0x0000000000000000000000000000000000000001",
                amount: convertedAmount,
            });
    
            ethersProvider.once(escrow.hash, async (transactionReceipt) => {
                transactionReceipt.logs.forEach(async (t: any, index: number) => {
                    const logVals = goghContract.interface.parseLog(
                    transactionReceipt.logs[index]
                    )?.args;
                    if (logVals) {
                        const arryOfLog = Array.from(logVals);
                        if (arryOfLog[0] == uid) {
                            const escrowId = arryOfLog[1];
                            let escrowTemp = await goghContract.getEscrowDetails(escrowId);
                            let escrowData = toEscrow(escrowTemp);

                            const transactionDetails = {
                                marketplaceProductId: product?._id,
                                sellerId: product?.user._id,
                                buyerFid: user?.fid,
                                sellerFid: product?.user?.fid,
                                sellerProfile: product?.user?.fc_url,
                                sellerUsername: product?.user?.fc_username,
                                transactionHash: escrow.hash,
                                source: "Website",
                                escrowId,
                                uid: escrowData.uid.toString(),
                                metadata: {
                                    ...escrowData,
                                    amount: escrowData.amount.toString(),
                                    timestamp: escrowData.timestamp.toString(),
                                    uid: escrowData.uid.toString(),
                                },
                            };
                            
                            try {
                                await saveTransaction(transactionDetails as any);
                                navigate(`/success/${escrow.hash}`);
                            } catch (error) {
                                console.error("Failed to save transaction details:", error);
                                alert( `An error occured. You can still view your transaction on basescan.org. Transaction hash: ${escrow.hash}.`);
                            }
                        }
                    }
                });
            });
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
                        <button
                        className='buy-button'
                        onClick={() => {
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
                    {(product.user?.fid || product.user?.facebookUser) && (
                    <div className='seller-section'>
                        <h2>Meet the seller</h2>
                        {product.user?.fid && (
                        <>
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
                        </>
                        )}
                        {product.user?.facebookUser && !product.user?.fid && (
                            <>
                            <div className='seller-profile'>
                                <p>This seller is a Facebook user</p>
                            </div>
                            <div className='message-seller'>
                                <a href={product.user.fb_url} target="_blank" rel="noopener noreferrer" className='message-button'>
                                    View profile
                                </a>
                            </div>
                            </>
                        )}
                    </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Listing;
