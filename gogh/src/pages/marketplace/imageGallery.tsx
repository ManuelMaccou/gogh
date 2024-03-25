import { useState, useEffect } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

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

interface User {
  _id: string;
  fid?: string;
  fc_username?: string;
  fc_pfp?: string;
  fc_bio?: string;
  fc_url?: string;
  email?: string;
  walletAddress?: string;
}

interface ImageGalleryProps {
  product: Product;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState<string>(product?.featuredImage);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
  };

  const images: string[] = [product?.featuredImage, ...(product?.additionalImages || [])];

  return (
    <div className='image-gallery'>
      {isMobile ? (
        <Slider {...settings}>
          {images.map((image, index) => (
            <div key={index} onClick={() => setSelectedImage(image)}>
              <img src={image} alt={`${product?.title} - ${index}`} />
            </div>
          ))}
        </Slider>
      ) : (
        <>
          <div className="main-image-container">
            {selectedImage && <img src={selectedImage} alt={product?.title} className="main-image" />}
          </div>
          {product?.additionalImages && product.additionalImages.length > 0 && (
            <div className="thumbnail-container">
              {images.map((image, index) => (
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
        </>
      )}
    </div>
  );
};

export default ImageGallery;
