import fetch from 'node-fetch';

async function fetchEthPriceInUSDC() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    const data = await response.json();
    const ethPriceInUSDC = data.ethereum.usd;
    
    return ethPriceInUSDC;
  } catch (error) {
    console.error('Error fetching the ETH price:', error);
    throw new Error('Failed to fetch ETH price in USDC');
  }
}

export default fetchEthPriceInUSDC;
