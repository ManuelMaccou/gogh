import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../header'

interface TransactionDetails {
    buyerFid: string;
    sellerFid: string;
    sellerProfile: string;
    sellerUsername: string;
    transactionHash: string;
    source: string;
  }

function SuccessPage() {
    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
    const { transactionHash } = useParams();

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!transactionHash) {
        console.error('Transaction hash not provided.');
        return;
      }

      try {
        const { data } = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/transaction/${transactionHash}`);
        setTransactionDetails(data);
      } catch (error) {
        console.error('Failed to fetch transaction details:', error);
      }
    };

    fetchTransactionDetails();
  }, [transactionHash]);

  if (!transactionDetails) {
    return <div>Loading transaction details...</div>;
  }

  const userName = transactionDetails.sellerUsername;
  const sellerProfile = transactionDetails.sellerProfile;
  const txUrl = `https://basescan.org/tx/${transactionDetails.transactionHash}`;

  return (
    <>
    <Header />
    <div className='success-container'>
      <div>
        <img className='logo' src="/logo512.png" alt="Logo" />
      </div>
      <h1>Transaction complete!</h1>
      <p>
        {'You can view the status of the transaction below.'}
        <br />
        {'Bookmark this page to reference it later.'}
      </p>
      <p>Contact the seller to coorinate a time to pick up your item.</p>
      <div className='message-seller'>
        <a href={sellerProfile} target="_blank" rel="noopener noreferrer" className='message-button'>
          Message {userName}
        </a>
      </div>
      <div className='transaction-link'>
        <a href={txUrl} target="_blank" rel="noopener noreferrer">
          View transaction
        </a>
      </div>
    </div>
    </>
  );

};

export default SuccessPage;
