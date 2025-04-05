import { ethers } from 'ethers';
import KYCVerifierJSON from '../contracts/abis/KYCVerifier.json';

// Extract just the ABI from the JSON file
const KYCVerifierABI = KYCVerifierJSON.abi;

// Contract address would be set after deployment
const KYC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_KYC_CONTRACT_ADDRESS || '';

/**
 * Service to handle KYC verification through the smart contract
 */
export class KYCService {
  private provider: ethers.BrowserProvider;
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;
  private verifierAddress: string | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  /**
   * Initialize the KYC service with a web3 provider
   */
  constructor(provider: ethers.BrowserProvider) {
    this.provider = provider;
    // Start the initialization process but don't wait for it
    this.initializationPromise = this.initializeContract();
  }
  
  /**
   * Initialize the contract instance
   */
  private async initializeContract(): Promise<void> {
    try {
      console.log('Initializing KYC contract with address:', KYC_CONTRACT_ADDRESS);
      
      if (!KYC_CONTRACT_ADDRESS || KYC_CONTRACT_ADDRESS === '') {
        console.error('KYC contract address is empty or undefined');
        console.error('Please check your environment variables and make sure NEXT_PUBLIC_KYC_CONTRACT_ADDRESS is set correctly');
        return;
      }
      
      // Log network information
      try {
        const network = await this.provider.getNetwork();
        console.log('Connected to network:', network.name, 'chainId:', network.chainId);
      } catch (networkError) {
        console.error('Failed to get network information:', networkError);
      }
      
      this.signer = await this.provider.getSigner();
      this.verifierAddress = await this.signer.getAddress();
      console.log('Connected with wallet address:', this.verifierAddress);
      
      // Create contract instance
      this.contract = new ethers.Contract(
        KYC_CONTRACT_ADDRESS,
        KYCVerifierABI,
        this.signer
      );
      
      // Test a simple read call to verify the contract is working
      try {
        console.log('Testing contract connection by calling isTrustedVerifier...');
        await this.contract.isTrustedVerifier(this.verifierAddress);
        this.initialized = true;
        console.log('KYC Contract successfully initialized and connected');
      } catch (contractError) {
        console.error('Contract method call failed. This could indicate:');
        console.error('1. Wrong contract address');
        console.error('2. Wrong network (chain ID)');
        console.error('3. Contract not deployed on this network');
        console.error('Error details:', contractError);
        this.contract = null;
      }
    } catch (error) {
      console.error('Failed to initialize KYC contract:', error);
      this.contract = null;
    }
  }
  
  /**
   * Ensures the contract is initialized before performing operations
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    
    if (!this.contract) {
      // Try to initialize again if it failed the first time
      await this.initializeContract();
    }
    
    return !!this.contract;
  }
  
  /**
   * Hash the KYC data for secure transmission
   * @param userData User data to hash
   * @returns The hashed data
   */
  public hashKYCData(userData: {
    fullName: string;
    age: string;
    dateOfBirth: string;
    nationality: string;
    isUSCitizen: boolean;
    documentNumber?: string;
  }): string {
    // Create a hash of the data
    const dataString = JSON.stringify(userData);
    return ethers.keccak256(ethers.toUtf8Bytes(dataString));
  }
  
