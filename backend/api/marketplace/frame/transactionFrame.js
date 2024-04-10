// https://www.gogh.shopping/marketplace/frame/share/product/65eca10b7b4b2e08f18c89e9

import { Router } from 'express';
import sgMail from '@sendgrid/mail';
import { body, validationResult } from 'express-validator';
import privy from '../../../services/privyClient.js';
import fetch from 'node-fetch';
import MarketplaceProduct from '../../../models/marketplace/product.js';
import MarketplaceTransaction from '../../../models/marketplace/transaction.js';
import validateMessage from '../../../utils/validateFrameMessage.js';
import User from '../../../models/user.js'

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = Router();

const faqFrames = [
    'https://www.gogh.shopping/images/6605dbd325a16d8321422fca.jpg',
    'https://www.gogh.shopping/images/6605dc103e1ccaa89f40d4fb.jpg',
    'https://www.gogh.shopping/images/6605dc3c156ec6557c812e40.jpg',
];

router.get('/product/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const product = await MarketplaceProduct.findOne({ _id: productId });
        if (!product) {
            return res.status(404).send('Product not found during transactionFrame route');
        }

        const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh">
            <meta property="og:url" content="https://">
            <meta property="og:image" content="${product.productFrame}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/frame/share/product/${product._id}?frameType=initial" />
            <meta property="fc:frame:image" content="${product.productFrame}">
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:input:text" content="Enter email for receipt" />
            <meta property="fc:frame:button:1" content="View online" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:2" content="Buy now" />
            <meta property="fc:frame:button:2:action" content="tx" />
            <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/api/marketplace/frame/send_transaction/${product._id}" />
            <meta property="fc:frame:button:3" content="Create listing" />
            <meta property="fc:frame:button:3:action" content="link" />
            <meta property="fc:frame:button:3:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:4" content="FAQ" />
        </head>
    </html>
    `;

        res.status(200).send(htmlResponse);

    } catch (error) {
        console.error('Failed to share product:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});


router.post('/product/:productId', async (req, res) => {
    const { productId } = req.params;
    let buyerEmail; 

    const isProduction = process.env.NODE_ENV === 'production';
    const totalFaqs = faqFrames.length;

    let frameType = req.query.frameType;
    let status = req.query.status;
    let faqIndex = parseInt(req.query.index) || 0;
    let buttonIndex, fid;
    let transactionHash;

    if (isProduction) {
        
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);

            transactionHash = validatedFrameData.action?.transaction?.hash
            console.log("transaction hash:", transactionHash);

            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            fid = validatedFrameData.action?.interactor?.fid;
            buyerEmail = validatedFrameData.action?.input?.text;

        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        buttonIndex = req.body.untrustedData.buttonIndex;
        fid = req.body.untrustedData.fid;
        buyerEmail = req.body.untrustedData.inputText;

        console.log('buyer email:', buyerEmail);
    }
    const shouldValidateEmail = req.body.transactionHash && req.query.frameType === 'buy' && req.query.status === 'success';
    if (shouldValidateEmail && buyerEmail) {

        await body('buyerEmail').isEmail().normalizeEmail().run(req);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
    }

    try {
        const product = await MarketplaceProduct.findOne({ _id: productId });
        const user = await User.findOne({ _id: product.user});
        if (!product) {
            return res.status(404).send('Product not found during transactionFrame route');
        }

        // Send emails and save transaction
        if (transactionHash) {
            try {
                const options = {
                    method: 'GET',
                    headers: { accept: 'application/json', api_key: process.env.NEYNAR_API_KEY }
                };

                console.log('Gethering Neynar data');
                const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, options);
                const data = await response.json();

                const username = data.users[0].username;
                const displayName = data.users[0].display_name;
                const ethAddress = data.users[0].verified_addresses.eth_addresses[0] || data.users[0].custody_address;
                console.log(`Username: ${username}, Display Name: ${displayName}`);

                const buyerProfileUrl = `https://warpcast.com/${username}`
                let productBuyer;

                try {
                    const existingUser = await User.findOne({ fid: fid });
                    if (existingUser) {
                        console.log('User already exists in the database. Skipping creation.');
                        productBuyer = existingUser;

                    } else {
                        const newPrivyUser = await privy.importUser({
                            linkedAccounts: [
                                {
                                    type: 'farcaster',
                                    fid: fid,
                                    username: username,
                                    display_name: displayName,
                                    owner_address: ethAddress,
                                },
                            ]
                        });
                        console.log('Privy user created:', newPrivyUser);
                
                        const newAppUser = new User({
                            privyId: newPrivyUser.id,
                            fid: fid,
                        });

                        await newAppUser.save();
                        productBuyer = newAppUser;
                        console.log('New user saved successfully in the app database.');
                    }
                } catch (error) {
                    console.error('Error checking for existing user or creating new user:', error);
                    return res.status(500).json({ message: 'An error occurred during user processing.' });
                }

                let emailSendingResults = [];
                console.log('buyer email:', buyerEmail);

                if (buyerEmail) {
                    const msgBuyer = {
                        to: buyerEmail,
                        from: 'admin@gogh.shopping',
                        templateId: 'd-9151a338b3ad47ea885140aaf52fc9a3',
                        dynamicTemplateData: {
                            transaction_hash: transactionHash,
                        },
                        cc: [{ email: 'manuel@gogh.shopping' }],
                    };
                    emailSendingResults.push(sgMail.send(msgBuyer));
                }

                if (product.email) {
                    const msgSeller = {
                        to: product.email,
                        from: 'admin@gogh.shopping',
                        templateId: 'd-48d7775469174e7092913745a9b7e307',
                        dynamicTemplateData: {
                            product_name: product.title,
                            product_price: product.price,
                            transaction_hash: transactionHash,
                            buyer_username: displayName,
                            buyer_profile_url: buyerProfileUrl,

                        },
                        cc: [{ email: 'manuel@gogh.shopping' }],
                    };
                    emailSendingResults.push(sgMail.send(msgSeller));
                }
                await Promise.all(emailSendingResults);
                console.log('Transaction completed and emails sent.');
            
            } catch (error) {
                console.error('Error sending emails:', error);
                res.status(500).json({ message: 'An error occurred while sending emails.' });
            }

            try {
            const buyerFid = fid;
            const sellerFid = user.fid;
            const newTransaction = new MarketplaceTransaction({
                buyer: productBuyer,
                seller: user,
                buyerFid: buyerFid,
                sellerFid: sellerFid,
                transactionHash: transactionHash,
                source: "Farcaster frame",
            });

            await newTransaction.save(); 

        } catch (error) {
            console.error('Error saving transaction:', error);
            res.status(500).json({ message: 'An error occurred while the transaction.' });
        }
    }

        if (frameType === 'initial') {
            if (buttonIndex === 4) { // faq
                frameType = "faq";
            }

        } else if (frameType === "faq") {
            if (buttonIndex === 1) { // prev
                faqIndex = (faqIndex - 1 + totalFaqs) % totalFaqs;

            } else if (buttonIndex === 2) { // next
                faqIndex = (faqIndex + 1) % totalFaqs;
            } else if (buttonIndex === 3) { // back to listing
                frameType = "initial";
                faqIndex = 0;
            }

        } else if (transactionHash && frameType === 'buy' && !status) {
            status = "success"

            const buyerFid = fid;
            const sellerFid = user.fid;
            const newTransaction = new MarketplaceTransaction({
                buyerFid: buyerFid,
                sellerFid: sellerFid,
                transactionHash: transactionHash,
                source: "Farcaster frame",
                
            });

            await newTransaction.save();    
            
        } else if (!transactionHash && frameType === 'buy') {
            status = "fail";

        } else if (transactionHash && frameType === 'buy' && status === 'success') {
            console.log('starting email send condition');
            status = "success";
            try {
                const options = {
                    method: 'GET',
                    headers: { accept: 'application/json', api_key: process.env.NEYNAR_API_KEY }
                };

                console.log('Gethering Neynar data');
                const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, options);
                const data = await response.json();

                const username = data.users[0].username;
                const displayName = data.users[0].display_name;
                console.log(`Username: ${username}, Display Name: ${displayName}`);

                const buyerProfileUrl = `https://warpcast.com/${username}`

                let emailSendingResults = [];
                console.log('buyer email:', buyerEmail);

                if (buyerEmail) {
                    const msgBuyer = {
                        to: buyerEmail,
                        from: 'admin@gogh.shopping',
                        templateId: 'd-9151a338b3ad47ea885140aaf52fc9a3',
                        dynamicTemplateData: {
                            transaction_hash: transactionHash,
                        },
                    };
                    emailSendingResults.push(sgMail.send(msgBuyer));
                }

                if (product.email) {
                    const msgSeller = {
                        to: product.email,
                        from: 'admin@gogh.shopping',
                        templateId: 'd-48d7775469174e7092913745a9b7e307',
                        dynamicTemplateData: {
                            product_name: product.title,
                            product_price: product.price,
                            transaction_hash: transactionHash,
                            buyer_username: displayName,
                            buyer_profile_url: buyerProfileUrl,

                        },
                    };
                    emailSendingResults.push(sgMail.send(msgSeller));
                }
                await Promise.all(emailSendingResults);
                console.log('Transaction completed and emails sent.');

            } catch (error) {
                console.error('Error sending emails:', error);
                // Consider whether you want to return a different status code or message in case of email errors
                res.status(500).json({ message: 'An error occurred while sending emails.' });
            }
        }

        res.status(200).send(generateFrameHtml(product, frameType, faqIndex, status));

    } catch (error) {
        console.error('Failed to share product:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});

function generateFrameHtml(product, frameType, faqIndex, status) {
    const faqFrame = faqFrames[faqIndex % faqFrames.length];
    let buttonsHtml;

    if (frameType === 'faq') {
        buttonsHtml = `
            <meta property="og:image" content="${faqFrame}" />
            <meta property="fc:frame:image" content="${faqFrame}" />
            <meta property="fc:frame:button:1" content="⬅️ prev" />
            <meta property="fc:frame:button:2" content="next ➡️" />
            <meta property="fc:frame:button:3" content="return to listing" />
        `;
    } else if (frameType === 'buy') {
        if (status === 'success') {
        buttonsHtml = `
            <meta property="og:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204604757x897514662026309000/success_frame.jpg" />
            <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204604757x897514662026309000/success_frame.jpg" />
            <meta property="fc:frame:input:text" content="Enter email" />
            <meta property="fc:frame:button:1" content="Submit" />
        `;
        } else if (status === 'fail') {
            buttonsHtml = `
            <meta property="og:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710199426913x658328134602485600/transaction_failed.jpg" />
            <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710199426913x658328134602485600/transaction_failed.jpg" />
            <meta property="fc:frame:button:1" content="Try again" />
        `;
        }

    } else {
        buttonsHtml = `
            <meta property="og:image" content="${product.productFrame}" />
            <meta property="fc:frame:image" content="${product.productFrame}" />
            <meta property="fc:frame:input:text" content="Enter email for receipt" />
            <meta property="fc:frame:button:1" content="View online" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:2" content="Buy now" />
            <meta property="fc:frame:button:2:action" content="tx" />
            <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/api/marketplace/frame/send_transaction/${product._id}?frameType=buy" />
            <meta property="fc:frame:button:3" content="Create listing" />
            <meta property="fc:frame:button:3:action" content="link" />
            <meta property="fc:frame:button:3:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:4" content="FAQ" />
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh" />
            <meta property="og:url" content="https://www.gogh.shopping" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/frame/share/product/${product._id}?frameType=${frameType}&index=${faqIndex}&status=${status}" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            ${buttonsHtml}
        </head>
    </html>
    `;
}

export default router;