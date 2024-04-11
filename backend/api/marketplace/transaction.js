import { Router } from "express";
import auth from '../../middleware/auth.js';
import User from "../../models/user.js";
import MarketplaceTransaction from "../../models/marketplace/transaction.js";
import { isObject } from "../../utils/misc.js";

const router = Router();

router.post("/save", auth, async (req, res) => {

  let buyer;
  let newTransaction;
  let userUpdated = false;

  try {
    const { marketplaceProductId, sellerId, buyerFid, sellerFid, sellerProfile, sellerUsername, transactionHash, source, metadata, uid, escrowId, } = req.body;

    buyer = await User.findOne({ privyId: req.user });

    if (!buyer) {
      return res.status(404).send({ message: "Buyer not found." });
    }

    // Create a new transaction record
    newTransaction = new MarketplaceTransaction({
      marketplaceProduct: marketplaceProductId,
      buyer: buyer._id,
      seller: sellerId,
      buyerFid, sellerFid, sellerProfile, sellerUsername, transactionHash, source, metadata, uid, escrowId,
    });

    await newTransaction.save();

    buyer.marketplaceProductPurchases.push(newTransaction._id);
    await buyer.save();
    userUpdated = true; // Update was successful
  } catch (error) {
    console.error("Failed to save transaction or update user:", error);
  }

  // Send a single response indicating the outcome
  res.status(201).send({ 
      message: userUpdated ? "Transaction saved and user updated successfully" : "Transaction saved but failed to update user.", 
      transactionId: newTransaction ? newTransaction._id : null,
      userUpdated: userUpdated
  });
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
