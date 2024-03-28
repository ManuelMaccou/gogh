// https://gogh.shopping/api/marketplace/frame/send_transaction/65e8789f156969abddbbcf88

import { Router } from 'express';
import Product from '../../../models/marketplace/product.js';
import Web3 from 'web3';
import { usdcToWei } from '../../../utils/crypto/cryptoConversions.js'
import validateMessage from '../../../utils/validateFrameMessage.js'

const router = Router();

const web3 = new Web3(process.env.ALCHEMY_API_URL);

let buttonIndex, fid;

router.post('/:productId', async (req, res) => {
  const { productId } = req.params;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    try {
        const messageBytes = req.body.trustedData.messageBytes;
        const validatedFrameData = await validateMessage(messageBytes);

        buttonIndex = validatedFrameData.action?.tapped_button?.index;
        fid = validatedFrameData.action?.interactor?.fid;
    } catch (error) {
        console.error('Error validating message:', error);
        return res.status(500).send('An error occurred during message validation.');
    }
  } else {
    buttonIndex = req.body.untrustedData.buttonIndex;
    fid = req.body.untrustedData.fid;
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found.');
    }

    const sanitizedPrice = product.price.replace(/[^0-9.]/g, '');
    const weiEquivalent = await usdcToWei(sanitizedPrice);

    if (product.walletAddress) {
    const response = {
      chainId: "eip155:8453", // Base
      method: "eth_sendTransaction",
      params: {
        to: product.walletAddress, 
        value: weiEquivalent,
      },
    };
    res.status(200).json(response);
  }

  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

export default router;
