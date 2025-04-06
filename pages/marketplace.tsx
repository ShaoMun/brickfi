import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import NavigationBar from '../components/NavigationBar';
import { useRouter } from 'next/router';

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, listener: (...args: any[]) => void) => void;
      removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
    };
  }
}

// Define Security Token interface
interface SecurityToken {
  id: string;
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  documentURI: string;
  industry: string;
  assetType: string;
  tokenValue: string;
  offeringSize: string;
  dividendFrequency: string;
  maturityDate: string;
  creator: string;
  createdAt: number;
}

export default function Marketplace() {
  const router = useRouter();
  
  // State variables
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [tokens, setTokens] = useState<SecurityToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [factoryContract, setFactoryContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'correct'|'wrong'|'unknown'>('unknown');
  const [lastMintTime, setLastMintTime] = useState<number>(0);
  const [recentlyMinted, setRecentlyMinted] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  
  // Constants
  const POLYGON_AMOY_CHAIN_ID = 80002;
  const FACTORY_ADDRESS = "0xDC78dfFa733c818d8fee81ec410BA32c9c249016";
  const FACTORY_ABI = [
    "function getTokenCount() external view returns (uint256)",
    "function getAllTokens() external view returns (address[])",
    "function getTokenById(uint256 tokenId) external view returns (address)",
    "function getTokenData(address tokenAddress) external view returns (tuple(uint256 id, string name, string symbol, uint256 totalSupply, string documentURI, string industry, string assetType, uint256 tokenValue, uint256 offeringSize, string dividendFrequency, string maturityDate, address creator, uint256 createdAt))",
    "function getTokenAt(uint256 index) external view returns (address)",
    "event TokenCreated(uint256 indexed id, address indexed tokenAddress, string name, string symbol, uint256 totalSupply, address indexed creator)"
  ];

  // Check for recent minting transaction
  useEffect(() => {
    // Check if user just minted a token from localStorage
    const lastMintTxHash = localStorage.getItem('lastMintTxHash');
    const lastMintTimestamp = localStorage.getItem('lastMintTimestamp');
    
    if (lastMintTxHash && lastMintTimestamp) {
      const timeSinceMint = Date.now() - parseInt(lastMintTimestamp);
      
      // If minted within the last 5 minutes, consider it recent
      if (timeSinceMint < 5 * 60 * 1000) {
        setRecentlyMinted(true);
        setMintTxHash(lastMintTxHash);
        setLastMintTime(parseInt(lastMintTimestamp));
        
        // Trigger immediate refresh
        setRefreshTrigger(prev => prev + 1);
        
        // Start an immediate polling sequence for new token
        let pollCount = 0;
        const pollInterval = setInterval(() => {
          if (factoryContract) {
            console.log(`Polling for new token (attempt ${pollCount + 1})...`);
            fetchTokens(factoryContract);
            pollCount++;
            
            // Stop polling after 10 attempts (50 seconds total)
            if (pollCount >= 10) {
              clearInterval(pollInterval);
            }
          }
        }, 5000);
        
        // Clear localStorage after we've started polling
        setTimeout(() => {
          localStorage.removeItem('lastMintTxHash');
          localStorage.removeItem('lastMintTimestamp');
        }, 10000);
        
        // Clean up interval if component unmounts
        return () => {
          clearInterval(pollInterval);
        };
      }
    }
  }, [factoryContract]); // Added factoryContract as dependency
  
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
          const parsedChainId = parseInt(chainIdHex, 16);
          setChainId(parsedChainId);
          
          // Initialize provider and signer
          if (window.ethereum) {
            const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
            setProvider(web3Provider);
            const web3Signer = await web3Provider.getSigner();
            setSigner(web3Signer);
            
            // Initialize contract
            initializeContract(web3Provider, web3Signer);
          }
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
  
  // Initialize contract
  const initializeContract = async (
    provider: ethers.Provider,
    signer: ethers.Signer
  ) => {
    try {
      // Check if we're on the correct network
      const network = await provider.getNetwork();
      const currentChainId = parseInt(network.chainId.toString());
      
      // If we're not on Polygon Amoy, let's set the network status
      if (currentChainId !== POLYGON_AMOY_CHAIN_ID) {
        setNetworkStatus('wrong');
        console.log(`Connected to chain ${currentChainId}, but need to be on Polygon Amoy (${POLYGON_AMOY_CHAIN_ID})`);
        return;
      } else {
        setNetworkStatus('correct');
      }
      
      const contract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
      setFactoryContract(contract);
      
      // Fetch tokens after initializing contract
      await fetchTokens(contract);
      
      // If we recently minted a token, fetch more aggressively to make it show up faster
      if (recentlyMinted) {
        // Set up repeated fetching for new tokens
        const fetchInterval = setInterval(() => {
          console.log("Auto-refreshing after mint...");
          fetchTokens(contract);
        }, 5000); // Every 5 seconds
        
        // Stop refreshing after 30 seconds
        setTimeout(() => {
          clearInterval(fetchInterval);
          setRecentlyMinted(false);
        }, 30000);
      }
    } catch (error) {
      console.error('Contract initialization error:', error);
      setErrorMessage('Failed to initialize contract');
    }
  };
  
  // Switch to Polygon Amoy network
  const switchToPolygonAmoy = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    
    try {
      setIsNetworkSwitching(true);
      setErrorMessage('');
      console.log('Switching to Polygon Amoy network...');
      
      // First try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}` }],
      });
      
      // Wait for the network to switch (this helps with timing issues)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify we're on the correct network
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const parsedChainId = parseInt(chainIdHex, 16);
      
      if (parsedChainId !== POLYGON_AMOY_CHAIN_ID) {
        throw new Error(`Failed to switch to Polygon Amoy. Current chain ID: ${parsedChainId}`);
      }
      
      console.log('Successfully switched to Polygon Amoy');
      setNetworkStatus('correct');
      
      // Re-initialize provider, signer and contract after network switch
      if (window.ethereum) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
        setProvider(web3Provider);
        const web3Signer = await web3Provider.getSigner();
        setSigner(web3Signer);
        
        // Initialize contract on Polygon Amoy
        await initializeContract(web3Provider, web3Signer);
      }
      
    } catch (switchError: any) {
      console.error('Switch network error:', switchError);
      
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`,
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                blockExplorerUrls: ['https://amoy.polygonscan.com/'],
              },
            ],
          });
          
          // Wait for the network to be added
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try switching again after adding
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}` }],
          });
          
          // Wait again after switching
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Re-initialize
          if (window.ethereum) {
            const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
            setProvider(web3Provider);
            const web3Signer = await web3Provider.getSigner();
            setSigner(web3Signer);
            await initializeContract(web3Provider, web3Signer);
          }
          
          setNetworkStatus('correct');
        } catch (addError) {
          console.error('Failed to add Polygon Amoy network:', addError);
          setErrorMessage('Failed to add Polygon Amoy network to your wallet.');
          setNetworkStatus('wrong');
        }
      } else {
        console.error('Failed to switch to Polygon Amoy:', switchError);
        setErrorMessage('Failed to switch to Polygon Amoy. Please try manually switching in your wallet.');
        setNetworkStatus('wrong');
      }
    } finally {
      setIsNetworkSwitching(false);
    }
  };
  
  // Fetch tokens from the factory contract
  const fetchTokens = async (contract = factoryContract) => {
    if (!contract) return;
    
        setIsLoading(true);
        try {
      // Get token count
      const count = await contract.getTokenCount();
      console.log(`Found ${count.toString()} tokens on the factory`);
      
      // Get all token addresses
      const tokenAddresses = await contract.getAllTokens();
      console.log('Token addresses:', tokenAddresses);
      
      // If we recently minted and don't see any tokens yet, try again in a bit
      if (recentlyMinted && tokenAddresses.length === 0) {
        setTimeout(() => {
          console.log("No tokens found after mint, retrying...");
          fetchTokens(contract);
        }, 5000);
      }
      
      const tokenPromises = tokenAddresses.map(async (address: string) => {
        // Get token data for each address
        const data = await contract.getTokenData(address);
        
        // Format the data
        return {
          id: data.id.toString(),
          address: address,
          name: data.name,
          symbol: data.symbol,
          totalSupply: ethers.formatEther(data.totalSupply),
          documentURI: data.documentURI,
          industry: data.industry,
          assetType: data.assetType,
          tokenValue: ethers.formatEther(data.tokenValue),
          offeringSize: ethers.formatEther(data.offeringSize),
          dividendFrequency: data.dividendFrequency,
          maturityDate: data.maturityDate,
          creator: data.creator,
          createdAt: Number(data.createdAt)
        };
      });
      
      const tokenData = await Promise.all(tokenPromises);
      
      // Sort tokens by creation date (newest first)
      const sortedTokens = tokenData.sort((a, b) => b.createdAt - a.createdAt);
      
      setTokens(sortedTokens);
        } catch (error) {
      console.error('Error fetching tokens:', error);
      setErrorMessage('Failed to fetch token data');
        } finally {
          setIsLoading(false);
        }
  };
  
  // Handle events to detect new tokens
  useEffect(() => {
    if (factoryContract) {
      // Listen for TokenCreated events
      const tokenCreatedFilter = factoryContract.filters.TokenCreated();
      
      const handleTokenCreated = (id: bigint, tokenAddress: string, name: string, symbol: string, totalSupply: bigint, creator: string) => {
        console.log(`New token created: ${name} (${symbol}) at ${tokenAddress}`);
        // Refresh tokens list when a new token is created
        fetchTokens();
      };
      
      // Add event listener
      factoryContract.on(tokenCreatedFilter, handleTokenCreated);
      
      // Cleanup function
      return () => {
        factoryContract.off(tokenCreatedFilter, handleTokenCreated);
      };
    }
  }, [factoryContract]);
  
  // Check wallet connection on page load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Get accounts if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            
            // Get current chain ID
            window.ethereum.request({ method: 'eth_chainId' })
              .then(async (chainIdHex: string) => {
                const parsedChainId = parseInt(chainIdHex, 16);
                setChainId(parsedChainId);
                
                // Check if we're on the correct network
                if (parsedChainId === POLYGON_AMOY_CHAIN_ID) {
                  setNetworkStatus('correct');
                } else {
                  setNetworkStatus('wrong');
                  console.warn(`Connected to wrong network. Expected ${POLYGON_AMOY_CHAIN_ID}, got ${parsedChainId}`);
                }
                
                // Initialize provider and signer
                if (window.ethereum) {
                  const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
                  setProvider(web3Provider);
                  const web3Signer = await web3Provider.getSigner();
                  setSigner(web3Signer);
                  
                  // Initialize contract
                  initializeContract(web3Provider, web3Signer);
                }
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
      
      // Setup event listeners
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setWalletConnected(false);
          setWalletAddress('');
          setTokens([]);
          setNetworkStatus('unknown');
        } else if (accounts[0] !== walletAddress) {
          // User switched accounts
          setWalletAddress(accounts[0]);
          // Refresh data
          if (factoryContract) {
            fetchTokens();
          }
        }
      };
      
      const handleChainChanged = async (chainIdHex: string) => {
        const parsedChainId = parseInt(chainIdHex, 16);
        setChainId(parsedChainId);
        
        // Check if we're on the correct network
        if (parsedChainId === POLYGON_AMOY_CHAIN_ID) {
          setNetworkStatus('correct');
        } else {
          setNetworkStatus('wrong');
          console.warn(`Chain changed to wrong network. Expected ${POLYGON_AMOY_CHAIN_ID}, got ${parsedChainId}`);
        }
        
        // Reinitialize when chain changes
        if (window.ethereum) {
          const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
          setProvider(web3Provider);
          const web3Signer = await web3Provider.getSigner();
          setSigner(web3Signer);
          
          // Initialize contract on the new chain
          initializeContract(web3Provider, web3Signer);
        }
      };
      
      // Add event listeners
      if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
        // Cleanup
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
    }
  }, [walletAddress]);
  
  // Refresh tokens every minute to catch new tokens
  useEffect(() => {
    const interval = setInterval(() => {
      if (factoryContract) {
        fetchTokens();
      }
    }, 60000); // 1 minute
    
    return () => clearInterval(interval);
  }, [factoryContract]);
  
  // Watch for refresh trigger
  useEffect(() => {
    if (refreshTrigger > 0 && factoryContract) {
      fetchTokens();
    }
  }, [refreshTrigger]);
  
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
  
  // Get token image
  const getTokenImage = (token: SecurityToken) => {
    // Extract image from IPFS URI if possible
    if (token.documentURI && token.documentURI.startsWith('ipfs://')) {
      return `/images/property${(parseInt(token.id) % 3) + 1}.png`;
    }
    
    // Fallback images
    return `/images/property${(parseInt(token.id) % 3) + 1}.png`;
  };
  
  // Get background color based on token industry
  const getBackgroundColor = (industry: string) => {
    const industries = {
      'Real Estate': 'bg-gradient-to-br from-blue-500 to-purple-600',
      'Commercial': 'bg-gradient-to-br from-green-500 to-teal-600',
      'Residential': 'bg-gradient-to-br from-orange-500 to-red-600',
      'Industrial': 'bg-gradient-to-br from-gray-600 to-gray-800'
    };
    
    return industries[industry as keyof typeof industries] || 'bg-gradient-to-br from-indigo-500 to-purple-600';
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Security Token Marketplace | Polygon Amoy</title>
        <meta name="description" content="Browse and invest in tokenized real-world assets on Polygon Amoy" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Header */}
      <div className="bg-gray-800 shadow-xl border-b border-gray-700">
        <NavigationBar />
      </div>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Security Token Marketplace
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Browse tokenized real-world assets on Polygon Amoy. Invest in fractional ownership of property and other high-value assets.
          </p>
        </div>
        
        {/* Wallet Connection Status */}
        <div className="mb-8">
        {!walletConnected ? (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-6">Connect your wallet to browse tokenized assets on Polygon Amoy.</p>
            <button 
              onClick={connectWallet} 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
                {errorMessage && <p className="text-red-400 mt-3">{errorMessage}</p>}
              </div>
          </div>
        ) : (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <p className="text-gray-400">Connected Wallet:</p>
                  <p className="font-mono text-sm">{walletAddress}</p>
                </div>
                      <div>
                  <p className="text-gray-400">Network:</p>
                  <div className="flex items-center">
                    {networkStatus === 'correct' ? (
                      <span className="flex items-center text-green-400">
                        <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                        Polygon Amoy
                      </span>
                    ) : networkStatus === 'wrong' ? (
                      <span className="flex items-center text-red-400">
                        <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-2"></span>
                        Wrong Network
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-400">
                        <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                        Connecting...
                      </span>
                  )}
                </div>
              </div>
                <div className="mt-4 sm:mt-0">
                  {networkStatus === 'wrong' && (
                    <button
                      onClick={switchToPolygonAmoy}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Switch to Polygon Amoy
                    </button>
                  )}
                  <button
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    className="ml-3 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          )}
            </div>
            
        {/* Create Token Button */}
        {walletConnected && networkStatus === 'correct' && (
          <div className="mb-8 text-center">
                <Link href="/listing">
              <button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
                Create New Security Token
                  </button>
                </Link>
              </div>
        )}
        
        {/* Tokens List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Available Security Tokens</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-2">No tokens found</h3>
              <p className="text-gray-400 mb-6">
                {walletConnected && networkStatus === 'correct'
                  ? "There are no security tokens available yet. Be the first to create one!"
                  : walletConnected
                  ? "Please switch to Polygon Amoy network to view tokens."
                  : "Connect your wallet to view available tokens."}
              </p>
              {walletConnected && networkStatus === 'correct' && (
                <Link href="/listing">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">
                    Create Token
                  </button>
                </Link>
              )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 transition-transform duration-300 hover:transform hover:scale-105"
                >
                  <div className={`h-40 relative ${getBackgroundColor(token.industry)}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image
                        src={getTokenImage(token)}
                        alt={token.name}
                        width={200}
                        height={160}
                        objectFit="cover"
                        className="mix-blend-overlay opacity-75"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm font-semibold">
                        #{token.id}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 z-10">
                      <span className="bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm font-semibold">
                        {token.symbol}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <h3 className="text-xl font-bold text-white truncate">{token.name}</h3>
                    </div>
                        </div>
                  
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Industry:</span>
                        <span className="font-medium">{token.industry}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Asset Type:</span>
                        <span className="font-medium">{token.assetType}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Token Value:</span>
                        <span className="font-medium">${parseFloat(token.tokenValue).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Supply:</span>
                        <span className="font-medium">{parseInt(token.totalSupply).toLocaleString()} tokens</span>
                        </div>
                    </div>
                    
                    <div className="mb-4 pt-4 border-t border-gray-700">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Dividends:</span>
                        <span className="font-medium">{token.dividendFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Maturity:</span>
                        <span className="font-medium">{token.maturityDate}</span>
                      </div>
                        </div>
                    
                    <div className="text-xs text-gray-500 mb-4">
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{formatDate(token.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Creator:</span>
                        <span className="font-mono">{formatAddress(token.creator)}</span>
                      </div>
                      </div>
                      
                    <div className="mt-6 flex space-x-2">
                      <a
                        href={`https://amoy.polygonscan.com/token/${token.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex-1 text-center"
                      >
                        View on Explorer
                      </a>
                      <button
                        onClick={() => router.push(`/token/${token.id}`)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex-1"
                      >
                        Details
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
        
        {/* Marketplace Info */}
        <div className="rounded-lg bg-gray-800 p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">About the Marketplace</h2>
          <p className="text-gray-400 mb-4">
            This marketplace showcases security tokens that comply with the ERC3643 standard, offering compliant tokenized assets on the Polygon Amoy network.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-2">Automated Compliance</h3>
              <p className="text-gray-400 text-sm">All tokens enforce KYC verification and regulatory compliance.</p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-2">Transparent Ownership</h3>
              <p className="text-gray-400 text-sm">Every asset is backed by verifiable real-world documentation.</p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-2">Low Gas Fees</h3>
              <p className="text-gray-400 text-sm">Polygon Amoy offers fast transactions with minimal gas costs.</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 py-6 mt-16 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© 2023 Security Token Marketplace. All rights reserved.</p>
          <p className="mt-2">Running on Polygon Amoy Testnet</p>
        </div>
      </footer>
    </div>
  );
} 