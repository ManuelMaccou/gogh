import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '../../../contexts/userContext';
import axios from 'axios';
import Header from '../../header';
import Sidebar from './sidebar';
import { useHistory } from 'react-router-dom';

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

interface CreateListingHandles {
    openCreateListingModal: () => void;
}

const CreateListing = () => {
    const { ready, authenticated, getAccessToken} = usePrivy();
    const [formData, setFormData] = useState<FormDataState>({
        shipping: false,
        location: '',
        title: '',
        description: '',
        price: '',
        walletAddress: '',
        email: '',
    });

    const { user } = useUser();
    const [formError, setFormError] = useState<string>('');
    const [initialFormData, setInitialFormData] = useState({});
    const [featuredImage, setFeaturedImage] = useState<File | null>(null);
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const featuredImageInputRef = useRef<HTMLInputElement>(null);
    const additionalImagesInputRef = useRef<HTMLInputElement>(null);
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
    const [additionalImagesPreview, setAdditionalImagesPreview] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (initialFormData) {
            setFormData({
                shipping: initialFormData.shipping || false,
                location: initialFormData.location || '',
                title: initialFormData.title || '',
                description: initialFormData.description || '',
                price: initialFormData.price || '',
                walletAddress: initialFormData.walletAddress || '',
                email: initialFormData.email || '',
            });
        }
    }, [initialFormData]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const city = searchParams.get('location');
        const shipping = searchParams.get('shipping') === 'true';
        const title = searchParams.get('title');
        const description = searchParams.get('description');
        const price = searchParams.get('price');
        const walletAddress = searchParams.get('walletAddress');
        const email = searchParams.get('email');

        if (ready) {
            if (title && authenticated) {
                setInitialFormData({ location:city, shipping, title, description, price, walletAddress, email });

            } else if (title && !authenticated) {
                setInitialFormData({ location:city, shipping, title, description, price,walletAddress, email });
            }
        }

    }, [location, authenticated, ready]);


    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = event.target;
    
        if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
            // Handling the featured image
            if (name === 'featuredImage') {
                const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                if (file) {
                    setFeaturedImage(file);
                    setFeaturedImagePreview(URL.createObjectURL(file));
                } else {
                    // Resetting states if no file is selected
                    setFeaturedImage(null);
                    setFeaturedImagePreview(null);
                }
            }
            // Handling additional images
            else if (name === 'additionalImages' && event.target.files) {
                const newFiles = Array.from(event.target.files);
                const spaceAvailable = 3 - additionalFiles.length;
                const filesToAdd = newFiles.slice(0, spaceAvailable);
            
                if (filesToAdd.length > 0) {
                    const updatedFiles = [...additionalFiles, ...filesToAdd];
                    setAdditionalFiles(updatedFiles);
            
                    const updatedPreviews = updatedFiles.map(file => URL.createObjectURL(file));
                    setAdditionalImagesPreview(updatedPreviews);
                }
            
                if (newFiles.length > spaceAvailable) {
                    alert(`Only 3 photos can be added.`);
                }
            }

        } else if (type === 'checkbox') {
            const isChecked = (event.target as HTMLInputElement).checked;
            setFormData(prevState => ({ ...prevState, [name]: isChecked }));

        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleRemoveImage = (index: number) => {
        // Remove the file at the given index
        const newFiles = [...additionalFiles.slice(0, index), ...additionalFiles.slice(index + 1)];
        setAdditionalFiles(newFiles);
    
        // Remove the preview at the given index
        const newPreviews = [...additionalImagesPreview.slice(0, index), ...additionalImagesPreview.slice(index + 1)];
        setAdditionalImagesPreview(newPreviews);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        const accessToken = await getAccessToken();

        event.preventDefault();
        const data = new FormData();
        const priceRegex = /^\$?\d+(\.\d{1,2})?$/;

        Object.keys(formData).forEach((key) => {
            let value = formData[key as keyof FormDataState];

            if (typeof value === 'boolean') {
                value = value.toString();
            }

            if (key === 'price' && typeof value === 'string') {
                value = value.replace(/^\$/, '');
            }

            if (value !== undefined) {
            data.append(key, value);
            }
        });

        if (featuredImage) {
            data.append('featuredImage', featuredImage);
        }

        if (!featuredImage) {
            alert("Please upload a featured image.");
            return;
        }

        if (!priceRegex.test(formData.price) && formData.price !== '') {
            alert("Please use this format for the price: $xxx.xx or xxx.xx");
            return;
        }

        if (!formData.walletAddress.startsWith('0x')) {
            alert('Wallet address must start with "0x".');
            return;
        }

        if (additionalFiles) {
            additionalFiles.forEach((file) => {
                data.append('images', file);
            });
        }

        try {
            setIsSubmitting(true);


            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/marketplace/product/add`, data, featuredImage, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
              });
    
              if (response.status === 201) {
                const product = response.data
                openListingPage(product);
                return response.data;
            } else {
                throw new Error('Product creation failed');
            }
            
            // Reset form and file states
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
            clearFormError();
            return product;
        } catch (error) {
            setFormError('An error occurred while submitting the form.');
        } finally {
            setIsSubmitting(false);
        }

    };


    return (
        <div>
            <Header />
            <Sidebar />
            <div className="create-listing-container">
                <button className='back-button'>
                    {/*Placeholder for arrow and navigation back to last page*/}
                    Back</button>

                    <form className='create-listing-form' onSubmit={handleSubmit}>

                    <div className="create-listing-section">
                        <div className="create-listing-subsection-row">
                            <input name="title" type="text" value={formData.title} onChange={handleChange} placeholder="Title" required />
                            <input name="price" type="text" value={formData.price} onChange={handleChange} placeholder="Price in $USD" />
                        </div>
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required />
                    </div>
                    <div className="create-listing-subsection-row">
                    <input 
                            name="location" 
                            type="text" 
                            value={formData.location} 
                            onChange={handleChange} 
                            placeholder="Enter your city, state or city, country" 
                            required 
                        />
                        <p className="helper-text">
                            'City, State' or 'City, Country'
                        </p>
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
                    <div className="create-listing-section">
                        {/* Hidden file input */}
                        <input
                            name="featuredImage"
                            type="file"
                            ref={featuredImageInputRef}
                            onChange={handleChange}
                            style={{ display: 'none' }}
                        />
                        
                        {featuredImagePreview && (
                            <img src={featuredImagePreview} alt="Featured product image" style={{ width: '70px', height: 'auto' }} />
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

                        <div>
                            {additionalImagesPreview.map((previewUrl, index) => (
                                <div key={index} style={{ position: 'relative', display: 'inline-block', marginRight: '5px' }}>
                                    <img src={previewUrl} alt={`Additional product ${index + 1}`} style={{ width: '70px', height: 'auto' }} />
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
                            Add up to 3 more images
                        </button>
                        )}

                        {/* Custom button that users see and interact with */}
                    </div>
                    <div className="create-listing-section">
                        <input name="walletAddress" type="text" value={formData.walletAddress} onChange={handleChange} placeholder="0x Wallet address to receive payment." required />
                    </div>
                    <button className="submit-button" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <span className="spinner"></span> {/* Assuming you have CSS for this spinner */}
                                    Submitting...
                                </>
                            ) : "Submit"}
                    </button>
                    {formError && <p className="form-error">{formError}</p>}
                </form>           
            </div>
        </div>
    );
});

export default CreateListing;
