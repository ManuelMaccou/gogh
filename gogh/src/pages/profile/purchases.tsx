import React, { useCallback, useEffect, useState, Fragment } from 'react';
import axios from 'axios';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import { cancelEscrow, getGoghContract, releaseEscrow } from '../../utils/goghContract';
import Header from '../header';
import Sidebar from './sidebar';

interface MarketplaceProduct {
    _id: string;
    title: string;
    description: string;
    featuredImage: string;
  }
  
  interface Transaction {
    _id: string;
    marketplaceProduct: MarketplaceProduct;
  }

const PurchasesPage: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const { user } = useUser();

    const { ready, authenticated, getAccessToken, logout, connectWallet } = usePrivy();
    const {wallets} = useWallets();
    const wallet = wallets[0];

    const warmUpEtherDetails = useCallback(async() => {
        if (!wallet) {
            connectWallet();
        }

        const ethersProvider = await wallet.getEthersProvider();
        const signer = ethersProvider.getSigner();
        const goghContract = getGoghContract(signer);
        const accessToken = await getAccessToken();
        return {ethersProvider, signer, goghContract, accessToken }
    },[wallet, getAccessToken])

    useEffect(() => {
        const fetchTransactions = async () => {
            const accessToken = await getAccessToken();

            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/purchases`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                setTransactions(response.data);
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
            }
        };

        if (user) {
        fetchTransactions();
        }
    }, [user]);

    return (
        <>
        <Header />
        <div className='profile-page'>
            <Sidebar />
            <div className="products-container">
                {transactions.map((transaction) => (
                    <div key={transaction._id} className="product-row">
                        <div className='profile-product-details'>
                            <div className='profile-product-image'>
                                <img src={transaction.marketplaceProduct.featuredImage} alt="Product" className="product-image" />
                            </div>
                            <div className='profile-product-text'>
                                <h3>{transaction.marketplaceProduct.title}</h3>
                                <p className='product-description'>
                                    {transaction.marketplaceProduct.description.split('\n').map((line, index, array) => (
                                        <Fragment key={index}>
                                            {line}
                                            {index < array.length - 1 && <br />}
                                        </Fragment>
                                    ))}
                                </p>
                            </div>
                        </div>
                        <div className='escrow-details'>
                            {/* Placeholder for the transaction status */}
                            <p className='escrow-status'>Pending</p>
                            <p className='escrow-status-description'>This is a placeholder description</p>
                            <div className='escrow-decision'>
                                <div className='cancel-escrow'>
                                    <p>
                                        Cancel your purchase
                                        <span className='tooltip-icon' data-tooltip="You can cancel your purchase after it's been held in escrow for over a week. This is protect you from unresponsive sellers. Your money will be returned to you immediately.">
                                        <i className="fa-solid fa-circle-info"></i>
                                        </span>
                                    </p>
                                    <button onClick={async()  => {
                                        try {
                                            const {ethersProvider,signer,goghContract,accessToken} = await warmUpEtherDetails();
                                            const res = await cancelEscrow({transaction : transaction as any, signer : signer as any, contract : goghContract, accessToken : accessToken as string, provider : ethersProvider as any});
                                            // successfully cancelled escrow
                                            console.log(res)
                                        } catch (error) {
                                            console.error('Unexpected error in cancel escrow:', error);
                                            alert('An unexpected error occurred. Please try again.');
                                        }
                                    }} className="cancel-button">Cancel</button>
                                </div>
                                <div className='confirm-item-transfer'>
                                    <p>
                                        Confirm
                                        <span className='tooltip-icon' data-tooltip="If you've successfully received your item, finalize the purchase.">
                                        <i className="fa-solid fa-circle-info"></i>
                                        </span>
                                    </p>
                                    <button onClick={async()  => {
                                        try {
                                            const {ethersProvider,signer,goghContract,accessToken} = await warmUpEtherDetails();
                                            const res = await releaseEscrow({transaction : transaction as any, signer : signer as any, contract : goghContract, accessToken : accessToken as string, provider : ethersProvider as any});
                                            // successfully signed escrow
                                            console.log(res)
                                        } catch (error) {
                                            console.error('Unexpected error in release escrow:', error);
                                            alert('An unexpected error occurred. Please try again.');
                                        }
                                    }} className="confirm-button">Confirm</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
};

export default PurchasesPage;
