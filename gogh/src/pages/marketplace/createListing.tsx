import React, { useState, ChangeEvent, FormEvent } from 'react';
import Modal from 'react-modal';

interface CreateListingProps {
    isLoggedIn: boolean;
    onFormSubmit: (formData: FormDataState) => Promise<void>;
    formError: string;
    clearFormError: () => void;
    supportedCities: string[];
  }
  
interface FormDataState {
    location: string;
    title: string;
    description: string;
    image: string;
    price: string;
}

Modal.setAppElement('#root'); 

const CreateListing: React.FC<CreateListingProps> = ({
    isLoggedIn,
    onFormSubmit,
    formError,
    clearFormError,
    supportedCities,
}) => {
    const [showForm, setShowForm] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormDataState>({
        location: '',
        title: '',
        description: '',
        image: '',
        price: '',
    });

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
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log(formData);
        try {
            await onFormSubmit(formData);
            setShowForm(false);
            setFormData({
                location: '',
                title: '',
                description: '',
                image: '',
                price: '',
            });
            clearFormError();
        } catch (error) {
        }
    };


    return (
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
                    <input name="image" type="text" value={formData.image} onChange={handleChange} placeholder="Image URL" required />
                    <input name="price" type="text" value={formData.price} onChange={handleChange} placeholder="Price" />
                    <button className="submit-button" type="submit">Submit</button>
                </form>
            </Modal>
            </>
        )}
        </div>
    );
};

export default CreateListing;
