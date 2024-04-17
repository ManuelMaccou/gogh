import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { usePrivy, useWallets,useConnectWallet } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import { cancelEscrow, getGoghContract, releaseEscrow } from '../../utils/goghContract';
import Header from '../header';
import Sidebar from './sidebar';
import { sleep } from './purchases';
import dayjs from 'dayjs';

const store: any = {};

interface MarketplaceProduct {
    _id: string;
    title: string;
    featuredImage: string;
}
interface Product {
    _id: string;
    location: string;
    farcon: boolean;
    title: string;
    description: string;
    productFrame: string;
    featuredImage: string;
    additionalImages: string[];
    price: string;
    walletAddress: string;
    email: string;
    user: string;
    createdAt: string;
    updatedAt: string;
    transactions: null;
    id: string;
  }
  
  interface Metadata {
    uid: string;
    escrowId: string;
    token: string;
    amount: string;
    timestamp: string;
    recipient: string;
    owner: string;
    released: boolean;
    canceled: boolean;
  }
  
  interface ProductTransaction {
    _id: string;
    metadata?: Metadata;
    uid: string;
    escrowId: string;
    buyer: string;
    seller: string;
    transactionHash: string;
    source: string;
    marketplaceProduct: string;
    createdAt: string;
    updatedAt: string;
    product: Product;
    hoursSinceOwnerSigned : number;
    hoursSinceRecipientSigned : number;
  }
const PurchasesPage: React.FC = () => {
    const [listings, setListings] = useState<MarketplaceProduct[]>([]);
    const [marketplaceTransactions,setMarketplaceTransactions] = useState<ProductTransaction[]>([]);
    const { user } = useUser();
    const { ready, authenticated, getAccessToken, logout } = usePrivy();
    const {wallets} = useWallets();
    const wallet = wallets[0];

    const setUpEtherDetails = useCallback(async (wallet: any) => {
        try {
          const ethersProvider = await wallet.getEthersProvider();
          const signer = ethersProvider.getSigner();
          const goghContract = getGoghContract(signer);
          const accessToken = await getAccessToken();
    
          store.etherDetails = {
            ethersProvider,
            accessToken,
            signer,
            goghContract,
          };
        } catch (error) {
          console.log(error);
        }
      }, []);
      useEffect(() => {
        if (wallet) {
          setUpEtherDetails(wallet);
        }
      }, [wallet]);
      const { connectWallet } = useConnectWallet();

      const warmUpEtherDetails = async () => {
        const canReturn = store.etherDetails;
        if (canReturn) {
          return canReturn;
        }
    
        connectWallet();
        for (let index = 0; index < 120; index++) {
          await sleep(1000);
          const canReturn = store.etherDetails;
          if (canReturn) {
            return canReturn;
          }
        }
        throw new Error("Wallet not connected");
      };
    

    useEffect(() => {
        const fetchListings = async () => {
            const accessToken = await getAccessToken();

            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/listings`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                setListings(response.data);
                setMarketplaceTransactions(response.data.flatMap((t:any) => t.transactions.map((a:any) => {
                    const date = dayjs(new Date());

                   
                    const transactionObj = {...a, product : {...t, transactions:null}}

                    if(a.dateOwnerSigned){
                        transactionObj.hoursSinceOwnerSigned = date.diff(new Date(a.dateOwnerSigned),"hour")
                    }
                    if(a.dateRecipientSigned){
                        transactionObj.hoursSinceRecipientSigned = date.diff(new Date(a.dateRecipientSigned),"hour")
                    }
                    return transactionObj
                })))
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
            }
        };

        if (user) {
            fetchListings();
        }
    }, [user]);

    return (
        <>
        <Header />
        <div className='profile-page'>
            <Sidebar />
            <div className="products-container">
                <h2>Transactions</h2>
                {marketplaceTransactions.map((listing) => (
                    <div key={listing._id} className="product-row">
                        <img src={listing.product.featuredImage} alt="Product" className="product-image" />
                        <div>
                            <h3>{listing.product.title}</h3>
                            {/* Placeholder for the transaction status */}
                            <p>Status: Pending</p>
                        </div>
                        <div>
                            <button onClick={async()  => {
                                try {
                                    const {ethersProvider,signer,goghContract,accessToken} = await warmUpEtherDetails();
                                    const res = await cancelEscrow({transaction : listing as any, signer : signer as any, contract : goghContract, accessToken : accessToken as string, provider : ethersProvider as any});
                                    // successfully cancelled escrow
                                    console.log(res)
                                } catch (error) {
                                    console.error('Unexpected error in cancel escrow:', error);
                                    alert('An unexpected error occurred. Please try again.');
                                }
                            }} className="cancel-button">Cancel</button>
                            <button onClick={async()  => {
                                try {
                                    const {ethersProvider,signer,goghContract,accessToken} = await warmUpEtherDetails();
                                    const res = await releaseEscrow({transaction : listing as any, signer : signer as any, contract : goghContract, accessToken : accessToken as string, provider : ethersProvider as any});
                                    // successfully signed escrow
                                    console.log(res)
                                } catch (error) {
                                    console.error('Unexpected error in release escrow:', error);
                                    alert('An unexpected error occurred. Please try again.');
                                }
                            }} className="confirm-button">Confirm</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
};

export default PurchasesPage;