import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { createAttestationService } from '../utils/attestationService';
import { createKYCService } from '../utils/kycService';
import { createSBTService } from '../utils/sbtService';

interface WalletContextType {
  walletConnected: boolean;
  walletAddress: string;
  chainId: string;
  networkName: string;
  isLoading: boolean;
  errorMessage: string;
  attestationService: any;
  kycService: any;
  sbtService: any;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  formatAddress: (address: string) => string;
}

const WalletContext = createContext<WalletContextType>({
  walletConnected: false,
  walletAddress: '',
  chainId: '',
  networkName: '',
  isLoading: false,
  errorMessage: '',
  attestationService: null,
  kycService: null,
  sbtService: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  formatAddress: () => '',
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attestationService, setAttestationService] = useState<any>(null);
  const [kycService, setKycService] = useState<any>(null);
  const [sbtService, setSbtService] = useState<any>(null);
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get network name
  const getNetworkName = (): string => {
    switch (chainId) {
      case '0x1':
        return 'Ethereum Mainnet';
      case '0x5':
        return 'Goerli Testnet';
      case '0x11':
        return 'HashKey Chain Testnet';
      case '0x12':
        return 'HashKey Chain Mainnet';
      case '0x1388d1':
        return 'HashKey Chain Testnet';
      default:
        return 'Unknown Network';
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
      }
      
      // Initialize SBT service
      const sbt = await createSBTService();
      if (sbt) {
        setSbtService(sbt);
        console.log('SBT service initialized');
      }
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  };
  
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
          
          // Store in localStorage for persistence
          localStorage.setItem('walletConnected', 'true');
          localStorage.setItem('walletAddress', address);
          
          // Get network ID
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(chainIdHex);
          localStorage.setItem('chainId', chainIdHex);
          
          // Initialize services
          await initializeServices();
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
  
  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setChainId('');
    setAttestationService(null);
    setKycService(null);
    setSbtService(null);
    
    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('chainId');
  };
  
  // Handle wallet events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Handle account change
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          disconnectWallet();
        } else if (accounts[0] !== walletAddress) {
          // User switched account
          const newAddress = accounts[0];
          setWalletAddress(newAddress);
          localStorage.setItem('walletAddress', newAddress);
        }
      };
      
      // Handle chain change
      const handleChainChanged = (chainIdHex: string) => {
        setChainId(chainIdHex);
        localStorage.setItem('chainId', chainIdHex);
        // Don't reload the page, just update the state
      };
      
      // Subscribe to events
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup event listeners
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [walletAddress]);
  
  // Check if already connected when the component mounts
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined') {
        const isConnected = localStorage.getItem('walletConnected') === 'true';
        const savedAddress = localStorage.getItem('walletAddress');
        const savedChainId = localStorage.getItem('chainId');
        
        if (isConnected && savedAddress && window.ethereum) {
          try {
            // Verify the account is still accessible
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts.includes(savedAddress)) {
              setWalletConnected(true);
              setWalletAddress(savedAddress);
              
              if (savedChainId) {
                setChainId(savedChainId);
              } else {
                // Get current chain ID if not saved
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                setChainId(chainIdHex);
              }
              
              // Initialize services
              await initializeServices();
            } else {
              // Account no longer accessible, clear stored data
              disconnectWallet();
            }
          } catch (error) {
            console.error('Error checking stored connection:', error);
            disconnectWallet();
          }
        }
      }
    };
    
    checkConnection();
  }, []);
  
  const value = {
    walletConnected,
    walletAddress,
    chainId,
    networkName: getNetworkName(),
    isLoading,
    errorMessage,
    attestationService,
    kycService,
    sbtService,
    connectWallet,
    disconnectWallet,
    formatAddress,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 