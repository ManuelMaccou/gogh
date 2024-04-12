import { Router } from 'express';
import MarketplaceTransaction from '../../models/marketplace/transaction.js';

const router = Router();

router.post('/save', async (req, res) => {
    try {
        const { buyerFid, sellerFid, sellerProfile, sellerUsername, transactionHash, source } = req.body;

        // Create a new transaction instance
        const newTransaction = new MarketplaceTransaction({
            buyerFid,
            sellerFid,
            sellerProfile,
            sellerUsername,
            transactionHash,
            source,
        });

        // Save the transaction to the database
        await newTransaction.save();

        res.status(201).send({ message: 'Transaction saved successfully', newTransaction });
    } catch (error) {
        console.error('Failed to save transaction:', error);
        res.status(400).send({ error: error.message });
    }
});

router.get('/:transactionHash', async (req, res) => {
    const { transactionHash } = req.params;
    
    try {
        const transaction = await MarketplaceTransaction.findOne({ transactionHash: transactionHash });
        
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Failed to fetch transaction:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.put("/:transactionHash", async (req, res) => {
  const { transactionHash } = req.params;
  const {ownerSignature,recipientSignature,metadata} = req.body;

  try {
    const transaction = await MarketplaceTransaction.findOne({
      transactionHash: transactionHash,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    if(ownerSignature){
      transaction.ownerSignature = ownerSignature
    }
    if(recipientSignature){
      transaction.recipientSignature = recipientSignature
    }
    if(metadata && isObject(metadata)) {
    transaction.metadata = {...metadata}
    }

    await transaction.save()

    res.json(transaction);
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
