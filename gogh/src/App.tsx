import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/userContext';
import HomePage from './pages/home';
import ManageStore from './pages/manageStore';
import ManageShopifyStore from './pages/shopify/manageStore'

const App: React.FC = () => {

    return (
            <div>
                <HelmetProvider>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/manage-store" element={<ManageStore />} />
                            <Route path="/manage-shopify-store" element={<UserProvider><ManageShopifyStore /></UserProvider>} />
                        </Routes>
                </HelmetProvider>
            </div>
    );
};

export default App;