  /**
   * Submit KYC data to the blockchain
   * @param userData User data extracted from document
   * @returns Transaction result
   */
  public async submitKYCVerification(userData: {
    fullName: string;
    age: string;
    dateOfBirth: string;
    nationality: string;
    isUSCitizen: boolean;
    documentNumber?: string;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const isInitialized = await this.ensureInitialized();
    if (!isInitialized) {
      return { 
        success: false, 
        error: 'Contract or signer not initialized. Please connect wallet first.' 
      };
    }
    
    try {
      // Convert age to number
      const ageNumber = parseInt(userData.age);
      
      if (isNaN(ageNumber)) {
        return { success: false, error: 'Invalid age format' };
      }
      
      // Create a hash of the full data (keeps sensitive data off-chain)
      const dataHash = ethers.getBytes(this.hashKYCData(userData));
      
      // Get the current wallet address to ensure we verify the correct address
      const walletAddress = await this.signer!.getAddress();
      console.log('KYC verification for wallet address:', walletAddress);
      
      // Log important verification parameters
      console.log('KYC verification parameters:');
      console.log('- Age:', ageNumber);
      console.log('- Is US Citizen:', userData.isUSCitizen);
      console.log('- Address being verified:', walletAddress);
      
      // Create message hash for signing
      const messageHash = ethers.solidityPackedKeccak256(
        ['bytes32', 'uint8', 'bool', 'address'],
        [dataHash, ageNumber, userData.isUSCitizen, walletAddress]
      );
      
      const messageHashBytes = ethers.getBytes(messageHash);
      const signature = await this.signer!.signMessage(messageHashBytes);
      
      // Submit to the blockchain - use the current wallet address explicitly
      console.log('Calling verifyKYC on contract...');
      const tx = await this.contract!.verifyKYC(
        dataHash,
        ageNumber,
        userData.isUSCitizen,
        signature,
        walletAddress // Make sure we're using the current wallet address
      );
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction to be mined...');
      const receipt = await tx.wait();
      console.log('Transaction mined, receipt:', receipt);
      
      // Double-check that the KYC status was updated correctly
      const kycStatus = await this.hasPassedKYC(walletAddress);
      console.log('KYC status after verification:', kycStatus);
      
      return {
        success: true,
        txHash: receipt.hash // Updated from receipt.transactionHash for ethers v6
      };
    } catch (error: any) {
      console.error('KYC verification error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during KYC verification'
      };
    }
  }
  
  /**
   * Check if a user has passed KYC
   * @param userAddress Ethereum address of the user
   * @returns Whether the user has passed KYC
   */
  public async hasPassedKYC(userAddress: string): Promise<boolean> {
    const isInitialized = await this.ensureInitialized();
    if (!isInitialized) {
      console.error('Contract not initialized for KYC check on address:', userAddress);
      console.error('Contract address being used:', KYC_CONTRACT_ADDRESS);
      console.error('Wallet network:', await this.provider.getNetwork().then(n => `${n.name} (chainId: ${n.chainId})`).catch(() => 'unknown'));
      throw new Error('Contract not initialized. Please check console for details.');
    }
    
    try {
      console.log('Checking KYC status for address:', userAddress);
      console.log('Using contract at address:', KYC_CONTRACT_ADDRESS);
      
      // Check if address is valid
      if (!userAddress || !ethers.isAddress(userAddress)) {
        console.error('Invalid address format for KYC check:', userAddress);
        return false;
      }
      
      // Get the current wallet address to see if it matches the address being checked
      const currentWalletAddress = this.signer ? await this.signer.getAddress() : 'No signer available';
      console.log('Current wallet address:', currentWalletAddress);
      console.log('Checking KYC for address:', userAddress);
      
      // Make the blockchain call with extra error handling
      console.log('Calling hasPassedKYC on contract...');
      const result = await this.contract!.hasPassedKYC(userAddress);
      console.log('KYC check result for', userAddress, ':', result);
      
      if (result) {
        console.log('KYC is verified for this address');
      } else {
        console.log('KYC is NOT verified for this address');
        
        // Try to get the verification timestamp to confirm lack of verification
        try {
          const timestamp = await this.contract!.getVerificationTimestamp(userAddress);
          console.log('Verification timestamp:', Number(timestamp));
          if (Number(timestamp) > 0) {
            console.warn('Timestamp exists but verification status is false - inconsistent state');
          }
        } catch (timestampError) {
          console.error('Error getting verification timestamp:', timestampError);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Error checking KYC status for address', userAddress, ':', error);
      console.error('Error details:', error.message || 'Unknown error');
      
      // Check for specific errors that might help diagnose the issue
      if (error.message?.includes('execution reverted')) {
        console.error('Contract execution reverted - possible contract mismatch or wrong network');
      }
      
      if (error.message?.includes('network')) {
        console.error('Network error - check if wallet is connected to the correct network');
      }
      
      // Return false instead of throwing to prevent crashing the app
      return false;
    }
  }
  
  /**
   * Get the timestamp of when a user's KYC was last verified
   * @param userAddress Ethereum address of the user
   * @returns Timestamp as a number (0 if never verified)
   */
  public async getVerificationTimestamp(userAddress: string): Promise<number> {
    const isInitialized = await this.ensureInitialized();
    if (!isInitialized) {
      throw new Error('Contract not initialized. Please check console for details.');
    }
    
    try {
      const timestamp = await this.contract!.getVerificationTimestamp(userAddress);
      return Number(timestamp); // Updated for ethers v6 BigInt handling
    } catch (error) {
      console.error('Error getting verification timestamp:', error);
      return 0;
    }
  }
  
  /**
   * Get raw KYC status directly from the contract mapping
   * This bypasses any additional logic and directly accesses the contract storage
   * @param userAddress Ethereum address of the user
   * @returns Raw boolean value from the contract
   */
  public async getRawKYCStatus(userAddress: string): Promise<boolean> {
    const isInitialized = await this.ensureInitialized();
    if (!isInitialized) {
      throw new Error('Contract not initialized');
    }
    
    console.log('Getting raw KYC status for:', userAddress);
    
    try {
      // Make direct call to the contract mapping (this assumes the mapping is public)
      // Note: We use a low-level call to access storage directly
      const result = await this.contract!.kycApproved(userAddress);
      console.log('Raw KYC status from contract:', result);
      return result;
    } catch (error) {
      console.error('Error getting raw KYC status:', error);
      throw error;
    }
  }
}

/**
 * Create a KYC service instance using the current provider
 * @returns KYC service instance
 */
export const createKYCService = async (): Promise<KYCService | null> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('Ethereum provider not available');
    return null;
  }
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const service = new KYCService(provider);
    
    // Wait for initialization to complete before returning
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return service;
  } catch (error) {
    console.error('Failed to create KYC service:', error);
    return null;
  }
}; 