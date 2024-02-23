import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios, { AxiosError } from 'axios';
import '../../src/styles.css';

const HomePage = () => {
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState('');

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
                navigate(redirectUrl);
            } else {
                // Handle the case where there is no token in the response
                setErrorMessage("Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast");
            }
        } catch (error: unknown) {
            console.error("Error during Farcaster login:", error);
            if (axios.isAxiosError(error)) { // Type guard to narrow down to AxiosError
                const axiosError = error as AxiosError; // Now we know it's an AxiosError
                // Display a specific error message if the user does not exist
                if (axiosError.response && axiosError.response.status === 404) {
                    setErrorMessage("Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast");
                } else {
                    // Handle other types of Axios errors
                    setErrorMessage("An error occurred during the sign-in process.");
                }
            } else {
                // Handle non-Axios errors
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

    return (
        <div>
            <div className="homepage-container">
                <h1 className="title">Sell anything on Farcaster</h1>
                <p className="description">
                    Promote your NFTs, products, and services directly in the feed.
                </p>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <Helmet>
                <script src="https://neynarxyz.github.io/siwn/raw/1.0.0/index.js" async></script>
                </Helmet>
                <div
                    className="neynar_signin"
                    data-client_id={process.env.REACT_APP_NEYNAR_CLIENT_ID}
                    data-success-callback="onSignInSuccess"
                    data-variant="warpcast"
                ></div>
                <div className="image-container"></div>
            </div>
        </div>
    );
};

export default HomePage;
