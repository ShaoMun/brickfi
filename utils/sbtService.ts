import { ethers } from 'ethers';

// We'll need to create this ABI after deployment
// For now, defining a minimal ABI for key functions
const VerificationSBTABI = [
  // Basic ERC721 functions
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  
  // SBT specific functions
  "function hasVerificationToken(address wallet) view returns (bool)",
  "function getTokenId(address wallet) view returns (uint256)",
  "function getKYCHash(uint256 tokenId) view returns (bytes32)",
  "function locked(uint256 tokenId) view returns (bool)",
  
  // Events
  "event VerificationTokenMinted(address indexed to, uint256 tokenId, bytes32 kycHash)"
];

// Will need to be updated after deployment
const SBT_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Service to interact with the VerificationSBT contract
 */
export class SBTService {
  private provider: any;
  private contract: any | null = null;
  private signer: any | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private useMockImplementation: boolean = false;
  
  // Mock data for testing when contract is not available
  private mockSBTData: Record<string, { tokenId: number, kycHash: string }> = {};
  
  /**
   * Initialize the SBT service with a web3 provider
   */
  constructor(provider: any) {
    this.provider = provider;
    // Start the initialization process but don't wait for it
    this.initializationPromise = this.initializeContract();
  }
  
  /**
   * Initialize the contract connection
   */
  private async initializeContract(): Promise<void> {
    try {
      console.log('Initializing SBT contract...');
      
      // Check if provider is available
      if (!this.provider) {
        console.warn('No provider available, SBT service will use mock implementation');
        this.useMockImplementation = true;
        this.initialized = true;
        return;
      }
      
      // Get signer if available
      try {
        this.signer = await this.provider.getSigner();
        console.log('Using signer for SBT contract');
      } catch (error) {
        console.warn('No signer available, SBT service will be read-only');
        this.signer = null;
      }
      
      // Try to connect to the contract
      try {
        // If a signer is available, use it
        const contractWithSigner = this.signer
          ? new ethers.Contract(SBT_CONTRACT_ADDRESS, VerificationSBTABI, this.signer)
          : new ethers.Contract(SBT_CONTRACT_ADDRESS, VerificationSBTABI, this.provider);
        
        // Verify the contract exists by calling a view function
        try {
          await contractWithSigner.name();
          
          this.contract = contractWithSigner;
          console.log('SBT contract connection established');
          this.useMockImplementation = false;
        } catch (error) {
          console.warn('Error calling SBT contract function, will use mock implementation:', error);
          this.useMockImplementation = true;
        }
      } catch (error) {
        console.warn('Error connecting to SBT contract, will use mock implementation:', error);
        this.useMockImplementation = true;
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SBT contract:', error);
      this.useMockImplementation = true;
      this.initialized = true;
    }
  }
  
  /**
   * Ensure the contract is initialized before proceeding
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        await this.initializeContract();
      }
    }
  }
  
  /**
   * Execute a function with fallback to mock implementation
   */
  private async executeWithFallback<T>(realImpl: () => Promise<T>, mockImpl: () => T): Promise<T> {
    if (this.useMockImplementation || !this.contract) {
      return mockImpl();
    }
    
    try {
      return await realImpl();
    } catch (error) {
      console.error('Error executing contract function, falling back to mock:', error);
      return mockImpl();
    }
  }
  
  /**
   * Check if a wallet address has a verification token
   */
  public async hasVerificationToken(walletAddress: string): Promise<boolean> {
    await this.ensureInitialized();
    
    return this.executeWithFallback(
      // Real implementation
      async () => {
        const hasToken = await this.contract.hasVerificationToken(walletAddress);
        return hasToken;
      },
      // Mock implementation
      () => {
        return !!this.mockSBTData[walletAddress.toLowerCase()];
      }
    );
  }
  
  /**
   * Get token ID for a wallet address
   */
  public async getTokenId(walletAddress: string): Promise<number> {
    await this.ensureInitialized();
    
    return this.executeWithFallback(
      // Real implementation
      async () => {
        const tokenId = await this.contract.getTokenId(walletAddress);
        return Number(tokenId);
      },
      // Mock implementation
      () => {
        const data = this.mockSBTData[walletAddress.toLowerCase()];
        return data ? data.tokenId : 0;
      }
    );
  }
  
  /**
   * Get token metadata for a specific token ID
   */
  public async getTokenMetadata(tokenId: number): Promise<any> {
    await this.ensureInitialized();
    
    return this.executeWithFallback(
      // Real implementation
      async () => {
        // Get token URI
        const tokenURI = await this.contract.tokenURI(tokenId);
        
        // If URI starts with "data:application/json;base64,", decode the base64 part
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64 = tokenURI.split(',')[1];
          const decoded = atob(base64);
          return JSON.parse(decoded);
        }
        
        // Otherwise, assume it's a JSON string
        try {
          return JSON.parse(tokenURI);
        } catch (error) {
          // If parsing fails, it might be a regular URI or something else
          return { uri: tokenURI };
        }
      },
      // Mock implementation
      () => {
        // Find wallet for this token ID
        const wallet = Object.keys(this.mockSBTData).find(
          addr => this.mockSBTData[addr].tokenId === tokenId
        );
        
        if (!wallet) {
          return null;
        }
        
        const kycHash = this.mockSBTData[wallet].kycHash;
        
        return {
          name: "KYC Verification Token",
          description: "This token certifies that the holder has completed KYC verification.",
          attributes: [
            { trait_type: "Status", value: "Verified" },
            { trait_type: "Verification Timestamp", value: String(Math.floor(Date.now() / 1000)) },
            { trait_type: "KYC Hash", value: kycHash || "0x0000000000000000000000000000000000000000000000000000000000000000" }
          ]
        };
      }
    );
  }

  /**
   * Get verification details for a wallet address
   */
  public async getVerificationDetails(walletAddress: string): Promise<{
    isVerified: boolean;
    tokenId: number;
    metadata: any;
  }> {
    await this.ensureInitialized();
    
    const hasToken = await this.hasVerificationToken(walletAddress);
    
    if (!hasToken) {
      return {
        isVerified: false,
        tokenId: 0,
        metadata: null
      };
    }
    
    const tokenId = await this.getTokenId(walletAddress);
    const metadata = await this.getTokenMetadata(tokenId);
    
    return {
      isVerified: true,
      tokenId,
      metadata
    };
  }
  
  /**
   * For testing: set mock SBT data
   */
  public setMockSBTData(walletAddress: string, tokenId: number, kycHash: string): void {
    this.mockSBTData[walletAddress.toLowerCase()] = { tokenId, kycHash };
  }
}

/**
 * Create an SBT service instance using the current provider
 */
export const createSBTService = async (): Promise<SBTService | null> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('Ethereum provider not available');
    return null;
  }
  
  try {
    console.log('Creating SBT service with user wallet...');
    // Use the user's connected wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Create the service with the provider
    const service = new SBTService(provider);
    
    console.log('SBT service created successfully');
    return service;
  } catch (error) {
    console.error('Failed to create SBT service:', error);
    return null;
  }
}; 