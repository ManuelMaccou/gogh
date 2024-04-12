import React, { useEffect, useState, Fragment } from 'react';
import axios from 'axios';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
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

  const { ready, authenticated, getAccessToken, logout } = usePrivy();

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

  // Trigger escrow signing here


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
                                <button className="cancel-button">Cancel purchase</button>
                            </div>
                            <div className='confirm-item-transfer'>
                                <p>
                                    Confirm
                                    <span className='tooltip-icon' data-tooltip="If you've successfully received your item, finalize the purchase.">
                                    <i className="fa-solid fa-circle-info"></i>
                                    </span>
                                </p>
                                <button className="confirm-button">Confirm</button>
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
