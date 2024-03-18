import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import '../../src/styles.css';

interface ProductData {
    title: string;
    description: string;
    image: string;
    url: string;
    price: string;
}

interface Product {
    _id: string;
    title: string;
    description: string;
    productFrame: string;
    descriptionFrame: string;
    image: string;
    url: string;
    price: string;
}

interface Store {
    _id: string;
    image: string;
    storeName: string;
    storeDescription: string;
    storeAdmin: string;
}

interface User {
    _id: string;
    fid:string;
    fc_username: string;
    fc_pfp: string;
    fc_profile: string;
    email: string;
    walletAddress: string;
}

function parseJwt(token: string) {
    if (!token) { return null; }
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
};

function appendUTMParameters(url: string, source: string = 'gogh', medium = 'farcaster') {
    // Check if URL already has parameters
    const hasParams = url.includes('?');
    const utmSource = `utm_source=${encodeURIComponent(source)}`;
    const utmMedium = `utm_medium=${encodeURIComponent(medium)}`;
    // Append UTM parameters
    return `${url}${hasParams ? '&' : '?'}${utmSource}&${utmMedium}`;
}


function ManageStore() {
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState('');

    const maxChars = 500;
    const maxLines = 15;

    const [charCount, setCharCount] = useState(0);
    const [charLimitExceeded, setCharLimitExceeded] = useState(false);
    const [lineCount, setLineCount] = useState(0);
    const [lineLimitExceeded, setLineLimitExceeded] = useState(false);
    const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    React.useEffect(() => {
        const scriptId = 'neynar-script';

        const loadNeynarScript = () => {
            if (!document.getElementById(scriptId)) {
                const script = document.createElement('script');
                script.id = scriptId;
                script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js";
                script.async = true;
                document.body.appendChild(script);
            }
        };

        const removeNeynarScript = () => {
            const script = document.getElementById(scriptId);
            if (script) {
                document.body.removeChild(script);
            }
        };

        if (!isLoggedIn) {
            loadNeynarScript();
        } else {
            removeNeynarScript();
        }

        return () => {
            removeNeynarScript();
        };
    }, [isLoggedIn]);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    
        if (token) {
            axios.get(`${process.env.REACT_APP_BASE_URL}/api/user/`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(response => {
                setUser(response.data);
            }).catch(error => {
                console.error('Error fetching user details:', error);
                if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                    localStorage.removeItem('token');
                    setIsLoggedIn(false);
                    setUser(null);
                }
            });
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUser(null);
    };

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

    useEffect(() => {
        // Function to check if the user has a store
        const checkStoreExistence = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }
    
            try {
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/merchant/check-merchant-status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
    
                const hasStore = response.data.hasStore;
                setHasStore(hasStore);
                // Check if there are any stores and set storeAdmin of the first store
                if (response.data.stores && response.data.stores.length > 0) {
                    setStoreData(prevState => ({ ...prevState, storeAdmin: response.data.stores[0].storeAdmin }));
                } else {
                    // Handle the case where there are no stores, optionally clearing or setting default values
                    setStoreData(prevState => ({ ...prevState, storeAdmin: '' }));
                }
                setStores(response.data.stores);
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    console.error('Error checking merchant status:', error.response?.data?.message || 'An unknown error occurred');
                } else {
                    console.error('Error checking merchant status:', 'An unknown error occurred');
                }
            }
        };
    
        checkStoreExistence();
    }, [navigate]);

    const resetForm = () => {
        setProductData({
            title: '',
            description: '',
            image: '',
            url: '',
            price: ''
        });
        setSelectedProductForEdit(null); // Clear the selected product for editing
        setIsEditMode(false);
        setErrorMessage('');
        setConfirmationMessage('');
        setDeletionConfirmationMessage('');
        setDeletionErrorMessage('');
        };

    const [productData, setProductData] = useState<ProductData>({
        title: '',
        description: '',
        image: '',
        url: '',
        price: ''
    });

    const [storeData, setStoreData] = useState({
        image: '',
        storeName: '',
        storeDescription: '',
        storeAdmin: ''
    });
    const [hasStore, setHasStore] = useState(false);

    const handleStoreChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setStoreData({ ...storeData, [e.target.name]: e.target.value });
    };

    const handleCreateStoreSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/store/create`, storeData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.data.store) {
                setHasStore(true);
            } else {
                throw new Error("Store creation failed");
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response) {
                const message = error.response.data.message || error.response.data.error || 'An unknown error occurred';
                console.error('Error creating the store:', message);
            } else {
                console.error('Error creating the store:', 'An unknown error occurred');
            }
        }
    };

    const { title, description, image, url, price } = productData;

    const [products, setProducts] = useState<Product[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [deletionErrorMessage, setDeletionErrorMessage] = useState('');
    const [deletionConfirmationMessage, setDeletionConfirmationMessage] = useState('');


    useEffect(() => {
        // Grab products to display on page
        const fetchProducts = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error("No token found");
                }
                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/products`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setProducts(response.data);
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
                    console.error('Error fetching products:', err);
                }
            }
        };
        fetchProducts();

        // Function to check if the user already has a pageId and pageHtml
        const checkPageGenerationStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error("No token found");

                const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/merchant/check-page-status`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Example response structure: { hasPage: true, pageId: "uniqueId" }
                if (response.data.hasPage) {
                    setIsPageGenerated(true);
                    setShareableUrl(`${process.env.REACT_APP_BASE_URL}/product-page/${response.data.pageId}`);
                }
            } catch (err) {
                console.error('Error checking page generation status:', err);
            }
        };
        checkPageGenerationStatus();
    }, []);

    const [shareableUrl, setShareableUrl] = useState('');
    const [isPageGenerated, setIsPageGenerated] = useState(false);

    // Function to fetch the pageId and generate the shareable URL
    const fetchPageIdAndGenerateUrl = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setErrorMessage("Your session has expired. Please capture any content you need and log in again.");
            return;
        }
    
        try {
            await axios.post(`${process.env.REACT_APP_BASE_URL}/api/store/update`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
    
            const pageIdResponse = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/merchant/get-page-id`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const pageId = pageIdResponse.data.pageId;
            setShareableUrl(`${process.env.REACT_APP_BASE_URL}/product-page/${pageId}`);
            setIsPageGenerated(true);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const message = err.response?.data?.message || "An error occurred.";
                console.error(message);
                setErrorMessage("An error occurred. Please refresh and try again. If the issue persists, feel free to DM me on Warpcast @manuelmaccou.");
            } else {
                console.error('Error occurred while generating the frame:', err);
                setErrorMessage("An error occurred. Please refresh and try again. If the issue persists, feel free to DM me on Warpcast @manuelmaccou.");
            }
        }
    }, []);

    // States and functions from DeleteProducts
    const [isEditMode, setIsEditMode] = useState(false);    

    const toggleEditMode = () => {
    if (isEditMode) {
            resetForm();
        }
        setIsEditMode(!isEditMode);
    };

    const handleProductSelect = (productId: string) => {
        const productToEdit = products.find(product => product._id === productId);
        if (productToEdit) {
            setProductData({
                title: productToEdit.title,
                description: productToEdit.description,
                image: productToEdit.image,
                url: productToEdit.url,
                price: productToEdit.price
            });
            setSelectedProductForEdit(productToEdit);
            setIsEditMode(true);
        }
    };

    const deleteSelectedProduct = async () => {
        if (selectedProductForEdit && window.confirm("Are you sure you want to delete this product?")) {
            try {
                const response = await axios.delete(`${process.env.REACT_APP_BASE_URL}/api/products/delete/${selectedProductForEdit._id}`, 
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    
                if (response.status === 200) {
                    setDeletionConfirmationMessage("Product successfully deleted.");
                    // Filter out the deleted product from the products list
                    setProducts(products.filter(product => product._id !== selectedProductForEdit._id));
                    resetForm(); // Reset form and clear selectedProductForEdit
                } else {
                    throw new Error("Deletion was not successful. Please refresh the page and try again.");
                }
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    const message = error.response?.data?.message || "An error occurred.";
                    console.error('Error deleting product:', message);
                    setDeletionErrorMessage("Failed to delete the product. Please try again later.");
                } else {
                    console.error('Error deleting product:', error);
                    setDeletionErrorMessage("Failed to delete the product. Please try again later.");
                }
            }
        }
    };

    const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setProductData({ ...productData, [e.target.name]: e.target.value });

        const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setErrorMessage('');
            setConfirmationMessage('');
            setDeletionConfirmationMessage('');
            setDeletionErrorMessage('');
            const token = localStorage.getItem('token');

            if (!token) {
                setErrorMessage("You are not logged in. Please log in to submit a product.");
                return;
            }

            const decodedToken = parseJwt(token);
            const userId = decodedToken?.userId;


            try {
                const updatedURL = appendUTMParameters(productData.url);
                if (selectedProductForEdit) {

                    // Update product
                    const productUpdateData = {
                        ...productData,
                        url: updatedURL,
                    };

                    const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/api/products/update/${selectedProductForEdit._id}`, 
                        productUpdateData,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const updatedProduct = response.data;
                    setProducts(products.map(p => p._id.toString() === updatedProduct._id ? updatedProduct : p));
                    setSelectedProductForEdit(null); // Reset selected product after update
                    resetForm();
                    setConfirmationMessage('Product successfully updated!');
                } else {

                    // Add new product
                    const productWithUser = {
                        ...productData,
                        url: updatedURL,
                        user: userId,
                    };

                    const response = await axios.post(
                        `${process.env.REACT_APP_BASE_URL}/api/products/add`, 
                        productWithUser,
                        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                    );

                    setConfirmationMessage('Product successfully added!');
                    setProducts([...products, response.data]);
                    resetForm();
                }
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const message = err.response?.data?.message || "An error occurred.";
                    if (err.response?.status === 400) {
                        setErrorMessage("Failed to submit product. Please check your input URLs and try again.");
                    } else if (err.response?.status === 401) {
                        setErrorMessage("Your session has expired. Please capture any content you need and log in again.");
                    } else {
                        console.error('Error during product submission:', message);
                        setErrorMessage("Failed to submit product. Please check your input URLs and try again.");
                    }
                } else {
                    console.error('Error during product submission:', err);
                    setErrorMessage("An unexpected error occurred. Please refresh the page and try again. If the issue persists, feel free to DM on Warpcast @manuelmaccou.");
                }
            }
        };

        const onSignInSuccess = async (data: any) => {
            console.log("Sign-in success with data:", data);
            
            try {
                const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/api/user/farcaster_login`, {
                    signer_uuid: data.signer_uuid,
                    fid: data.fid
                });
    
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
    
                    if (response.data.isAdmin !== undefined) {
                        localStorage.setItem('isAdmin', JSON.stringify(response.data.isAdmin));
                        console.log("isAdmin:", response.data.isAdmin);
                    }
                    const redirectUrl = response.data.redirect;
                    window.location.reload();
                    navigate(redirectUrl);
                } else {
                    setErrorMessage("Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast");
                }
            } catch (error: unknown) {
                console.error("Error during Farcaster login:", error);
                if (axios.isAxiosError(error)) { 
                    const axiosError = error as AxiosError;
                    if (axiosError.response && axiosError.response.status === 404) {
                        setErrorMessage("Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast");
                    } else {
                        setErrorMessage("An error occurred during the sign-in process.");
                    }
                } else {
                    setErrorMessage("An unexpected error occurred.");
                }
            }
        };
    
        React.useEffect(() => {
            (window as any).onSignInSuccess = onSignInSuccess;
            return () => {
                delete (window as any).onSignInSuccess;
            };
        }, [navigate]);

        if (!isLoggedIn) {
            return (
              <div className='main-container'>
                <header className="site-header">
                  <h1>Gogh</h1>
                  <div className="neynar_signin" data-client_id={process.env.REACT_APP_NEYNAR_CLIENT_ID} data-success-callback="onSignInSuccess" data-variant="warpcast"></div>
                </header>
                <div className="login-message">
                  <p>You must be logged in to access this page.</p>
                </div>
              </div>
            );
          }

        return (
            <div>
                <div>
                    <header className="site-header">
                        <h1>Gogh</h1>
                        {!user ? (
                            <div className="neynar_signin" data-client_id={process.env.REACT_APP_NEYNAR_CLIENT_ID} data-success-callback="onSignInSuccess" data-variant="warpcast"></div>
                        ) : (
                            <>
                                <div className="fc-user-tag">
                                    <img src={user.fc_pfp} alt="User profile" className="fc-pfp" />
                                    <p>{user.fc_username}</p>
                                </div>
                                <button onClick={logout} className="logout-button">Logout</button>
                            </>
                        )}
                    </header>
                </div>
                {!hasStore ? (
                    <div className="create-store-container">
                        <div className="create-store-box">
                            <h2>Create Your Store</h2>
                            <form onSubmit={handleCreateStoreSubmit}>
                                <div className="form-group">
                                    <label htmlFor="storeName">Store Name</label>
                                    <input 
                                        type="text"
                                        name="storeName" 
                                        value={storeData.storeName} 
                                        onChange={handleStoreChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="storeDescription">Store description</label>
                                    <textarea 
                                        name="storeDescription" 
                                        value={storeData.storeDescription} 
                                        onChange={handleStoreChange} 
                                        required
                                        maxLength={300}
                                    />
                                    <span className="field-hint">Max 300 characters</span>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="image">Storefront image</label>
                                    <input 
                                        type="text"
                                        name="image" 
                                        value={storeData.image} 
                                        onChange={handleStoreChange}
                                        required
                                    />
                                    <span className="field-hint">Image or .gif</span>
                                    <span className="field-hint">Ideal aspect ratio: 1.91:1</span>
                                </div>
                                <button type="submit">Create Store</button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="submit-product-container">
                        <div className="product-form-section">
                            <div className="product-form-box">
                                <h2>{selectedProductForEdit ? 'Edit Product' : 'Submit New Product'}</h2>
                                <form onSubmit={onSubmit} className="product-form">

                                    <div className="form-group">
                                        <label htmlFor="title">Product title:</label>
                                        <input 
                                            type="text"
                                            name="title" 
                                            value={title} 
                                            onChange={onChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="description">Description:</label>
                                        <Editor
                                            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                            value={productData.description}
                                            onEditorChange={handleEditorChange}
                                            init={{
                                                height: 300,
                                                menubar: false,
                                                plugins: [
                                                    'lists'
                                                  ],
                                                toolbar: 'bullist',
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
                                    <div className="form-group">
                                        <label htmlFor="image">Image URL:</label>
                                        <input 
                                            type="text" 
                                            name="image" 
                                            value={image} 
                                            onChange={onChange}
                                        />
                                        <span className="field-hint">Portrait or square works best.</span>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="url">Product URL:</label>
                                        <input 
                                            type="text" 
                                            name="url" 
                                            value={url} 
                                            onChange={onChange} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="price">Price:</label>
                                        <input 
                                            type="text"
                                            name="price" 
                                            value={price} 
                                            onChange={onChange}
                                        />
                                    </div>
                                    <button type="submit">{selectedProductForEdit ? 'Update Product' : 'Add Product'}</button>
                                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                                </form>
                                {confirmationMessage && <div className="confirmation-message">{confirmationMessage}</div>}
                        

                                {/* Conditionally display the shareable URL section */}
                                {isPageGenerated && shareableUrl && (
                                    <div className="shareable-url-section">
                                        <h3>Frame URL</h3>
                                        <p>Your showcase is ready! Post this URL on Farcaster:</p>
                                        <input type="text" value={shareableUrl} readOnly />
                                        <button onClick={() => navigator.clipboard.writeText(shareableUrl)}>Copy URL</button>
                                    </div>
                                )}

                                {/* Display the 'Generate Product Frame' button only if the page has not been generated */}
                                {!isPageGenerated && (
                                    <div className="shareable-url-section">
                                        <p>Once you submit all of your poducts, click the button below to generate your frame showcasing your products.</p>
                                        <div className="generate-button-container">
                                            <button onClick={fetchPageIdAndGenerateUrl} type="submit">Generate Product Frame</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='store-section'>
                            <h2>Store Preview</h2>
                            <p>This is a preview of the first frame people will see when they find your store. It's set to landscape 1.91:1 by default. Message me if you need square 1:1.</p>
                            <div className='frame-preview'>
                            {stores.map((store) => (
                                        <div 
                                            className="store-card"
                                            key={store._id}
                                        >
                                            {store.image && <img src={store.image} alt={store.storeName} className="store-image"/>}
                                        </div>
                                    ))}
                                    <div className='frame-button'>
                                        <p>Start Shopping</p>
                                    </div>
                                </div>
                            <div className={`products-section ${isEditMode ? 'edit-mode' : ''}`}>
                                <h2>{isEditMode ? 'Select products to delete or edit' : ''}</h2>
                                    <div className="deletion-buttons">
                                    {products.length > 0 && (
                                        <>
                                            <button className="edit-button" onClick={toggleEditMode}>{isEditMode ? 'Cancel' : 'Edit Products'}</button>
                                            {isEditMode && selectedProductForEdit && (
                                                <button className="delete-button" onClick={deleteSelectedProduct}>Delete Selected</button>
                                            )}
                                        </>
                                    )}
                                    {deletionConfirmationMessage && <div className="confirmation-message">{deletionConfirmationMessage}</div>}
                                    {deletionErrorMessage && <div className="confirmation-message">{deletionErrorMessage}</div>}
                                </div>
                                {products.map(product => (
                                    <div 
                                    className={`product-card ${isEditMode && selectedProductForEdit && selectedProductForEdit._id === product._id ? 'selected' : 'deselected'}`}
                                        key={product._id}
                                        onClick={() => isEditMode && handleProductSelect(product._id)}
                                    >
                                        <div className='product-preview-card'>
                                            {product.productFrame && <img src={product.productFrame} alt={product.title} className="product-frame"/>}
                                        </div>

                                        <div className='description-preview-card'>
                                            {product.descriptionFrame && <img src={product.descriptionFrame} alt={product.description} className="description-frame"/>}
                                        </div>

                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
    
export default ManageStore;