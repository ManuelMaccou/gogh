import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';

const web3 = new Web3(process.env.ALCHEMY_API_URL);

async function fetchEthPriceInUSDC() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();

    return data.ethereum.usd; 
  } catch (error) {
    console.error('Error fetching the ETH price:', error);
    throw new Error('Failed to fetch ETH price in USDC');
  }
}

export const usdcToWei = async (usdcAmount) => {
  try {
    const amount = new BigNumber(usdcAmount);

    if (amount.isLessThanOrEqualTo(new BigNumber(0))) {
      throw new Error('Invalid USDC amount');
    }

    const ethPriceInUSDC = await fetchEthPriceInUSDC();
    const ethPriceInUSDCBN = new BigNumber(ethPriceInUSDC);

    if (ethPriceInUSDCBN.isLessThanOrEqualTo(new BigNumber(0))) {
      throw new Error('Invalid ETH price fetched');
    }

    const weiConversionFactor = new BigNumber(1e18);
    const rawWeiEquivalent = amount.multipliedBy(weiConversionFactor).dividedBy(ethPriceInUSDCBN);

    const roundedWeiEquivalent = rawWeiEquivalent.integerValue(BigNumber.ROUND_DOWN).toString(10);

    const amountInHex = Web3.utils.numberToHex(roundedWeiEquivalent);
    
    return amountInHex;
  } catch (error) {
    console.error('Error converting USDC to Wei:', error);
    throw error;
  }
};

export const usdcToWeiWithoutHex = async (usdcAmount) => {
  try {
    const amount = new BigNumber(usdcAmount);

    if (amount.isLessThanOrEqualTo(new BigNumber(0))) {
      throw new Error("Invalid USDC amount");
    }

    const ethPriceInUSDC = await fetchEthPriceInUSDC();
    const ethPriceInUSDCBN = new BigNumber(ethPriceInUSDC);

    if (ethPriceInUSDCBN.isLessThanOrEqualTo(new BigNumber(0))) {
      throw new Error("Invalid ETH price fetched");
    }

    const weiConversionFactor = new BigNumber(1e18);
    const rawWeiEquivalent = amount
      .multipliedBy(weiConversionFactor)
      .dividedBy(ethPriceInUSDCBN);

    const roundedWeiEquivalent = rawWeiEquivalent
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(10);

    return roundedWeiEquivalent;
  } catch (error) {
    console.error("Error converting USDC to Wei:", error);
    throw error;
  }
};
