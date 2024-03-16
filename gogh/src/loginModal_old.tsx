import React from 'react';
import Modal from 'react-modal';
import { usePrivy } from '@privy-io/react-auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { getAccessToken } = usePrivy();

    const handleLogin = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.log("User is not authenticated.");
        return;
      }
      console.log("Access Token:", accessToken);
      // You can now use the access token to authenticate requests to your backend
    };
  
    if (!isOpen) return null;
  
    return (
      <Modal isOpen={isOpen} contentLabel="Login modal">
        <div className="modal-content">
          <span className="close" onClick={onClose}>&times;</span>
          <h1>Log in to continue</h1>
          <button onClick={handleLogin}>Log In with Privy</button>
        </div>
      </Modal>
    );
  };

export default LoginModal;
