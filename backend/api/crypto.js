import { Router } from 'express';
import auth from '../middleware/auth.js';
import Web3 from 'web3';
import { usdcToWei, usdcToWeiWithoutHex } from "../utils/crypto/cryptoConversions.js";

const router = Router();
const web3 = new Web3(process.env.ALCHEMY_API_URL);

router.post('/convert-usdc-to-wei', async (req, res) => {
    try {
        const { usdcAmount } = req.body;
        if (!usdcAmount) {
        return res.status(400).send('USDC amount is required.');
        }

        const hexWeiAmount = await usdcToWei(usdcAmount);
        if (!hexWeiAmount) {
        throw new Error('Conversion to Wei failed');
        }
        return res.json({ hexWeiAmount });
    } catch (error) {
        console.error('Error converting USDC to Wei:', error);
        return res.status(500).send('An error occurred during the conversion.');
    }
});

router.post("/convert-usdc-to-wei-without-hex", async (req, res) => {
  try {
    const { usdcAmount } = req.body;
    if (!usdcAmount) {
      return res.status(400).send("USDC amount is required.");
    }

    const weiAmount = await usdcToWeiWithoutHex(usdcAmount);
    if (!weiAmount) {
      throw new Error("Conversion to Wei failed");
    }
    return res.json({ weiAmount });
  } catch (error) {
    console.error("Error converting USDC to Wei:", error);
    return res.status(500).send("An error occurred during the conversion.");
  }
});

router.post('/verify-signature', auth, async (req, res) => {
    const { message, signature, address } = req.body;
  
    try {
      const recoveredAddress = web3.eth.accounts.recover(message, signature);
  
      // Check if the recovered address matches the provided address
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        res.json({ verified: true });
      } else {
        res.json({ verified: false, message: 'The signature could not be verified.' });
      }
    } catch (error) {
      console.error('Error verifying signature:', error);
      res.status(500).send('Internal server error during signature verification.');
    }
});

export default router;
