import React, { useState, useEffect, ChangeEvent, FormEvent, forwardRef, useImperativeHandle, useRef } from 'react';
import Modal from 'react-modal';
import { usePrivy } from '@privy-io/react-auth';

interface User {
    privyId: string;
    _id: string;
    fid?: string;
    fc_username?: string;
    fc_pfp?: string;
    fc_profile?: string;
    email?: string;
    walletAddress?: string;
}

interface Product {
    _id: string;
    location: string;
    title: string;
    description: string;
    imageUrl: string;
    price: string;
    walletAddress: string;
    email: string;
    user: User;
}

interface CreateListingProps {
    onFormSubmit: (formData: FormData, file: File | null) => Promise<Product>;
    formError: string;
    clearFormError: () => void;
    supportedCities: string[];
    initialFormData?: Partial<FormDataState>;
    showForm: boolean;
    onCloseModal: () => void;
    login: () => void;
}
  
interface FormDataState {
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

Modal.setAppElement('#root'); 

const CreateListing = forwardRef<CreateListingHandles, CreateListingProps>(({
    onFormSubmit,
    formError,
    clearFormError,
    supportedCities,
    initialFormData,
    showForm: propShowForm,
    onCloseModal,
    login,
}, ref) => {
    const { ready, authenticated } = usePrivy();
    const [formData, setFormData] = useState<FormDataState>({
        location: '',
        title: '',
        description: '',
        price: '',
        walletAddress: '',
        email: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [showForm, setShowForm] = useState<boolean>(propShowForm);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string>('');
    const [filePreview, setFilePreview] = useState<string | null>(null);

    // Add this useEffect hook
    useEffect(() => {
        if (initialFormData) {
            setFormData({
                location: initialFormData.location || '',
                title: initialFormData.title || '',
                description: initialFormData.description || '',
                price: initialFormData.price || '',
                walletAddress: initialFormData.walletAddress || '',
                email: initialFormData.email || '',
            });
        }
    }, [initialFormData]);


    useImperativeHandle(ref, () => ({
        openCreateListingModal: () => {
            handleButtonClick();
        },
    }));

    const handleButtonClick = () => {
        if (!authenticated) {
          login();
          return;
        }
        clearFormError();
        setShowForm(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            setFileName(file.name);
            setFilePreview(URL.createObjectURL(file));
        } else {
            // Handle the case when no file is selected
            setFileName('');
            setFilePreview(null);
        }
      };

    const handleFileButtonClick = () => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      };

    const handleCloseModal = () => {
        setShowForm(false);
        onCloseModal();
        clearFormError();
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
    
        if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
            const file = event.target.files && event.target.files.length > 0 ? event.target.files[0] : null;
            setFile(file);
            if (file) {
                setFileName(file.name); // Update the file name for UI display
                setFilePreview(URL.createObjectURL(file)); // Generate and set file preview
            } else {
                setFileName('');
                setFilePreview(null); // Clear previous file preview
            }
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach((key) => {
            const value = formData[key as keyof FormDataState];
            if (value !== undefined) {
            data.append(key, value);
            }
        });
        if (file) data.append('image', file);

        try {
            const product = await onFormSubmit(data, file);
            handleCloseModal();
            // Reset form and file states
            setFormData({
                location: '',
                title: '',
                description: '',
                price: '',
                walletAddress: '',
                email: '',
            });
            setFile(null); 
            clearFormError();
            return product;
        } catch (error) {
        }

    };


    return (
        <div>
            <div className="create-listing-container">
                {!authenticated ? (
                <>
                    <button
                    disabled={!ready}
                    className="login-button"
                    onClick={(e) => {
                        e.preventDefault();
                        login();
                    }}
                >
                    <p>Log in to add listing</p>
                </button>
                </>
            ) : (
                <>
                    <div className="create-listing">
                        <button className="create-listing-button" onClick={handleButtonClick}>Create Listing</button>
                    </div>
                <Modal 
                isOpen={showForm} 
                onRequestClose={handleCloseModal}
                className="add-product-modal"
                overlayClassName="modal-overlay"
                >
                    <button className="close-button" onClick={handleCloseModal}>&times;</button>
                    <h2>Add Product</h2>
                    <form onSubmit={handleSubmit}>
                        {formError && <p className="form-error">{formError}</p>}
                        <select name="location" value={formData.location} onChange={handleChange} required>
                            <option value="">Select your city</option>
                            {supportedCities.map((city, index) => (
                                <option key={index} value={city}>{city}</option>
                            ))}
                        </select>
                        <input name="title" type="text" value={formData.title} onChange={handleChange} placeholder="Title" required />
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required />
                        {/* Hidden file input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleChange}
                            style={{ display: 'none' }}
                            required
                        />
                        {/* Custom button that users see and interact with */}
                        <button className='upload-image-button' onClick={handleFileButtonClick} type="button">Upload image</button>
                        {fileName && <div>Selected file: {fileName}</div>}
                        {filePreview && <img src={filePreview} alt="File preview" style={{ width: '100px', height: 'auto' }} />}

                        <input name="price" type="text" value={formData.price} onChange={handleChange} placeholder="Price in USDC" />
                        <input name="walletAddress" type="text" value={formData.walletAddress} onChange={handleChange} placeholder="0x Wallet address to receive payment. Not ENS." required />
                        <input name="email" type="text" value={formData.email} onChange={handleChange} placeholder="Email for purchase notifications" required />
                        <button className="submit-button" type="submit">Submit</button>
                    </form>
                </Modal>
                </>
            )}
            </div>
        </div>
    );
});

export default CreateListing;
