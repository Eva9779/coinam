import { ethers } from "ethers";

/**
 * Institutional Chain Registry
 * Primary: Base Sepolia (Testnet)
 * Secondary: Base Mainnet
 */
export const CHAINS = {
  BASE_SEPOLIA: {
    id: 84532,
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    }
  },
  BASE_MAINNET: {
    id: 8453,
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    }
  }
};

// DEFAULT: Base Sepolia until explicitly switched
const ACTIVE_CHAIN = CHAINS.BASE_SEPOLIA;

export const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc);

export async function getLiveBlockNumber() {
  try {
    return await provider.getBlockNumber();
  } catch (error) {
    return null;
  }
}

export async function getLiveBalance(address: string, currency: string = 'ETH') {
  if (!address || !address.startsWith('0x') || address.length < 42) return '0';
  
  try {
    if (currency === 'ETH') {
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } else {
      const tokenAddress = ACTIVE_CHAIN.tokens[currency as keyof typeof ACTIVE_CHAIN.tokens];
      if (!tokenAddress) return '0';
      
      const abi = ["function balanceOf(address) view returns (uint256)"];
      const contract = new ethers.Contract(tokenAddress, abi, provider);
      const balance = await contract.balanceOf(address);
      
      const decimals = currency === 'USDC' ? 6 : 18;
      return ethers.formatUnits(balance, decimals);
    }
  } catch (error: any) {
    console.warn(`Blockchain Sync Delay: ${error.message}`);
    return '0';
  }
}

export async function getLiveGasPrice() {
  try {
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) {
      return Number(ethers.formatUnits(feeData.gasPrice, "gwei"));
    }
    return 0.1; // Base gas is low
  } catch (error) {
    return 0.1;
  }
}
