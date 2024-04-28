import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/userContext';
import ProtectedRoute from './protectedRoute';
import HomePage from './pages/home';
import ManageStore from './pages/manageStore';
import ManageShopifyStore from './pages/shopify/manageStore'
import Listing from './pages/marketplace/listing'
import Success from './pages/marketplace/success'
import AccountPageContainer from './pages/marketplace/account/accountPageContainer';
import CreateListing from './pages/marketplace/account/createListing';
import UserListings from './pages/marketplace/account/userListings';

const App: React.FC = () => {

    return (
            <div>
                <HelmetProvider>
                    <UserProvider>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/manage-store" element={<ManageStore />} />
                            <Route path="/manage-shopify-store" element={<ManageShopifyStore />} />
                            <Route path="/listing/:productId" element={<Listing />} />
                            <Route element={<ProtectedRoute />}>
                            <Route path="/success/:transactionHash" element={<Success />} />
                                <Route path="account" element={<AccountPageContainer />}>
                                    <Route index element={<CreateListing />} />
                                    <Route path="/account/create-listing" element={<CreateListing />} />
                                    <Route path="/account/listings" element={<UserListings />} />
                                    // Add other account-related routes here
                                </Route>
                            </Route>
                        </Routes>
                    </UserProvider>
                </HelmetProvider>
            </div>
    );
};

export default App;