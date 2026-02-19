
import { createPublicClient, createWalletClient, http, formatEther, parseEther, fallback } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Live Network Gateway
 * Uses your Coinbase CDP RPC for direct, high-performance broadcasts.
 */
const COINBASE_RPC_URL = `https://api.developer.coinbase.com/rpc/v1/mainnet/0TGjjV5EHjnHktxmAkRgECJwFYQa9AIV`;
const PUBLIC_RPC_URL = `https://eth.llamarpc.com`;

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http(COINBASE_RPC_URL),
    http(PUBLIC_RPC_URL),
  ]),
});

/**
 * Fetches the current block number from the live network.
 */
export async function getLiveBlockNumber() {
  try {
    return await publicClient.getBlockNumber();
  } catch (error) {
    return null;
  }
}

/**
 * Fetches the live balance of an Ethereum address.
 */
export async function getLiveBalance(address: string) {
  try {
    if (!address || !address.startsWith('0x')) return '0';
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    return formatEther(balance);
  } catch (error) {
    return '0';
  }
}

/**
 * Fetches the current gas price in Gwei directly from the network.
 */
export async function getLiveGasPrice() {
  try {
    const gasPrice = await publicClient.getGasPrice();
    return Number(gasPrice) / 1e9;
  } catch (error) {
    return 20;
  }
}

/**
 * Signs and broadcasts a live transaction to the Ethereum Mainnet.
 */
export async function sendLiveTransaction(privateKey: `0x${string}`, to: string, amount: string) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(COINBASE_RPC_URL),
  });

  const hash = await walletClient.sendTransaction({
    to: to as `0x${string}`,
    value: parseEther(amount),
  });

  return hash;
}
