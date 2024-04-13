import { JsonRpcSigner, ethers } from "ethers";
import GOGH_ABI from "./goghAbi.json";
import axios from "axios";
import { Web3BaseProvider } from "web3";

export const GOGH_CONTRACT_ADDRESS =
  "0x3c1A0A632B516cedFFEd053DFE18775D47d4B32c";

export const getGoghContract = (signer: any) => {
  const contract = new ethers.Contract(GOGH_CONTRACT_ADDRESS, GOGH_ABI, signer);
  return contract;
};

export const createEscrow = async (obj: {
  contract: ethers.Contract;
  uid: string | number;
  recipientAddress: string;
  tokenAddress: string;
  amount: number | string;
}) => {
  const createTx = await obj.contract.createEscrow(
    obj.uid,
    obj.recipientAddress,
    obj.tokenAddress,
    obj.amount,
    {
      value: obj.amount,
    }
  );

  return createTx;
};
export const releaseEscrow = async (obj: {
  transaction: Transaction;
  signer: JsonRpcSigner;
  contract: ethers.Contract;
  accessToken: string;
  provider: Web3BaseProvider;
}) => {
  let escrow = await obj.contract.getEscrowDetails(
    obj?.transaction?.metadata?.escrowId
  );
  let escrowData = toEscrow(escrow);
  if (escrowData.canceled || escrowData.released) {
    throw new Error("Invalid action");
  }
  const address = await obj.signer.getAddress();
  const messageSignerAddress = address.toLowerCase().trim();
  const owner = escrowData.owner.toLowerCase().trim();
  const recipient = escrowData.recipient.toLowerCase().trim();
  if (![owner, recipient].includes(messageSignerAddress)) {
    throw new Error("Unauthorized");
  }
  const coder = new ethers.AbiCoder();
  const payload = coder.encode(
    ["address", "address", "uint256", "address", "address"],
    [
      escrowData.escrowId,
      escrowData.token,
      escrowData.amount,
      escrowData.recipient,
      escrowData.owner,
    ]
  );
  const escrowMessageHash = ethers.keccak256(payload);
  const messageHashBinary = ethers.getBytes(escrowMessageHash);

  let transactionObj: Partial<Transaction> = {};

  const signedMessage = await obj.signer.signMessage(messageHashBinary);

  if (owner === messageSignerAddress) {
    transactionObj.ownerSignature = signedMessage;
  }
  if (recipient === messageSignerAddress) {
    transactionObj.recipientSignature = signedMessage;
  }
  // upload to DB
  const { data: transaction } = (await axios.put(
    `${process.env.REACT_APP_BASE_URL}/api/transaction/${obj.transaction.transactionHash}`,
    transactionObj,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obj.accessToken}`,
      },
    }
  )) as { data: Transaction };
  if (
    !transaction.ownerSignature ||
    !transaction.recipientSignature ||
    owner !== messageSignerAddress
  ) {
    return { success: true, completeEscrow: false, transaction };
  }
  const releaseTx = await obj.contract.releaseEscrow(
    obj.transaction.metadata.escrowId,
    transaction.ownerSignature,
    transaction.recipientSignature
  );
  return new Promise(async (resolve: Function, reject) => {
    try {
      obj.provider.once(releaseTx.hash, async () => {
        try {
          const { data: transaction } = await axios.put(
            `${process.env.REACT_APP_BASE_URL}/api/transaction/${obj.transaction.transactionHash}`,
            { metadata: { ...obj.transaction.metadata, released: true } },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${obj.accessToken}`,
              },
            }
          );
          resolve({
            success: true,
            completeEscrow: true,
            transaction,
            hash: releaseTx.hash,
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};
interface Transaction {
  metadata: Escrow ;
  ownerSignature: string;
  recipientSignature: string;
  uid: string;
  escrowId: string;
  buyer: string;
  seller: string;
  buyerFid: string;
  sellerFid: string;
  sellerProfile: string;
  sellerUsername: string;
  transactionHash:string;
  source:string;
  marketplaceProduct: string;
}

// refactor later
export const cancelEscrow = async (obj: {
  transaction: Transaction;
  signer: JsonRpcSigner;
  contract: ethers.Contract;
  accessToken: string;
  provider: Web3BaseProvider;
}) => {
  const releaseTx = await obj.contract.cancelEscrow(obj.transaction.metadata.escrowId);

  return new Promise(async (resolve: Function, reject) => {
    try {
      obj.provider.once(releaseTx.hash, async () => {
        try {
          const { data: transaction } = await axios.put(
            `${process.env.REACT_APP_BASE_URL}/api/transaction/${obj.transaction.transactionHash}`,
            { metadata: { ...obj.transaction.metadata, canceled: true } },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${obj.accessToken}`,
              },
            }
          );
          resolve({
            success: true,
            canceledEscrow: true,
            transaction,
            hash: releaseTx.hash,
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

interface Escrow {
  uid: number;
  escrowId: string;
  token: string;
  amount: number;
  timestamp: number;
  recipient: string;
  owner: string;
  released: boolean;
  canceled: boolean;
}

export const toEscrow = (
  escrow: Array<number | string | boolean> = []
): Escrow => {
  return {
    uid: escrow[0] as number,
    escrowId: escrow[1] as string,
    token: escrow[2] as string,
    amount: escrow[3] as number,
    timestamp: escrow[4] as number,
    recipient: escrow[5] as string,
    owner: escrow[6] as string,
    released: escrow[7] as boolean,
    canceled: escrow[8] as boolean,
  };
};