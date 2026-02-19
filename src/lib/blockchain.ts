
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Public client for interacting with the Ethereum Mainnet.
 * Connects directly to the live peer-to-peer network.
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
    return null;
  }
}

/**
 * Fetches the live balance of an Ethereum address.
 */
export async function getLiveBalance(address: string) {
  try {
    if (!address.startsWith('0x')) return '0';
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
    return 0;
  }
}

/**
 * Signs and broadcasts a real transaction to the Ethereum Mainnet.
 * This operation is final and irreversible once transmitted to the network.
 */
export async function sendLiveTransaction(privateKey: `0x${string}`, to: string, amount: string) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  const hash = await walletClient.sendTransaction({
    to: to as `0x${string}`,
    value: parseEther(amount),
  });

  return hash;
}
