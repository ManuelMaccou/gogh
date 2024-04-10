import { ethers } from "ethers";
import GOGH_ABI from "./goghAbi.json";

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

// refactor later
export const deleteEscrow = async (obj: {
  contract: ethers.Contract;
  escrowId: string;
}) => {
  const releaseTx = await obj.contract.cancelEscrow(obj.escrowId);
  await releaseTx.wait();

  let escrow = await obj.contract.getEscrowDetails(
    ethers.getAddress(obj.escrowId)
  );
  let escrowData = toEscrow(escrow);
  return escrowData;
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