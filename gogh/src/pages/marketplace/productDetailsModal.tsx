import React from 'react';
import Modal from 'react-modal';

interface User {
    _id: string;
    fc_username?: string;
    fc_pfp?: string;
    fc_url?: string;
    email?: string;
    walletAddress?: string;
  }

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

interface ProductDetailsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  product: Product | null;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onRequestClose,
  product,
}) => {
  if (!product) return null;

const shareUrl = `https://warpcast.com/~/compose?embeds[]=https://www.gogh.shopping/marketplace/frame/share/product/${product._id}`;
const userName = product.user?.fc_username ?? product.user?.walletAddress?.slice(0, 6);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Product Details"
      className="product-modal"
      overlayClassName="modal-overlay"
    >
      <div className='product-modal-close'>
        <button onClick={onRequestClose} aria-label="Close">
          <i className="fa-solid fa-rectangle-xmark"></i>
        </button>
      </div>
      <div className='product-modal-header'>
      {product.user?.fc_pfp && (
        <img src={product.user.fc_pfp} alt="User profile" className='fc-pfp'  />
      )}

        <p>{userName}</p>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className='share-button'>
        <p>Share</p>
        <i className="fa-regular fa-share-from-square"></i>
        </a>
    </div>
    <div className='product-modal-body'>
      <img src={product.featuredImage} alt={product.title} className='product-image'/>
      <div className='product-info'>
          <h2>{product.title}</h2>
          <p className='product-description'>{product.description}</p>
          <p className='product-price'>Price: {product.price}</p>
      </div>
      </div>
    </Modal>
  );

};

export default ProductDetailsModal;
