import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../../contexts/userContext';
import Header from '../header';

interface Transaction {
  _id: string;
  marketplaceProduct: {
    _id: string;
    title: string;
    featuredImage: string;
  };
}

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
    <><Header /><div className="transactions-container">
          {transactions.map((transaction) => (
              <div key={transaction._id} className="transaction-row">
                  <img src={transaction.marketplaceProduct.featuredImage} alt="Product" className="product-image" />
                  <div>
                      <h3>{transaction.marketplaceProduct.title}</h3>
                      {/* Placeholder for the transaction status */}
                      <p>Status: Pending</p>
                  </div>
                  <div>
                      <button className="cancel-button">Cancel</button>
                      <button className="confirm-button">Confirm</button>
                  </div>
              </div>
          ))}
      </div></>
  );
};

export default PurchasesPage;
