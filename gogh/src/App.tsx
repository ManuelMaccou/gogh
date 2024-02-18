import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes } from 'react-router-dom';
import NavigationWrapper from './navigationWrapper';
import HomePage from './pages/home';
import ManageStore from './pages/manageStore';

const App: React.FC = () => {

    return (
            <div>
                <HelmetProvider>
                    <NavigationWrapper />
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/manage-store" element={<ManageStore />} />
                        </Routes>
                </HelmetProvider>
            </div>
    );
};

export default App;
