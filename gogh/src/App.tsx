import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/userContext';
import HomePage from './pages/home';
import ManageStore from './pages/manageStore';
import ManageShopifyStore from './pages/shopify/manageStore'
import Listing from './pages/marketplace/listing'
import Success from './pages/marketplace/success'
import PurchasesPage from './pages/profile/purchases'
import ListingsPage from './pages/profile/listings'

const App: React.FC = () => {

    return (
            <div>
                <HelmetProvider>
                    <UserProvider>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/profile/purchases" element={<PurchasesPage />} />
                            <Route path="/profile/listings" element={<ListingsPage />} />
                            <Route path="/manage-store" element={<ManageStore />} />
                            <Route path="/manage-shopify-store" element={<ManageShopifyStore />} />
                            <Route path="/listing/:productId" element={<Listing />} />
                            <Route path="/success/:transactionHash" element={<Success />} />
                        </Routes>
                    </UserProvider>
                </HelmetProvider>
            </div>
    );
};

export default App;
