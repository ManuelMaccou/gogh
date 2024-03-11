// https://gogh.shopping/api/marketplace/frame/send_transaction/65e8789f156969abddbbcf88

import { Router } from 'express';
const router = Router();
import Product from '../../../models/marketplace/product.js';
import Web3 from 'web3';
import fetchEthPriceInUSDC from '../../../utils/crypto/fetchCryptoPrices.js'
import validateMessage from '../../../utils/validateFrameMessage.js'

const web3 = new Web3(`https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

const cryptoConversions = async (usdcAmount) => {
  console.log('usdc Amaount:', usdcAmount);

  const ethPriceInUSDC = await fetchEthPriceInUSDC(); // Fetch the current ETH price in USDC
  console.log('ethPriceUSDC:', ethPriceInUSDC)
  console.log('usdc Amaount:', usdcAmount);

  const ethEquivalent = Number(usdcAmount) / Number(ethPriceInUSDC);
  console.log('eth Equivalent:', ethEquivalent);

  const ethEquivalentRounded = Number(ethEquivalent.toFixed(10));
  console.log('eth Equivalent rounded:', ethEquivalentRounded);

  const weiEquivalent = web3.utils.toWei(ethEquivalentRounded, 'ether');
  console.log('wei Equivalent:', weiEquivalent);

  return weiEquivalent;
};

router.post('/:productId', async (req, res) => {
  const { productId } = req.params;
  const isProduction = process.env.NODE_ENV === 'production';
  let buttonIndex, fid;

  if (isProduction) {
    try {
        const messageBytes = req.body.trustedData.messageBytes;
        const validatedFrameData = await validateMessage(messageBytes);
        // Extract data from the validatedFrameData for production
        buttonIndex = validatedFrameData.action?.tapped_button?.index;
        fid = validatedFrameData.action?.interactor?.fid;
    } catch (error) {
        console.error('Error validating message:', error);
        return res.status(500).send('An error occurred during message validation.');
    }
} else {
    // Directly use untrustedData in development, with a different data structure
    buttonIndex = req.body.untrustedData.buttonIndex;
    fid = req.body.untrustedData.fid;
}

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found.');
    }

    const sanitizedPrice = product.price.replace(/[^0-9.]/g, '');
    console.log('sanitized price:', sanitizedPrice)
    const weiEquivalent = await cryptoConversions(sanitizedPrice);

    console.log('wei amount sent to transaction request:', weiEquivalent)

    const response = {
      chainId: "eip155:8453", // Base
      method: "eth_sendTransaction",
      params: {
        to: "0x62f57efB1a37B93DbF56975fc6c9F2CD64BDd91c",
        value: weiEquivalent.toString(), // Use the converted value
        data: "" // Optional for ETH transfers
      },
    };

    res.status(200).json(response); // Send JSON response
  } catch (err) {
    console.error('Error in POST /send_transaction/:productId', err);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
