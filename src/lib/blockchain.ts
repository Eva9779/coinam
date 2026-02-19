
import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

/**
 * Public client for interacting with the Ethereum Mainnet.
 * Uses a public RPC endpoint for data retrieval.
 */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

/**
 * Fetches the current block number from the live network.
 */
export async function getLiveBlockNumber() {
  try {
    return await publicClient.getBlockNumber();
  } catch (error) {
    console.error('Failed to fetch block number:', error);
    return null;
  }
}

/**
 * Fetches the live balance of an Ethereum address.
 * @param address The ETH address to check.
 */
export async function getLiveBalance(address: string) {
  try {
    if (!address.startsWith('0x')) return '0';
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    return formatEther(balance);
  } catch (error) {
    console.error('Failed to fetch live balance:', error);
    return '0';
  }
}

/**
 * Fetches the current gas price in Gwei.
 */
export async function getLiveGasPrice() {
  try {
    const gasPrice = await publicClient.getGasPrice();
    return Number(gasPrice) / 1e9; // Convert to Gwei
  } catch (error) {
    console.error('Failed to fetch gas price:', error);
    return 0;
  }
}
