import { Router } from 'express';
import auth from '../../middleware/auth.js';
import Web3 from 'web3';

const web3 = new Web3();

const router = Router();

router.post('/', auth, async (req, res) => {
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
