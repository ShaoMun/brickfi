import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import Link from 'next/link';
import { createAttestationService } from '../utils/attestationService';
import { createKYCService } from '../utils/kycService';
import NavigationBar from '../components/NavigationBar';

// Define Property interface
interface Property {
  propertyName: string;
  propertyAddress: string;
  deedNumber: string;
  ownerName?: string;
  taxId?: string;
  photoHashes: string[];
  timestamp: number;
  propertyIndex: number;
  verified: boolean;
}

export default function Dashboard() {
  // State variables
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [attestationService, setAttestationService] = useState<any>(null);
  const [kycService, setKycService] = useState<any>(null);
  const [kycCompleted, setKycCompleted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        setIsLoading(true);
        setErrorMessage('');
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          setWalletConnected(true);
          
          // Get network ID
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(chainIdHex);
          
          // Initialize services
          initializeServices();
        }
      } else {
        setErrorMessage('Ethereum wallet not detected. Please install MetaMask.');
      }
    } catch (error: any) {
      console.error('Connect wallet error:', error);
      setErrorMessage(error.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize attestation and KYC services
  const initializeServices = async () => {
    try {
      // Initialize attestation service
      const attService = await createAttestationService();
      if (attService) {
        setAttestationService(attService);
        console.log('Attestation service initialized');
      }
      
      // Initialize KYC service
      const kyc = await createKYCService();
      if (kyc) {
        setKycService(kyc);
        console.log('KYC service initialized');
        
        // Check KYC status
        if (walletAddress) {
          try {
            console.log('Checking KYC status for address:', walletAddress);
            const hasPassedKYC = await kyc.hasPassedKYC(walletAddress);
            console.log('KYC verification status:', hasPassedKYC);
            setKycCompleted(hasPassedKYC);
            
            if (hasPassedKYC) {
              // Get verification timestamp
              const timestamp = await kyc.getVerificationTimestamp(walletAddress);
              if (timestamp > 0) {
                const date = new Date(timestamp * 1000);
                console.log(`KYC verified on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
              }
            }
          } catch (error) {
            console.error('Error checking KYC status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  };
  
  // Fetch properties when services are ready
  useEffect(() => {
    const fetchProperties = async () => {
      if (attestationService && walletConnected && walletAddress) {
        setIsLoading(true);
        try {
          const props = await attestationService.getProperties(walletAddress);
          setProperties(props || []);
        } catch (error) {
          console.error('Error fetching properties:', error);
          setErrorMessage('Failed to fetch property data');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchProperties();
  }, [attestationService, walletConnected, walletAddress]);
  
  // Handle wallet events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Handle account change
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          setWalletConnected(false);
          setWalletAddress('');
          setProperties([]);
          setKycCompleted(false);
        } else if (accounts[0] !== walletAddress) {
          // User switched account
          const newAddress = accounts[0];
          setWalletAddress(newAddress);
          // Refresh properties for new account
          if (attestationService) {
            attestationService.getProperties(newAddress)
              .then((props: Property[]) => setProperties(props || []))
              .catch((error: any) => console.error('Error fetching properties after account change:', error));
          }
          
          // Check KYC status for new account
          if (kycService) {
            console.log('Checking KYC status for new address:', newAddress);
            kycService.hasPassedKYC(newAddress)
              .then((hasPassedKYC: boolean) => {
                console.log('KYC verification status for new address:', hasPassedKYC);
                setKycCompleted(hasPassedKYC);
                
                // Get verification timestamp if KYC is completed
                if (hasPassedKYC) {
                  kycService.getVerificationTimestamp(newAddress)
                    .then((timestamp: number) => {
                      if (timestamp > 0) {
                        const date = new Date(timestamp * 1000);
                        console.log(`KYC verified on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
                      }
                    })
                    .catch((error: any) => console.error('Error getting KYC timestamp:', error));
                }
              })
              .catch((error: any) => console.error('Error checking KYC status after account change:', error));
          }
        }
      };
      
      // Handle chain change
      const handleChainChanged = (chainIdHex: string) => {
        setChainId(chainIdHex);
        window.location.reload();
      };
      
      // Subscribe to events
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then(handleAccountsChanged)
        .catch((err: any) => console.error('Error checking connected accounts:', err));
      
      // Cleanup event listeners
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [walletAddress, attestationService, kycService]);
  
  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get network name
  const getNetworkName = () => {
    switch (chainId) {
      case '0x1':
        return 'Ethereum Mainnet';
      case '0x5':
        return 'Goerli Testnet';
      case '0x11':
        return 'HashKey Chain Testnet';
      case '0x12':
        return 'HashKey Chain Mainnet';
      default:
        return 'Unknown Network';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Property Assets Dashboard</title>
        <meta name="description" content="View your attested property assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Header */}
      <div className="bg-white shadow-md">
        <NavigationBar 
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          getNetworkName={getNetworkName}
          formatAddress={formatAddress}
          connectWallet={connectWallet}
          isLoading={isLoading}
        />
      </div>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Your Property Assets</h1>
          <p className="text-gray-600 mt-2">View all your attested real-world properties</p>
        </div>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{errorMessage}</p>
          </div>
        )}
        
        {/* Wallet Connection Status */}
        {!walletConnected ? (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="mb-4">Connect your wallet to view your attested properties.</p>
            <button 
              onClick={connectWallet} 
              disabled={isLoading}
              className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <>
            {/* User Info and KYC Status */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">Dashboard</h2>
                  <p className="text-gray-600">Connected as: <span className="font-medium">{formatAddress(walletAddress)}</span></p>
                  <p className="text-gray-600">Network: <span className="font-medium">{getNetworkName()}</span></p>
                </div>
                
                {/* KYC Status */}
                <div className="mt-4 md:mt-0 p-3 rounded-lg border flex items-center">
                  {kycCompleted ? (
                    <>
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <div>
                        <span className="font-medium text-green-600">KYC Verified</span>
                        <p className="text-xs text-gray-500">Your identity has been verified</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                      <div>
                        <span className="font-medium text-yellow-600">KYC Not Completed</span>
                        <p className="text-xs text-gray-500">
                          <Link href="/listing" className="text-blue-500 underline">
                            Complete KYC verification
                          </Link>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Link href="/listing">
                  <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Add New Property
                  </button>
                </Link>
              </div>
            </div>
            
            {!kycCompleted ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">KYC Verification Required</h2>
                <p className="text-gray-600 mb-4">
                  You need to complete KYC verification before you can view your assets.
                </p>
                <Link href="/listing">
                  <button className="px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Complete KYC Verification
                  </button>
                </Link>
              </div>
            ) : isLoading ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your property assets...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">No Property Assets Found</h2>
                <p className="text-gray-600 mb-4">
                  You don't have any attested property assets yet.
                </p>
                <Link href="/listing">
                  <button className="px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Attest a Property
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Property Image */}
                    <div className="relative h-48">
                      {property.photoHashes && property.photoHashes.length > 0 && property.photoHashes[0] !== '' ? (
                        <img 
                          src={`https://ipfs.io/ipfs/${property.photoHashes[0]}`} 
                          alt={property.propertyName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 22V12h6v10"></path>
                          </svg>
                        </div>
                      )}
                      
                      {/* Verification Badge */}
                      {property.verified && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Verified
                        </div>
                      )}
                    </div>
                    
                    {/* Property Details */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{property.propertyName}</h3>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Address</div>
                        <div className="text-gray-700">{property.propertyAddress}</div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Deed Number</div>
                        <div className="text-gray-700">{property.deedNumber}</div>
                      </div>
                      
                      {property.ownerName && (
                        <div className="mb-3">
                          <div className="text-sm text-gray-500">Owner</div>
                          <div className="text-gray-700">{property.ownerName}</div>
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-500">Attestation Date</div>
                        <div className="text-gray-700">{formatDate(property.timestamp)}</div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                        <Link href={`/listing?property=${property.propertyIndex}`}>
                          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm">
                            View Details
                          </button>
                        </Link>
                        
                        <Link href="/derivative">
                          <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm">
                            Create Derivative
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} RWA Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// Add type definition for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, listener: (...args: any[]) => void) => void;
      removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
      selectedAddress?: string;
      chainId?: string;
    };
  }
} 