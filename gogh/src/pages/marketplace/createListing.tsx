import React, { useState, ChangeEvent, FormEvent, forwardRef } from 'react';
import Modal from 'react-modal';

interface CreateListingProps {
    isLoggedIn: boolean;
    onFormSubmit: (formData: FormData, file: File | null) => Promise<void>;
    formError: string;
    clearFormError: () => void;
    supportedCities: string[];
  }
  
interface FormDataState {
    location: string;
    title: string;
    description: string;
    walletAddress: string;
    // image: string;
    price: string;
}

Modal.setAppElement('#root'); 

const CreateListing = forwardRef<HTMLDivElement, CreateListingProps>(({
    isLoggedIn,
    onFormSubmit,
    formError,
    clearFormError,
    supportedCities,
}, ref) => {
    const [showForm, setShowForm] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormDataState>({
        location: '',
        title: '',
        description: '',
        // image: '',
        walletAddress: '',
        price: '',
    });

    const [file, setFile] = useState<File | null>(null);

    const handleButtonClick = () => {
        if (!isLoggedIn) {
          alert('You must be logged in to create a listing.');
          return;
        }
        clearFormError();
        setShowForm(true);
    };

    const handleCloseModal = () => {
        setShowForm(false);
        clearFormError();
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
    
        if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
            setFile(event.target.files && event.target.files.length > 0 ? event.target.files[0] : null);
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData();
        data.append('location', formData.location);
        data.append('title', formData.title);
        data.append('description', formData.description);
        if (file) data.append('image', file);
        data.append('walletAddress', formData.walletAddress);
        data.append('price', formData.price);

        try {
            await onFormSubmit(data, file);
            setShowForm(false);
            // Reset form and file states
            setFormData({
                location: '',
                title: '',
                description: '',
                price: '',
                walletAddress: '',
            });
            setFile(null); // Reset file state
            clearFormError();
        } catch (error) {
        }
    };


    return (
        <div ref={ref}>
            <div className="create-listing-container">
                {!isLoggedIn ? (
                <>
                    <p>Log in to list your product.</p>
                    <div className="neynar_signin" data-client_id={process.env.REACT_APP_NEYNAR_CLIENT_ID} data-success-callback="onSignInSuccess" data-variant="warpcast"></div>
                </>
            ) : (
                <>
                    <div className="create-listing">
                        <p>List your product for sale</p>
                    </div>
                    <button onClick={handleButtonClick}>Create Listing</button>

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
                        <input type="file" onChange={handleChange} required />
                        <input name="price" type="text" value={formData.price} onChange={handleChange} placeholder="Price in USDC" />
                        <input name="walletAddress" type="text" value={formData.walletAddress} onChange={handleChange} placeholder="Wallet address to receive payment" required />
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
