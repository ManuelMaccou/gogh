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
import ManageListing from './pages/marketplace/account/manageListing';
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
                                <Route path="/account" element={<AccountPageContainer />}>
                                    <Route index element={<UserListings />} />
                                    <Route path="create-listing" element={<ManageListing />} />
                                    <Route path="edit-listing/:listingId" element={<ManageListing mode="edit" />} />
                                    <Route path="listings" element={<UserListings />} />
                                </Route>
                            </Route>
                        </Routes>
                    </UserProvider>
                </HelmetProvider>
            </div>
    );
};

export default App;