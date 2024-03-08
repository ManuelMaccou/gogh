import { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import SimulateUser from '../../SimulateUser'


interface ProductData {
    description: string;
    originalDescription:string;
}

interface Product {
    _id: string;
    shopifyProductId: string;
    originalDescription: string;
    frameUrl: string;
    frameImage: string;
    title: string;
    description: string;
}

interface Store {
    _id: string;
    shopifyStoreUrl: string;
    image: string;
    storeName: string;
    storeDescription: string;
    storeAdmin: string;
    products: Product[]; 
}

interface User {
    _id: string;
    fid:string;
    fc_username: string;
    fc_pfp: string;
    fc_profile: string;
}






const onSimulationSuccess = (fid: string) => {
    console.log(`Simulated FID: ${fid}`);
};


function ManageShopifyStore() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/user`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            setCurrentUser(response.data);
            } catch (error) {
            console.error("Error fetching user:", error);
            }
        };
        
        fetchUser();
        }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login page if the token is not found
            navigate('/login');
        }
    }, [navigate]);

    const [errorMessage, setErrorMessage] = useState('');

    const maxChars = 500;
    const maxLines = 15;

    const [charCount, setCharCount] = useState(0);
    const [charLimitExceeded, setCharLimitExceeded] = useState(false);
    const [lineCount, setLineCount] = useState(0);
    const [lineLimitExceeded, setLineLimitExceeded] = useState(false);
    const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
    

    const handleEditorChange = useCallback((content: string, editor: any) => {
        const textContent = editor.getContent({ format: "text" });

        const currentCharCount = textContent.length;
        setCharCount(currentCharCount);

        const currentLineCount = content.split(/<p>|<br>|<\/p>|<li>|<\/li>/).filter(Boolean).length;
        setLineCount(currentLineCount);

        if (currentCharCount <= maxChars) {
            setProductData(prevData => ({
                ...prevData,
                description: content
            }));
            setCharLimitExceeded(false);
        } else {
            setCharLimitExceeded(true);
        }

        if (currentLineCount <= maxLines) {
            setProductData(prevData => ({
                ...prevData,
                description: content
            }));
            setLineLimitExceeded (false);
        } else {
            setLineLimitExceeded (true);
        }
    }, [maxChars, maxLines]);

    const resetForm = () => {
        setProductData({
            description: '',
            originalDescription: '',
        });
        setSelectedProductForEdit(null);
        setIsEditMode(false);
        setErrorMessage('');
        setConfirmationMessage('');
        };

    const [productData, setProductData] = useState<ProductData>({
        description: '',
        originalDescription: '',
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [store, setStore] = useState<Store | null>(null);
    const [frameUrl, setFrameUrl] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState('');

    // Upating store image
    const [storeImage, setStoreImage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitImageUrl = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token'); // Ensure you have the token stored
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/shopify/store/update`, 
                { storeImage: storeImage }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { storeImageUrl, frameUrl } = response.data;

            // Update the state with the new store image URL and frame URL
            setStoreImage(storeImageUrl);
            setFrameUrl(frameUrl);

            // Handle successful image update here, e.g., fetch the updated store info or show a success message
            alert('Image updated successfully!');
        } catch (error) {
            console.error('Failed to update store image:', error);
            alert('Failed to update image. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
  
    useEffect(() => {
        const fetchStoreAndProducts = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const storeResponse = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/shopify/store`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                
                setStore(storeResponse.data);
                setProducts(storeResponse.data.products);
                setFrameUrl(storeResponse.data.frameUrl);
                
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const message = err.response?.data?.message || "An error occurred.";
                    if (err.response?.status === 404) {
                        console.log('No products found for store');
                    } else if (err.response?.status === 401) {
                        setErrorMessage('Session has expired. Please log in again.');
                    } else {
                        console.error('Error fetching products:', message);
                    }
                } else {
                    console.error('Network error or issue with fetching products:', err);
                }
            }
        };
      
        fetchStoreAndProducts();
    }, []);
   

    const [isEditMode, setIsEditMode] = useState(false);    

    const toggleEditMode = () => {
    if (isEditMode) {
            resetForm();
        }
        setIsEditMode(!isEditMode);
    };

    const handleProductSelect = (productId: string) => {
        

        const productToEdit = products.find(product => product._id === productId);
        console.log("Product selected:", productId);

        console.log('product to edit:',productToEdit)

        if (productToEdit) {
            setProductData({
                description: productToEdit.description,
                originalDescription: productToEdit.originalDescription,
            });
            setSelectedProductForEdit(productToEdit);
            setIsEditMode(true);
        }
    };

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage('');
        setConfirmationMessage('');

        if (!selectedProductForEdit) {
            setErrorMessage("No product selected for editing.");
            return;
        }
        console.log('Selected product to edit:',selectedProductForEdit);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setErrorMessage("You are not logged in. Please log in to submit a product.");
                return;
            }

            // Include the updated description in the data sent to the server
            const updatedProductData = {
                ...productData,
                description: productData.description // This is the updated description from the editor
            };

            console.log('selectedProductForEdit ID:', selectedProductForEdit._id);
            const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/shopify/product/update/${selectedProductForEdit._id}`,
            updatedProductData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const updatedProduct = response.data;
            setProducts(prevProducts => prevProducts.map(p => p._id.toString() === updatedProduct._id.toString() ? updatedProduct : p));
            resetForm();
            setConfirmationMessage('Product successfully updated!');

        } catch (err) {
            if (axios.isAxiosError(err)) {
                const message = err.response?.data?.message || "An error occurred.";
                if (err.response?.status === 400) {
                    setErrorMessage("Failed to update product.");
                } else if (err.response?.status === 401) {
                    setErrorMessage("Your session has expired. Please capture any content you need and log in again.");
                } else {
                    console.error('Error during product update:', message);
                    setErrorMessage("Failed to update product.");
                }
            } else {
                console.error('Error during product update:', err);
                setErrorMessage("An unexpected error occurred. Please refresh the page and try again. If the issue persists, feel free to DM on Warpcast @manuelmaccou.");
            }
        }
    };

    return (
        <div>
             <div>
            {currentUser && currentUser.fid === '8587' && (
                <SimulateUser onSimulationSuccess={onSimulationSuccess} />
            )}
            </div>
            <div className="submit-product-container">
                <div className="product-form-section">
                    <div className="product-form-box">
                        <h2>{selectedProductForEdit ? 'Edit Product' : 'Submit New Product'}</h2>
                        <form onSubmit={onSubmit} className="product-form">

                            <div className="form-group">
                                <label htmlFor="description">Description:</label>
                                <Editor
                                    apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                    value={productData.description ? productData.description : productData.originalDescription}
                                    onEditorChange={handleEditorChange}
                                    init={{
                                        height: 300,
                                        menubar: false,
                                        plugins: [
                                            'lists'
                                            ],
                                        toolbar: '',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                                    }}
                                />
                                {charLimitExceeded && (
                                    <div style={{ color: 'red' }}>
                                        The maximum character limit of {maxChars} has been exceeded. To ensure a clean frame, please shorten the description.
                                    </div>
                                )}
                                {lineLimitExceeded && (
                                    <div style={{ color: 'red' }}>
                                        The maximum line limit of {maxLines} has been exceeded. To ensure a clean frame, please shorten the number of lines.
                                    </div>
                                )}
                                <span className="field-hint">Character Count: {charCount} / {maxChars}</span>
                                <span className="field-hint">Line Count: {lineCount} / {maxLines}</span>
                            </div>
                            <button type="submit">{selectedProductForEdit ? 'Update Product' : 'Add Product'}</button>
                            {errorMessage && <p className="error-message">{errorMessage}</p>}
                        </form>
                        {confirmationMessage && <div className="confirmation-message">{confirmationMessage}</div>}
                
                            <div className="shareable-url-section">
                                <h3>Frame URL</h3>
                                <p>Your store is ready! Post this URL on Farcaster:</p>
                                <input type="text" value={frameUrl} readOnly />
                                <button onClick={() => navigator.clipboard.writeText(frameUrl)}>Copy URL</button>
                            </div>
                    </div>
                </div>

                <div className='store-section'>
                    <h2>Store Preview</h2>
                    <p>This is a preview of the first frame people will see when they find your store. It's set to landscape 1.91:1 by default. Message me if you need square 1:1.</p>
                    <div className='frame-preview'>
                    {store && (
                                <div 
                                    className="store-card"
                                    key={store._id}
                                >
                                    {store.image && <img src={store.image} alt={store.storeName} className="store-image"/>}
                                </div>
                            )}
                            <div className='frame-button'>
                                <p>Start Shopping</p>
                            </div>
                        </div>
                        {/* Image URL submission form */}
                        <div className="image-url-submit-section">
                            <input 
                                type="text" 
                                value={storeImage || ''} 
                                onChange={(e) => setStoreImage(e.target.value || '')} 
                                placeholder="Enter image URL here"
                                disabled={submitting}
                            />
                            <button onClick={handleSubmitImageUrl} disabled={submitting}>
                                {submitting ? 'Updating...' : 'Update Image'}
                                
                            </button>
                        </div>
                    <div className={`products-section ${isEditMode ? 'edit-mode' : ''}`}>
                        <h2>{isEditMode ? 'Select products to edit' : ''}</h2>

                        <div className="deletion-buttons">

                                        <button className="edit-button" onClick={toggleEditMode}>{isEditMode ? 'Cancel' : 'Edit Products'}</button>

                            </div>
                        {store?.products.map(product => (
                            <div 
                            className={`product-card ${isEditMode && selectedProductForEdit && selectedProductForEdit._id === product._id ? 'selected' : 'deselected'}`}
                                key={product._id}
                                onClick={() => isEditMode && handleProductSelect(product._id)}
                            >
                                <div className='product-preview-card'>
                                    {product.frameImage && <img src={product.frameImage} alt={product.title} className="product-frame"/>}
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
    
export default ManageShopifyStore;