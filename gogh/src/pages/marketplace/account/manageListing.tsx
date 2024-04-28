import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../../../contexts/userContext';
import axios from 'axios';

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

interface Product {
    _id: string;
    listing: string;
    shipping: boolean;
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
  
interface FormDataState {
    shipping: boolean;
    location: string;
    title: string;
    description: string;
    price: string;
    walletAddress: string;
    email: string;
}

const ManageListing = ({ mode = 'create' }) => {
    const navigate = useNavigate();
    const { listingId } = useParams();
    const { ready, authenticated, getAccessToken} = usePrivy();
    const { user } = useUser();
    const [formData, setFormData] = useState({
        shipping: false,
        location: '',
        title: '',
        description: '',
        price: '',
        walletAddress: '',
        email: '',
    });

    const [formError, setFormError] = useState<string>('');
    const [initialFormData, setInitialFormData] = useState({});
    const [featuredImage, setFeaturedImage] = useState<File | null>(null);
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const featuredImageInputRef = useRef<HTMLInputElement>(null);
    const additionalImagesInputRef = useRef<HTMLInputElement>(null);
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
    const [additionalImagesPreview, setAdditionalImagesPreview] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const openListingPage = (product: Product) => {
        const productId = product._id;
        navigate(`/listing/${productId}`);
    };

    useEffect(() => {
        const fetchListing = async () => {
            if (mode === 'edit' && listingId) {
                try {
                    const accessToken = await getAccessToken();
                    const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/listings/single/${listingId}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                    const listing = response.data;

                    console.log('listing data:', listing);
                    
                    setFormData({
                        shipping: listing.shipping,
                        location: listing.location,
                        title: listing.title,
                        description: listing.description,
                        price: listing.price,
                        walletAddress: listing.walletAddress,
                        email: listing.email,
                    });
                    setFeaturedImagePreview(listing.featuredImage);
                    setAdditionalImagesPreview(listing.additionalImages);
                } catch (error) {
                    console.error('Error fetching listing data:', error);
                }
            } else {
                const params = new URLSearchParams(window.location.search);
                if (ready) {
                const initialData = {
                    location: params.get('location') || '',
                    shipping: params.get('shipping') === 'true',
                    title: params.get('title') || '',
                    description: params.get('description') || '',
                    price: params.get('price') || '',
                    walletAddress: params.get('walletAddress') || '',
                    email: params.get('email') || '',
                };
                setFormData(initialData);
                }
            }
        };
    
        fetchListing();
      }, [mode, listingId, ready, getAccessToken]);

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = event.target as HTMLInputElement;
        const { name, value, type, files } = target;
    
        if (type === 'file' && files) {
            if (name === 'featuredImage' && files && files.length > 0) {
                const file = files[0] as File;
                setFeaturedImage(file);
                setFeaturedImagePreview(URL.createObjectURL(file));
            } else if (name === 'additionalImages' && files) {
                const newFiles = Array.from(files as FileList);
                const spaceAvailable = 4 - additionalFiles.length;
                const filesToAdd = newFiles.slice(0, spaceAvailable);
    
                if (filesToAdd.length) {
                    const updatedFiles = [...additionalFiles, ...filesToAdd];
                    setAdditionalFiles(updatedFiles);
    
                    const updatedPreviews = updatedFiles.map(file => URL.createObjectURL(file));
                    setAdditionalImagesPreview(updatedPreviews);
                }
    
                if (newFiles.length > spaceAvailable) {
                    setFormError(`Only 4 photos can be added. You tried to add ${newFiles.length}`);
                }
            }
        } else if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (event.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRemoveImage = (index: number) => {
        // Get the URL of the image that is about to be removed
        const urlToRemove = additionalImagesPreview[index];

        // Revoke the object URL to free up resources
        URL.revokeObjectURL(urlToRemove);

        // Remove the file at the given index
        const newFiles = [...additionalFiles.slice(0, index), ...additionalFiles.slice(index + 1)];
        setAdditionalFiles(newFiles);
    
        // Remove the preview at the given index
        const newPreviews = [...additionalImagesPreview.slice(0, index), ...additionalImagesPreview.slice(index + 1)];
        setAdditionalImagesPreview(newPreviews);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    
        const accessToken = await getAccessToken();

        console.log('Access token:', accessToken);
        console.log('mode:', mode);

        if (!accessToken) {
          setFormError('Authentication failed. Please log in again.');
          return;
        }
    
        if (!validateFormData()) return;
    
        const data = buildFormData();

        console.log('Form data:', data);
    
        try {
          setIsSubmitting(true);
          if (mode === 'edit') {

            console.log('Updating product:', listingId);

            await axios.put(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/update/${listingId}`, data, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            navigate(`/listing/${listingId}`);
          } else {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/add`, data, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
    
            if (response.status === 201) {
              openListingPage(response.data);
              resetForm();
            } else {
              throw new Error('Product creation failed');
            }
          }
        } catch (error: any) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred';
          setFormError(message);
        } finally {
          setIsSubmitting(false);
        }
    };

    function validateFormData() {
        const { price, walletAddress } = formData;
        const priceRegex = /^\$?\d+(\.\d{1,2})?$/;
    
        if (!featuredImage && !(mode === 'edit' && featuredImagePreview)) {
            setFormError("Please upload a featured image.");
            console.log("issue with featured image");
            return false;
        }
    
        if (!priceRegex.test(price) && price !== '') {
            setFormError("Please use this format for the price: $xxx.xx or xxx.xx");
            console.log("issue with featured price");
            return false;
        }
    
        if (!walletAddress.startsWith('0x')) {
            setFormError('Wallet address must start with "0x".');
            console.log("issue with featured wallet address");
            return false;
        }
    
        return true; // All validations passed
    }

    function buildFormData() {
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            const value = formData[key as keyof typeof formData];
            if (typeof value === 'string' || typeof value === 'boolean') {
                data.append(key, value.toString());
            }
        });
    
        if (featuredImage) {
            data.append('featuredImage', featuredImage);
        } else if (mode === 'edit' && featuredImagePreview) {
            // If in edit mode and no new featured image is selected,
            // include the existing featured image URL in the form data
            data.append('existingFeaturedImage', featuredImagePreview);
        }
    
        if (additionalFiles.length > 0) {
            additionalFiles.forEach(file => {
                data.append('images', file);
            });
        } else if (mode === 'edit' && additionalImagesPreview.length > 0) {
            // If in edit mode and no new additional images are selected,
            // include the existing additional image URLs in the form data
            additionalImagesPreview.forEach(url => {
                data.append('existingAdditionalImages', url);
            });
        }
    
        return data;
    }

