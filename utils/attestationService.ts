import { ethers } from 'ethers';

// Update ABI to match the contract we just deployed
// Make sure this matches the property functions and types in PropertyAttestationVerifier.sol
const PropertyAttestationVerifierABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "deedNumber",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      }
    ],
    "name": "PropertyAttested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      }
    ],
    "name": "PropertyVerified",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "deedNumber",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "propertyName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "propertyAddress",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "ownerName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "taxId",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "photoHashes",
        "type": "string[]"
      }
    ],
    "name": "attestProperty",
    "outputs": [
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "propertyOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      }
    ],
    "name": "checkAttestationStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "attestationVerified",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "propertyOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      }
    ],
    "name": "getAttestationTimestamp",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "propertyOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      }
    ],
    "name": "getPropertyData",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "deedNumber",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "propertyName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "propertyAddress",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "ownerName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "taxId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "verified",
        "type": "bool"
      },
      {
        "internalType": "string[]",
        "name": "photoHashes",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "propertyOwner",
        "type": "address"
      }
    ],
    "name": "getPropertyCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      }
    ],
    "name": "isHashVerified",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isVerified",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "propertyOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "propertyIndex",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "verificationDataHash",
        "type": "bytes32"
      }
    ],
    "name": "verifyAttestation",
    "outputs": [
      {
        "internalType": "bool",
        "name": "verified",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export interface PropertyData {
  propertyName: string;
  propertyDescription?: string;
  propertyAddress: string;
  deedNumber: string;
  ownerName?: string;
  taxId?: string;
  fractionizeAmount?: string;
  photoHashes?: string[];
  timestamp?: number;
  propertyIndex?: number; // Add property index to track multiple properties
  verified?: boolean;     // Add verification status
  propertyLocation?: string; // New field: property location
  propertySize?: string;     // New field: property size
  propertyCondition?: string; // New field: property condition rating (1-5)
  uniqueId?: string;     // Unique identifier to prevent duplicate attestations
}

export interface AttestationResult {
  success: boolean;
  error?: string;
  txHash?: string;
  propertyIndex?: number; // Add property index to return value
}

interface EthereumWindow extends Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (request: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, listener: (...args: any[]) => void) => void;
    removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
    selectedAddress?: string;
    chainId?: string;
  };
}

export class AttestationService {
  private provider: any = null;
  private contract: any = null;
  private initialized: boolean = false;
  private isLoading: boolean = false;
  // Use the newly deployed contract address
  private contractAddress: string = '0x17b033AA70092f8f8357d0e819D06258FF519057';
  
  constructor() {
    // Initialization is done asynchronously in the init method
  }
  
