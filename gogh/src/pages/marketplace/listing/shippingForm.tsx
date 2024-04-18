import { useState, ChangeEvent, FormEvent } from 'react';

interface ShippingFormProps {
    onSaveShippingDetails: (details: {
        name: string,
        street: string,
        apartment: string,
        city: string,
        state: string,
        zip: string,
        country: string,
    }) => void;
}

const ShippingForm: React.FC<ShippingFormProps> = ({ onSaveShippingDetails }) => {
    const [formData, setFormData] = useState({
        name: '',
        street: '',
        apartment: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        phone: ''
    });

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSaveShippingDetails(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="shipping-form">
            <p>Fill out this form to request shipping. The seller may choose not to grant shipping based on your location.</p>
            <div className="form-group">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="street">Street Address</label>
                <input type="text" id="street" name="street" value={formData.street} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="apartment">Apartment Number</label>
                <input type="text" id="apartment" name="apartment" value={formData.apartment} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="city">City</label>
                <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="state">State/Province</label>
                <input type="text" id="state" name="state" value={formData.state} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="zip">Postal Code</label>
                <input type="text" id="zip" name="zip" value={formData.zip} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="country">Country</label>
                <input type="text" id="country" name="country" value={formData.country} onChange={handleChange} required />
            </div>
            <button type="submit" className="submit-button">Submit Shipping Details</button>
        </form>
    );
};

export default ShippingForm;