    function resetForm() {
        // Revoke all object URLs
        if (featuredImagePreview) {
            URL.revokeObjectURL(featuredImagePreview);
        }
        additionalImagesPreview.forEach(url => URL.revokeObjectURL(url));

        setFormData({
            shipping: false,
            location: '',
            title: '',
            description: '',
            price: '',
            walletAddress: '',
            email: '',
        });
        setFeaturedImage(null);
        setAdditionalFiles([]);
        setFeaturedImagePreview(null);
        setAdditionalImagesPreview([]);
    };

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (featuredImagePreview) {
                URL.revokeObjectURL(featuredImagePreview);
            }
            additionalImagesPreview.forEach(url => URL.revokeObjectURL(url));
        };
    }, []); // Empty dependency array to run only on unmount


    return (
        <div className="create-listing-container">
            <form className='create-listing-form' onSubmit={handleSubmit}>

                <div className="create-listing-section">
                    <div className="create-listing-subsection-row">
                        <div className="input-group">
                            <label htmlFor="title">Title</label>
                            <input name="title" type="text" value={formData.title} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="price">Price</label>
                            <input name="price" type="text" value={formData.price} onChange={handleChange} placeholder="$USD" />
                        </div>
                    </div>
                    <div className="input-group">
                        <label htmlFor="description">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} required />
                    </div>
                </div>
                <div className="create-listing-section">
                    <div className="create-listing-subsection-row">
                        <div className="input-group">
                        <label htmlFor="description">Location</label>
                            <input 
                                name="location" 
                                type="text" 
                                value={formData.location} 
                                onChange={handleChange} 
                                required 
                            />
                            <p className="helper-text">
                                'City, State' or 'City, Country'
                            </p>
                        </div>
                        <label htmlFor="shipping" className='checkbox-container'>
                            <input
                                name="shipping"
                                type="checkbox"
                                id="shipping"
                                checked={formData.shipping === true}
                                onChange={handleChange}
                            />
                            Will offer shipping
                        </label>
                        
                    </div>
                </div>
                <div className="create-listing-section">
                    <div className='add-images'>
                        <div className='featured-image'>
                            {/* Hidden file input */}
                            <input
                                name="featuredImage"
                                type="file"
                                ref={featuredImageInputRef}
                                onChange={handleChange}
                                style={{ display: 'none' }}
                            />
                            
                            {featuredImagePreview && (
                                <img src={featuredImagePreview} alt="Featured product image" />
                            )}
                            <input
                                name="additionalImages"
                                type="file"
                                multiple
                                ref={additionalImagesInputRef}
                                onChange={handleChange}
                                style={{ display: 'none' }}
                            />
                            <button 
                            className='upload-featured-image-button'
                            type="button"
                            onClick={() => {
                                featuredImageInputRef.current?.click()}}>
                                Upload Featured Image
                            </button>
                        </div>
                        <div className='additional-images'>
                            <div className='images'>
                                {additionalImagesPreview.map((previewUrl, index) => (
                                    <div key={index}>
                                        <img src={previewUrl} alt={`Additional product ${index + 1}`} />
                                        <button 
                                            onClick={() => handleRemoveImage(index)} 
                                            style={{ position: 'absolute', top: 0, right: 0, cursor: 'pointer', background: 'red', color: 'white', border: 'none'}}>
                                            x
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {featuredImagePreview && (
                            <button
                            className='upload-additional-image-button'
                            type="button"
                            onClick={() => additionalImagesInputRef.current?.click()}>
                                Add up to 4 more images
                            </button>
                            )}

                            {/* Custom button that users see and interact with */}
                        </div>
                    </div>
                </div>
                <div className="create-listing-section">
                    <div className="input-group">
                        <label htmlFor="walletAddress">Wallet address</label>
                        <input name="walletAddress" type="text" value={formData.walletAddress} onChange={handleChange} placeholder="0x address to receive payment." required />
                    </div>
                </div>
                <button className="submit-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                        <span className="spinner"></span>
                        {mode === 'edit' ? 'Updating...' : 'Submitting...'}
                        </>
                    ) : mode === 'edit' ? 'Update Listing' : 'Submit'}
                </button>
                {formError && <p className="form-error">{formError}</p>}
            </form>       
        </div>
    );
};

export default ManageListing;
