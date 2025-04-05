import { ethers } from 'ethers';

// Update ABI to match the new contract functions with property index parameters
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
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private initialized: boolean = false;
  private contractAddress: string = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT_ADDRESS || '';
  
  constructor() {
    // Initialization is done asynchronously in the init method
  }
  
  /**
   * Initialize the attestation service with ethers provider
   */
  public async init(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        console.error('Window is undefined');
        return false;
      }
      
      const ethereumWindow = window as EthereumWindow;
      
      if (!ethereumWindow.ethereum) {
        console.error('Ethereum provider not found');
        return false;
      }
      
      // Connect to the provider
      this.provider = new ethers.BrowserProvider(ethereumWindow.ethereum);
      
      // Connect to the contract
      if (!this.contractAddress) {
        console.error('Attestation contract address not found in environment variables');
        return false;
      }
      
      const signer = await this.provider.getSigner();
      this.contract = new ethers.Contract(
        this.contractAddress,
        PropertyAttestationVerifierABI,
        signer
      );
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing attestation service:', error);
      return false;
    }
  }
  
  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
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
        ethers.toUtf8Bytes(data.propertyDescription || '')   // Keep same order as contract
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
        await this.init();
        if (!this.initialized || !this.contract) {
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
      const tx = await this.contract.attestProperty(
        dataHash,
        propertyData.deedNumber,
        propertyData.propertyName,
        propertyData.propertyAddress,
        propertyData.ownerName || '',
        propertyData.taxId || '',
        photos
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Find property index from emitted event
      let propertyIndex = 0;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.contract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === 'PropertyAttested') {
              propertyIndex = Number(parsedLog.args.propertyIndex);
              break;
            }
          } catch (e) {
            console.log("Error parsing log:", e);
          }
        }
      }
      
      // Return success with transaction hash and property index
      return {
        success: true,
        txHash: receipt?.hash || null,
        propertyIndex
      };
    } catch (error: any) {
      // Handle specific contract errors
      if (error.message) {
        if (error.message.includes('Property with this data hash already attested') || 
            error.message.includes('Property already attested')) {
          console.log('Contract reverted with already attested error:', error);
          return { success: false, error: 'Property already attested' };
        }
        
        // Parse revert reason from execution reverted error
        const revertMatch = error.message.match(/execution reverted: "(.*?)"/);
        if (revertMatch && revertMatch[1]) {
          return { success: false, error: revertMatch[1] };
        }
        
        // Handle revert reason from execution
        if (error.reason) {
          return { success: false, error: error.reason };
        }
      }
      
      // Handle error.data which may contain revert reason
      if (error.data) {
        try {
          // Try to extract error message from error data
          const hexData = error.data;
          if (typeof hexData === 'string' && hexData.startsWith('0x08c379a0')) {
            // This is the standard error encoding format in Solidity
            const abiCoder = new ethers.AbiCoder();
            const errorMsg = abiCoder.decode(['string'], '0x' + hexData.slice(10));
            return { success: false, error: errorMsg[0] };
          }
        } catch (e) {
          console.error('Error parsing error data:', e);
        }
      }
      
      console.error('Error during property attestation:', error);
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
      
      // Get property count
      const count = Number(await this.contract.getPropertyCount(address));
      const properties: PropertyData[] = [];
      
      // Fetch each property
      for (let i = 0; i < count; i++) {
        try {
          const property = await this.getPropertyByIndex(address, i);
          if (property) {
            properties.push(property);
          }
        } catch (error) {
          console.error(`Error fetching property at index ${i}:`, error);
        }
      }
      
      return properties;
    } catch (error) {
      console.error('Error getting properties:', error);
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
      
      // Get total property count
      const count = Number(await this.contract.getPropertyCount(address));
      
      // Check if any property is verified
      for (let i = 0; i < count; i++) {
        const [exists, verified] = await this.contract.checkAttestationStatus(address, i);
        if (exists && verified) {
          return true;
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
      
      // Get property data from contract
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
      ] = await this.contract.getPropertyData(propertyOwner, propertyIndex);
      
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
    } catch (error) {
      console.error('Error fetching property data:', error);
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