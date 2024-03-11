// https://gogh.shopping/api/marketplace/frame/send_transaction/65e8789f156969abddbbcf88

import { Router } from 'express';
const router = Router();
import Product from '../../../models/marketplace/product.js';
import Web3 from 'web3';
import fetchEthPriceInUSDC from '../../../utils/crypto/fetchCryptoPrices.js'
import validateMessage from '../../../utils/validateFrameMessage.js'
import { Button, Frog } from 'frog'

export const app = new Frog()


const web3 = new Web3(`https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

const cryptoConversions = async (usdcAmount) => {
  console.log('usdc Amaount:', usdcAmount);

  const ethPriceInUSDC = await fetchEthPriceInUSDC(); // Fetch the current ETH price in USDC
  console.log('ethPriceUSDC:', ethPriceInUSDC)
  console.log('usdc Amaount:', usdcAmount);

  const ethEquivalent = Number(usdcAmount) / Number(ethPriceInUSDC);
  console.log('eth Equivalent:', ethEquivalent);

  const weiEquivalent = web3.utils.toWei(ethEquivalent.toString(), 'ether');
  console.log('wei Equivalent:', weiEquivalent);

  return weiEquivalent;
};

app.frame('/:productId', async (c) => {
  const { productId } = c.req.param();
  const requestBody = await c.req.json();

  const isProduction = process.env.NODE_ENV === 'production';
  let buttonIndex, fid;

  if (isProduction) {
    try {
        const messageBytes = requestBody.trustedData.messageBytes;
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
    buttonIndex = requestBody.untrustedData.buttonIndex;
    fid = requestBody.untrustedData.fid;
}

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found.');
    }

    const sanitizedPrice = product.price.replace(/[^0-9.]/g, '');
    const weiEquivalent = await cryptoConversions(sanitizedPrice);

    return c.send({
      chainId: "eip155:8453", // Base
      to: "0x4A6737Da9668D09aCE702c3ff5e0dA33a84d28F7",
      value: weiEquivalent.toString(), // Use the converted value
    });

  } catch (err) {
    console.error('Error in POST /send_transaction/:productId', err);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
