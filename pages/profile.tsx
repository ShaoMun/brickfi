import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import NavigationBar from '../components/NavigationBar';
import { Press_Start_2P } from "next/font/google";
import { useWallet } from '../contexts/WalletContext';

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

// Define KYC Info interface
interface KYCInfo {
  isVerified: boolean;
  verificationTimestamp?: number;
  nationality?: string;
}

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

// Stable random function that generates the same values for particles
const generateStableRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export default function Profile() {
  // State variables
  const [isLoaded, setIsLoaded] = useState(false);
  const [kycInfo, setKycInfo] = useState<KYCInfo>({ isVerified: false });
  const [properties, setProperties] = useState<Property[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('properties'); // 'properties', 'kyc', 'activity'
  const [totalAssetsValue, setTotalAssetsValue] = useState(0);
  
  // Access wallet context
  const { 
    walletConnected, 
    walletAddress, 
    networkName, 
    isLoading, 
    connectWallet, 
    formatAddress,
    attestationService,
    kycService
  } = useWallet();
  
  // Precompute particle positions
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    top: `${generateStableRandom(i * 1) * 100}%`,
    left: `${generateStableRandom(i * 2) * 100}%`,
    delay: `${generateStableRandom(i * 3) * 5}s`,
    duration: `${3 + generateStableRandom(i * 4) * 7}s`
  }));
  
  // Check KYC status
  useEffect(() => {
    const checkKYCStatus = async () => {
      if (kycService && walletConnected && walletAddress) {
        try {
          console.log('Checking KYC status for address:', walletAddress);
          const hasPassedKYC = await kycService.hasPassedKYC(walletAddress);
          console.log('KYC verification status:', hasPassedKYC);
          
          // Create KYC info object
          const kycData: KYCInfo = {
            isVerified: hasPassedKYC,
          };
          
          if (hasPassedKYC) {
            // Get verification timestamp
            const timestamp = await kycService.getVerificationTimestamp(walletAddress);
            if (timestamp > 0) {
              kycData.verificationTimestamp = timestamp;
              const date = new Date(timestamp * 1000);
              console.log(`KYC verified on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
            }
          }
          
          setKycInfo(kycData);
        } catch (error) {
          console.error('Error checking KYC status:', error);
        }
      }
    };
    
    checkKYCStatus();
  }, [kycService, walletConnected, walletAddress]);
  
  // Fetch properties when services are ready
  useEffect(() => {
    const fetchProperties = async () => {
      if (attestationService && walletConnected && walletAddress) {
        try {
          const props = await attestationService.getProperties(walletAddress);
          setProperties(props || []);
          
          // Calculate total asset value (mock calculation for demonstration)
          if (props && props.length > 0) {
            // This would be replaced with actual value calculation from blockchain
            const totalValue = props.reduce((sum: number, property: Property) => {
              // Mock value calculation based on property timestamp (newer = higher value)
              const baseValue = 50000; // Base value in USD
              const ageValue = property.timestamp ? Math.max(0, (Date.now()/1000 - property.timestamp)) / 86400 * 100 : 0;
              return sum + baseValue + ageValue;
            }, 0);
            
            setTotalAssetsValue(Math.round(totalValue));
          }
        } catch (error) {
          console.error('Error fetching properties:', error);
          setErrorMessage('Failed to fetch property data');
        }
      }
    };
    
    fetchProperties();
  }, [attestationService, walletConnected, walletAddress]);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  return (
    <div className={`${pressStart2P.variable} min-h-screen relative overflow-hidden`}>
      <Head>
        <title>User Profile | RWA DeFi</title>
        <meta name="description" content="View your profile and RWA assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Pixel art background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image 
          src="/page_bg.svg" 
          alt="Pixel Art Background" 
          layout="fill"
          objectFit="cover"
          quality={100}
          priority
        />
      </div>

      {/* Yellow particles animation */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {particles.map((particle, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-[#FFC107] rounded-full animate-pulse"
            style={{
              top: particle.top,
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration
            }}
          />
        ))}
      </div>
      
      {/* Main content */}
      <div className="relative z-20 w-full h-full min-h-screen">
        {/* Header */}
        <NavigationBar />
      
        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {errorMessage && (
            <div className="backdrop-blur-sm bg-red-500/20 border border-red-500 px-4 py-3 rounded mb-4">
              <p className="text-white text-sm">{errorMessage}</p>
            </div>
          )}
          
          {/* Wallet Connection Status */}
          {!walletConnected ? (
            <div className={`backdrop-blur-sm bg-black/30 p-6 rounded-lg max-w-md mx-auto ${isLoaded ? 'pixel-animation' : 'opacity-0'}`}>
              <h2 className="text-xl font-bold mb-4 text-white">Connect Your Wallet</h2>
              <p className="mb-4 text-white/90 text-sm">Connect your wallet to view your profile and assets.</p>
              <button 
                onClick={connectWallet} 
                disabled={isLoading}
                className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white mx-auto block"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <>
              {/* Profile Summary */}
              <div className={`mb-6 grid grid-cols-1 md:grid-cols-4 gap-6 ${isLoaded ? 'pixel-animation' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
                {/* User Identity Card */}
                <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg col-span-1">
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 rounded-full bg-[#6200EA]/30 flex items-center justify-center mb-4 border-2 border-[#6200EA]">
                      <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{formatAddress(walletAddress)}</h3>
                    <p className="text-[#FFD54F] text-xs mb-4">{networkName}</p>
                    
                    {/* KYC Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${kycInfo.isVerified ? 'bg-green-500/30 text-green-200 border border-green-500' : 'bg-yellow-500/30 text-yellow-200 border border-yellow-500'}`}>
                      {kycInfo.isVerified ? 'KYC Verified' : 'KYC Not Verified'}
                    </div>
                    
                    {kycInfo.verificationTimestamp && (
                      <p className="text-xs text-gray-300 mt-2">
                        Verified on {formatDate(kycInfo.verificationTimestamp)}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-200 mb-1">Total Properties</h3>
                    <p className="text-3xl font-bold text-white">{properties.length}</p>
                  </div>
                  
                  <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg">
                    <h3 className="text-sm font-medium text-green-200 mb-1">Estimated Value</h3>
                    <p className="text-3xl font-bold text-white">${totalAssetsValue.toLocaleString()}</p>
                  </div>
                  
                  <div className="p-4 bg-purple-500/20 border border-purple-500 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-200 mb-1">Created Derivatives</h3>
                    <p className="text-3xl font-bold text-white">0</p>
                  </div>
                </div>
              </div>
              
              {/* Content Tabs */}
              <div className={`backdrop-blur-sm bg-black/30 rounded-lg overflow-hidden mb-6 ${isLoaded ? 'pixel-animation' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
                <div className="flex border-b border-gray-600">
                  <button
                    className={`flex-1 py-4 px-6 text-center font-medium text-xs ${activeTab === 'properties' ? 'text-[#FFD54F] border-b-2 border-[#FFD54F]' : 'text-gray-300 hover:text-white'}`}
                    onClick={() => setActiveTab('properties')}
                  >
                    Properties
                  </button>
                  <button
                    className={`flex-1 py-4 px-6 text-center font-medium text-xs ${activeTab === 'kyc' ? 'text-[#FFD54F] border-b-2 border-[#FFD54F]' : 'text-gray-300 hover:text-white'}`}
                    onClick={() => setActiveTab('kyc')}
                  >
                    KYC Information
                  </button>
                  <button
                    className={`flex-1 py-4 px-6 text-center font-medium text-xs ${activeTab === 'activity' ? 'text-[#FFD54F] border-b-2 border-[#FFD54F]' : 'text-gray-300 hover:text-white'}`}
                    onClick={() => setActiveTab('activity')}
                  >
                    Activity
                  </button>
                </div>
                
                <div className="p-6">
                  {/* Properties Tab */}
                  {activeTab === 'properties' && (
                    <>
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD54F] mx-auto mb-4"></div>
                          <p className="text-gray-300 text-sm">Loading your property assets...</p>
                        </div>
                      ) : properties.length === 0 ? (
                        <div className="text-center py-8">
                          <h3 className="text-xl font-semibold mb-4 text-white">No Property Assets Found</h3>
                          <p className="text-gray-300 mb-4 text-sm">
                            You don't have any attested property assets yet.
                          </p>
                          <Link href="/listing">
                            <button className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white">
                              Attest a Property
                            </button>
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {properties.map((property, index) => (
                            <div key={index} className="backdrop-blur-sm bg-black/20 border border-gray-600 rounded-lg overflow-hidden hover:border-[#FFD54F] transition-all">
                              {/* Property Image */}
                              <div className="relative h-48">
                                {property.photoHashes && property.photoHashes.length > 0 && property.photoHashes[0] !== '' ? (
                                  <img 
                                    src={`https://ipfs.io/ipfs/${property.photoHashes[0]}`} 
                                    alt={property.propertyName} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-black/40">
                                    <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 22V12h6v10"></path>
                                    </svg>
                                  </div>
                                )}
                                
                                {/* Verification Badge */}
                                {property.verified && (
                                  <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                                    Verified
                                  </div>
                                )}
                              </div>
                              
                              {/* Property Details */}
                              <div className="p-4">
                                <h3 className="text-lg font-semibold text-white mb-2">{property.propertyName}</h3>
                                
                                <div className="mb-3">
                                  <div className="text-xs text-[#FFD54F]">Address</div>
                                  <div className="text-gray-300 text-sm">{property.propertyAddress}</div>
                                </div>
                                
                                <div className="mb-3">
                                  <div className="text-xs text-[#FFD54F]">Deed Number</div>
                                  <div className="text-gray-300 text-sm">{property.deedNumber}</div>
                                </div>
                                
                                <div className="mb-3">
                                  <div className="text-xs text-[#FFD54F]">Attestation Date</div>
                                  <div className="text-gray-300 text-sm">{formatDate(property.timestamp)}</div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between">
                                  <Link href={`/listing?property=${property.propertyIndex}`}>
                                    <button className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white">
                                      View Details
                                    </button>
                                  </Link>
                                  
                                  <Link href="/derivative">
                                    <button className="pixel-btn bg-transparent border-[#4CAF50] border-2 py-2 px-3 text-xs text-white hover:bg-[#4CAF50]/50 transition-colors">
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
                  
                  {/* KYC Information Tab */}
                  {activeTab === 'kyc' && (
                    <div className="max-w-3xl mx-auto">
                      <h3 className="text-xl font-semibold mb-6 text-white">KYC Information</h3>
                      
                      {!kycInfo.isVerified ? (
                        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-6 text-center">
                          <div className="h-16 w-16 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-yellow-300 mb-2">KYC Not Verified</h4>
                          <p className="text-gray-300 mb-4 text-sm">You have not completed KYC verification yet.</p>
                          <Link href="/listing">
                            <button className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white">
                              Complete KYC Verification
                            </button>
                          </Link>
                        </div>
                      ) : (
                        <div className="bg-green-500/20 border border-green-500 rounded-lg p-6">
                          <div className="flex items-center justify-center mb-6">
                            <div className="h-16 w-16 bg-green-500/30 rounded-full flex items-center justify-center mr-4">
                              <svg className="h-8 w-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-green-300">KYC Verified</h4>
                              <p className="text-gray-300 text-sm">Your identity has been verified on the blockchain</p>
                            </div>
                          </div>
                          
                          <div className="border-t border-green-600 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="text-sm font-medium text-green-300 mb-1">Verification Date</h5>
                                <p className="text-white">{kycInfo.verificationTimestamp ? formatDate(kycInfo.verificationTimestamp) : 'N/A'}</p>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-green-300 mb-1">Wallet Address</h5>
                                <p className="text-white">{walletAddress}</p>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-green-300 mb-1">Network</h5>
                                <p className="text-white">{networkName}</p>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-green-300 mb-1">Verification Status</h5>
                                <p className="text-white">Active</p>
                              </div>
                            </div>
                            
                            <div className="mt-6 p-4 bg-green-500/10 rounded text-sm text-green-200">
                              <p>Your KYC verification is stored securely on the blockchain. This verification enables you to attest properties and create derivatives.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Activity Tab */}
                  {activeTab === 'activity' && (
                    <div>
                      <h3 className="text-xl font-semibold mb-6 text-white">Recent Activity</h3>
                      
                      {properties.length === 0 ? (
                        <div className="text-center py-8">
                          <h4 className="text-lg font-medium text-gray-300 mb-2">No Activity Yet</h4>
                          <p className="text-gray-400 mb-4 text-sm">Your blockchain activity will appear here once you start attesting properties or creating derivatives.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {properties.map((property, index) => (
                            <div key={index} className="flex items-start p-4 border border-gray-600 rounded-lg bg-black/20">
                              <div className="h-10 w-10 rounded-full bg-blue-500/30 flex items-center justify-center mr-4 flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </div>
                              <div className="flex-grow">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-medium text-white">Property Attested</h4>
                                  <span className="text-xs text-gray-400">{formatDate(property.timestamp)}</span>
                                </div>
                                <p className="text-gray-300 text-sm">You attested property <span className="font-medium text-[#FFD54F]">{property.propertyName}</span> with deed number <span className="font-medium text-[#FFD54F]">{property.deedNumber}</span></p>
                                <div className="mt-2 flex space-x-2">
                                  <Link href={`/listing?property=${property.propertyIndex}`}>
                                    <button className="text-xs text-blue-300 hover:text-blue-200">View Details</button>
                                  </Link>
                                  {!property.verified && (
                                    <button className="text-xs text-gray-400 hover:text-gray-300">Pending Verification</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
        
        {/* Footer */}
        <footer className="container mx-auto py-6 px-4 relative z-20">
          <div className="flex flex-col md:flex-row justify-between items-center backdrop-blur-sm bg-black/30 p-4 rounded-lg">
            <p className="text-xs text-white/70">© {new Date().getFullYear()} RWA DeFi. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="pixel-btn bg-transparent border-white/50 border px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition-colors">Discord</a>
              <a href="#" className="pixel-btn bg-transparent border-white/50 border px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition-colors">Twitter</a>
              <a href="#" className="pixel-btn bg-transparent border-white/50 border px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition-colors">Docs</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 