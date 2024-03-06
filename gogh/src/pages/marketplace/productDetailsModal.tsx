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

  const shareUrl = `https://warpcast.com/~/compose?text=I%20just%20listed%20a%20product%20for%20sale%20on%20Gogh%20Marketplace.%20%0A%0A${product.title}.%0ALocated%20in%20${product.location}.%0A%0ADM%20me%20if%20you%27re%20interested%21&embeds[]=${product.imageUrl}&embeds[]=https://www.gogh.shopping`;


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
};

export default ProductDetailsModal;
