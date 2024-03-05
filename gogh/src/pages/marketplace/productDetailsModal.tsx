import React from 'react';
import Modal from 'react-modal';

interface User {
    _id: string;
    fc_username: string;
    fc_pfp: string;
    fc_profile: string;
  }

interface Product {
    _id: string;
    location: string;
    title: string;
    description: string;
    imageUrl: string;
    price: string;
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

  const shareUrl = `https://warpcast.com/~/compose?text=${product.title}&embeds[]=${product.imageUrl}`;


  return (
    <Modal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        contentLabel="Product Details"
        className="product-modal"
        overlayClassName="modal-overlay"
    >
        
        <div className='product-modal-header'>
            <img src={product.user.fc_pfp} alt="User profile" className='fc-pfp'  />
            <p>{product.user.fc_username}</p>
        </div>
        <div className='product-modal-body'>
            <img src={product.imageUrl} alt={product.title} className='product-image'/>
            <div className='product-info'>
                <h2>{product.title}</h2>
                <p className='product-description'>{product.description}</p>
                <p className='product-price'>Price: {product.price}</p>
            </div>
        </div>
        <div className='product-modal-footer'>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className='share-button'>
        <p>Share</p>
        <i className="fa-regular fa-share-from-square"></i>
        </a>
        </div>
    </Modal>
  );




/*
  return (
    <Modal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        contentLabel="Product Details"
        className="product-modal"
        overlayClassName="modal-overlay"
    >
        
        <div className='fc-user-tag'>
            <img src={product.user.fc_pfp} alt="User profile" className='fc-pfp'  />
            <p>{product.user.fc_username}</p>
        </div>
        <h2>{product.title}</h2>
        <div className='marketplace-product-details' >
        <img src={product.imageUrl} alt={product.title} className='marketplace-product-feat-img'/>
        <div>
            <div className='marketplace-product-details'>
                <p>{product.description}</p>
            </div>
            <p>Price: {product.price}</p>
        <div className='product-share-button'>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                Share
            </a>
        </div>   
        </div>
      </div>
    </Modal>
  );
  */
};

export default ProductDetailsModal;