  /**
   * Initialize the attestation service with ethers provider
   */
  public async init(): Promise<boolean> {
    try {
      if (this.isLoading) {
        console.log('Attestation service initialization already in progress');
        return false;
      }
      
      this.isLoading = true;
      
      if (typeof window === 'undefined') {
        console.error('Window is undefined');
        return false;
      }
      
      console.log('Initializing attestation service with contract address:', this.contractAddress);
      
      const ethereumWindow = window as any;
      
      if (!ethereumWindow.ethereum) {
        console.error('Ethereum provider not found');
        return false;
      }
      
      // Connect to the provider
      this.provider = new ethers.BrowserProvider(ethereumWindow.ethereum);
      
      // Check network
      try {
        const network = await this.provider.getNetwork();
        const chainId = parseInt(network.chainId.toString());
        console.log('Connected to network with chain ID:', chainId);
        
        // Verify we're on HashKey Chain Testnet (Chain ID: 133)
        const requiredChainId = 133; // HashKey Chain Testnet
        if (chainId !== requiredChainId) {
          console.error(`Wrong network detected. Connected to chain ID ${chainId}, but HashKey Chain Testnet (${requiredChainId}) is required`);
          alert(`Please switch to HashKey Chain Testnet (Chain ID: ${requiredChainId}) to use the attestation service.`);
          return false;
        }
      } catch (networkError) {
        console.error('Failed to get network information:', networkError);
        return false;
      }
      
      // Check if contract exists at the address
      try {
        const code = await this.provider.getCode(this.contractAddress);
        if (code === '0x' || code === '0x0') {
          console.error(`No contract found at address: ${this.contractAddress}`);
          alert(`Contract not deployed at ${this.contractAddress} on the current network.`);
          return false;
        }
        console.log('Contract bytecode found at the specified address');
      } catch (codeError) {
        console.error('Failed to check contract code:', codeError);
        return false;
      }
      
      // Connect to the contract
      try {
        const signer = await this.provider.getSigner();
        this.contract = new ethers.Contract(
          this.contractAddress,
          PropertyAttestationVerifierABI,
          signer
        );
        
        // Verify contract interface with a simple call
        console.log('Verifying contract interface...');
        const signerAddress = await signer.getAddress();
        await this.contract.getPropertyCount(signerAddress);
        console.log('Successfully called getPropertyCount - contract interface verified');
        
        this.initialized = true;
        return true;
      } catch (contractError: any) {
        console.error('Failed to initialize contract:', contractError);
        
        // Check for specific error types
        if (contractError.message?.includes('missing revert data')) {
          console.error('Contract call reverted without reason - possible ABI mismatch or wrong function signature');
          alert('Contract error: The function may not exist on the contract. Please check the contract ABI and address.');
        } else if (contractError.message?.includes('invalid opcode')) {
          console.error('Invalid opcode error - this often happens when calling a function that throws but doesn\'t provide a reason');
        } else if (contractError.message?.includes('execution reverted')) {
          console.error('Execution reverted:', contractError.data?.message || 'No reason provided');
          alert(`Contract error: ${contractError.data?.message || 'Execution reverted without reason'}`);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error initializing attestation service:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Check if service is loading
   */
  public isInitializing(): boolean {
    return this.isLoading;
  }
  
  /**
   * Generate hash for property data
   */
  private generateDataHash(data: PropertyData): string {
    // Ensure consistent input for hash generation
    // Must match the exact order and format of the data used in the contract
    return ethers.keccak256(
      ethers.concat([
        ethers.toUtf8Bytes(data.propertyName || ''),         // Keep same order as contract
        ethers.toUtf8Bytes(data.propertyAddress || ''),      // Keep same order as contract
        ethers.toUtf8Bytes(data.deedNumber || ''),           // Keep same order as contract
        ethers.toUtf8Bytes(data.ownerName || ''),            // Keep same order as contract
        ethers.toUtf8Bytes(data.taxId || ''),                // Keep same order as contract
        ethers.toUtf8Bytes(data.propertyDescription || ''),  // Keep same order as contract
        // Include new fields in hash calculation
        ethers.toUtf8Bytes(data.propertyLocation || ''),
        ethers.toUtf8Bytes(data.propertySize || ''),
        ethers.toUtf8Bytes(data.propertyCondition || ''),
        // Include the unique identifier to ensure hash uniqueness
        ethers.toUtf8Bytes(data.uniqueId || Date.now().toString())
      ])
    );
  }
  
  /**
   * Submit property attestation to blockchain
   */
  public async attestProperty(
    propertyData: PropertyData,
    photoHashes: string[] = []
  ): Promise<AttestationResult> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract || !this.provider) {
        const initialized = await this.init();
        if (!initialized || !this.contract) {
          return { success: false, error: 'Failed to initialize service' };
        }
      }
      
      // Generate data hash (for immutable verification)
      const dataHash = this.generateDataHash(propertyData);
      console.log('Generated data hash:', dataHash);
      console.log('Property data for hash:', {
        name: propertyData.propertyName,
        address: propertyData.propertyAddress,
        deed: propertyData.deedNumber,
        owner: propertyData.ownerName,
        taxId: propertyData.taxId
      });
      
      // Check if property is already attested to prevent failed transactions
      try {
        const signer = await this.provider!.getSigner();
        const signerAddress = await signer.getAddress();
        const properties = await this.getProperties(signerAddress);
        
        // Log properties for debugging
        console.log('Current properties for address:', signerAddress);
        console.log('Number of properties:', properties.length);
        
        // Check if any existing property has the same data hash
        const existing = properties.find(p => {
          // Generate hash for each existing property for comparison
          const existingHash = this.generateDataHash(p);
          
          // Log comparison details for debugging
          const propertyMatch = p.propertyName === propertyData.propertyName;
          const addressMatch = p.propertyAddress === propertyData.propertyAddress;
          const deedMatch = p.deedNumber === propertyData.deedNumber;
          const ownerMatch = p.ownerName === propertyData.ownerName;
          const taxIdMatch = p.taxId === propertyData.taxId;
          
          console.log(`Comparing with property ${p.propertyIndex}:`, {
            existingHash,
            hashMatch: existingHash === dataHash,
            propertyMatch, 
            addressMatch,
            deedMatch,
            ownerMatch,
            taxIdMatch
          });
          
          return existingHash === dataHash;
        });
        
        if (existing) {
          console.log('Found property with matching data hash:', existing);
          return { 
            success: false, 
            error: 'Property already attested',
            propertyIndex: existing.propertyIndex
          };
        }
        
        // Secondary check for properties with similar details
        const similarProperty = properties.find(p => 
          p.deedNumber === propertyData.deedNumber && 
          p.propertyAddress === propertyData.propertyAddress
        );
        
        if (similarProperty) {
          console.log('Found property with similar details:', similarProperty);
          return { 
            success: false, 
            error: 'Property with same deed number and address already attested',
            propertyIndex: similarProperty.propertyIndex
          };
        }
      } catch (checkError) {
        console.log('Error checking existing properties:', checkError);
        // Continue with attestation attempt even if check fails
      }
      
      // If no photo hashes provided, use array with empty string
      const photos = photoHashes.length > 0 ? photoHashes : [''];
      
      // Submit attestation transaction
      try {
        console.log('Calling attestProperty with params:', {
          dataHash,
          deedNumber: propertyData.deedNumber,
          propertyName: propertyData.propertyName,
          propertyAddress: propertyData.propertyAddress,
          ownerName: propertyData.ownerName || '',
          taxId: propertyData.taxId || '',
          photoHashesCount: photos.length
        });
        
        const tx = await this.contract.attestProperty(
          dataHash,
          propertyData.deedNumber || '',
          propertyData.propertyName || '',
          propertyData.propertyAddress || '',
          propertyData.ownerName || '',
          propertyData.taxId || '',
          photos
        );
        
        console.log('Transaction sent:', tx.hash);
        console.log('Waiting for transaction to be mined...');
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined, receipt:', receipt);
        
        // Find property index from emitted event
        let propertyIndex = 0;
        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const parsedLog = this.contract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              if (parsedLog && parsedLog.name === 'PropertyAttested') {
                propertyIndex = Number(parsedLog.args.propertyIndex);
                console.log('Found PropertyAttested event with index:', propertyIndex);
                break;
              }
            } catch (parseError) {
              console.log('Error parsing log:', parseError);
            }
          }
        }
        
        return { 
          success: true, 
          txHash: tx.hash, 
          propertyIndex 
        };
      } catch (txError: any) {
        console.error('Error submitting attestation transaction:', txError);
        
        // Better error handling with specific messages for common errors
        if (txError.message?.includes('missing revert data')) {
          return { 
            success: false, 
            error: 'Transaction reverted without reason. Please check contract function parameters and try again.'
          };
        } else if (txError.code === 'ACTION_REJECTED') {
          return { 
            success: false, 
            error: 'Transaction was rejected by the wallet. Please try again.'
          };
        } else if (txError.message?.includes('execution reverted')) {
          return { 
            success: false, 
            error: txError.data?.message || 'Contract execution reverted. There may be an issue with the property data.'
          };
        }
        
        return { 
          success: false, 
          error: txError.message || 'Failed to submit attestation'
        };
      }
    } catch (error: any) {
      console.error('Attestation error:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error during attestation'
      };
    }
  }
  
  /**
   * Get all properties for an address
   */
  public async getProperties(address: string): Promise<PropertyData[]> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return [];
        }
      }
      
      // Get property count with better error handling
      let count = 0;
      try {
        count = Number(await this.contract.getPropertyCount(address));
        console.log(`Found ${count} properties for address ${address}`);
      } catch (countError: any) {
        console.error('Silent contract error getting property count:', countError);
        // Don't throw - return empty array instead
        return [];
      }
      
      const properties: PropertyData[] = [];
      
      // Fetch each property with improved error handling
      for (let i = 0; i < count; i++) {
        try {
          const property = await this.getPropertyByIndex(address, i);
          if (property) {
            properties.push(property);
          }
        } catch (propertyError: any) {
          console.error(`Error fetching property at index ${i}:`, propertyError);
          // Continue to next property instead of failing completely
        }
      }
      
      return properties;
    } catch (error: any) {
      console.error('Error getting properties:', error);
      // Return empty array instead of propagating error
      return [];
    }
  }
  
  /**
   * Check if an address has attested properties
   */
  public async hasAttestationVerified(address: string, propertyIndex: number = 0): Promise<boolean> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return false;
        }
      }
      
      // Call contract to check attestation status
      const [exists, verified] = await this.contract.checkAttestationStatus(address, propertyIndex);
      
      return exists && verified;
    } catch (error) {
      console.error('Error checking attestation status:', error);
      return false;
    }
  }
  
  /**
   * Check if an address has any verified attestations
   */
  public async hasAnyVerifiedAttestations(address: string): Promise<boolean> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return false;
        }
      }
      
      // Get total property count with error handling
      let count = 0;
      try {
        count = Number(await this.contract.getPropertyCount(address));
      } catch (countError) {
        console.error('Error getting property count:', countError);
        return false;
      }
      
      // Check if any property is verified
      for (let i = 0; i < count; i++) {
        try {
          const checkResult = await this.contract.checkAttestationStatus(address, i);
          const [exists, verified] = checkResult || [false, false];
          if (exists && verified) {
            return true;
          }
        } catch (checkError) {
          console.error(`Error checking attestation status for index ${i}:`, checkError);
          // Continue to check other properties
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for verified attestations:', error);
      return false;
    }
  }
  
  /**
   * Get attestation timestamp
   */
  public async getAttestationTimestamp(address: string, propertyIndex: number = 0): Promise<number> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return 0;
        }
      }
      
      // Get attestation timestamp
      const timestamp = await this.contract.getAttestationTimestamp(address, propertyIndex);
      
      return Number(timestamp);
    } catch (error) {
      console.error('Error getting attestation timestamp:', error);
      return 0;
    }
  }
  
  /**
   * Fetch property data (only works if caller is property owner or contract owner)
   */
  public async getPropertyByIndex(propertyOwner: string, propertyIndex: number): Promise<PropertyData | null> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return null;
        }
      }
      
      // First check if the property exists to avoid silent errors
      try {
        const checkResult = await this.contract.checkAttestationStatus(propertyOwner, propertyIndex);
        const [exists] = checkResult || [false];
        if (!exists) {
          console.log(`Property at index ${propertyIndex} does not exist for ${propertyOwner}`);
          return null;
        }
      } catch (checkError) {
        console.error(`Error checking if property ${propertyIndex} exists:`, checkError);
        // Continue to attempt getting data
      }
      
      // Get property data from contract with better error handling
      try {
        const result = await this.contract.getPropertyData(propertyOwner, propertyIndex);
        
        // Verify we got valid data back
        if (!result || result.length < 9) {
          console.error('Invalid property data returned from contract');
          return null;
        }
        
        const [
          dataHash,
          deedNumber,
          propertyName,
          propertyAddress,
          ownerName,
          taxId,
          timestamp,
          verified,
          photoHashes
        ] = result;
        
        // Return formatted property data
        return {
          propertyName,
          propertyAddress,
          deedNumber,
          ownerName,
          taxId,
          photoHashes,
          timestamp: Number(timestamp),
          propertyIndex,
          verified
        };
      } catch (dataError: any) {
        // Check for permission error
        if (dataError?.message && dataError.message.includes("Only property owner or contract owner")) {
          console.error('Permission denied: Only property owner or contract owner can access this data');
        } else {
          console.error(`Error fetching property data for index ${propertyIndex}:`, dataError);
        }
        return null;
      }
    } catch (error: any) {
      console.error('Error in getPropertyByIndex:', error);
      return null;
    }
  }
  
  /**
   * Get the most recent property data for an address (for backward compatibility)
   */
  public async getPropertyData(propertyOwner: string): Promise<PropertyData | null> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return null;
        }
      }
      
      // Get total property count
      const count = Number(await this.contract.getPropertyCount(propertyOwner));
      
      if (count === 0) {
        return null;
      }
      
      // Get the most recent property (last one in the array)
      return await this.getPropertyByIndex(propertyOwner, count - 1);
    } catch (error) {
      console.error('Error fetching property data:', error);
      return null;
    }
  }
  
  /**
   * Check if a specific data hash has been verified
   */
  public async isHashVerified(dataHash: string): Promise<boolean> {
    try {
      // Ensure service is initialized
      if (!this.initialized || !this.contract) {
        await this.init();
        if (!this.initialized || !this.contract) {
          return false;
        }
      }
      
      // Convert string hash to bytes32 if needed
      const bytes32Hash = dataHash.startsWith('0x') 
        ? dataHash 
        : ethers.id(dataHash);
      
      // Check if hash is verified
      return await this.contract.isHashVerified(bytes32Hash);
    } catch (error) {
      console.error('Error checking if hash is verified:', error);
      return false;
    }
  }
  
  // Add these new methods
  public async getPropertyValuation(location: string, size: string, condition: string): Promise<string> {
    try {
      // Simulated oracle call - in a real implementation, this would call a contract
      // Simple property valuation algorithm based on size, location and condition
      const sizeNumeric = parseInt(size.replace(/[^\d]/g, '')) || 1000;
      const conditionValue = parseInt(condition) || 3;
      const basePrice = 100000; // Base property value
      
      // Location-based multiplier
      let locationMultiplier = 1.0;
      const highValueLocations = ['New York', 'San Francisco', 'Los Angeles', 'Miami', 'London', 'Tokyo'];
      const mediumValueLocations = ['Chicago', 'Dallas', 'Seattle', 'Boston', 'Paris', 'Berlin'];
      
      if (highValueLocations.some(loc => location.toLowerCase().includes(loc.toLowerCase()))) {
        locationMultiplier = 1.5;
      } else if (mediumValueLocations.some(loc => location.toLowerCase().includes(loc.toLowerCase()))) {
        locationMultiplier = 1.2;
      }
      
      // Calculate property value
      const calculatedValue = basePrice * (sizeNumeric / 1000) * (conditionValue / 3) * locationMultiplier;
      return calculatedValue.toFixed(2);
    } catch (error) {
      console.error("Error in property valuation:", error);
      return "100000.00"; // Default fallback value
    }
  }
  
  public async mintPropertyToken(tokenData: any): Promise<{success: boolean, txHash?: string, error?: string}> {
    try {
      // Simulate a blockchain transaction for token minting
      console.log("Minting property token with data:", tokenData);
      
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a random transaction hash
      const txHash = `0x${Math.random().toString(16).substring(2, 16)}${Math.random().toString(16).substring(2, 16)}`;
      
      return {
        success: true,
        txHash
      };
    } catch (error: any) {
      console.error("Error minting property token:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred during token minting"
      };
    }
  }
}

// Create and export a singleton instance
export async function createAttestationService(): Promise<AttestationService | null> {
  try {
    const service = new AttestationService();
    const initialized = await service.init();
    
    if (initialized) {
      return service;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to create attestation service:', error);
    return null;
  }
} 