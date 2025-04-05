import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '../contexts/WalletContext';

export default function NavigationBar() {
  const { 
    walletConnected, 
    walletAddress, 
    networkName, 
    isLoading, 
    connectWallet, 
    formatAddress 
  } = useWallet();

  return (
    <header className="container mx-auto flex justify-between items-center pt-6 px-4">
      <Link href="/" className="flex items-center cursor-pointer">
        <div className="bg-black/30 backdrop-blur-sm p-2 rounded">
          <Image 
            src="/images/pixel-logo.svg" 
            alt="RWA DeFi Logo" 
            width={45} 
            height={45}
            priority
          />
        </div>
        <h1 className="ml-4 text-xl font-bold text-white">RWA<span className="text-[#FFD54F]">DeFi</span></h1>
      </Link>

      <div className="flex items-center space-x-4">
        <Link href="/listing" className="pixel-btn bg-transparent backdrop-blur-sm border-[#6200EA] border-2 py-2 px-3 text-xs text-white hover:bg-[#6200EA]/50 transition-colors">
          Listing
        </Link>
        
        <Link href="/derivative" className="pixel-btn bg-transparent backdrop-blur-sm border-[#4CAF50] border-2 py-2 px-3 text-xs text-white hover:bg-[#4CAF50]/50 transition-colors">
          Derivative
        </Link>
        
        <Link href="/marketplace" className="pixel-btn bg-transparent backdrop-blur-sm border-[#FFC107] border-2 py-2 px-3 text-xs text-white hover:bg-[#FFC107]/50 transition-colors">
          Marketplace
        </Link>
        
        <Link href="/profile" className="pixel-btn bg-transparent backdrop-blur-sm border-[#FF5722] border-2 py-2 px-3 text-xs text-white hover:bg-[#FF5722]/50 transition-colors">
          Profile
        </Link>
        
        {walletConnected ? (
          <div className="flex items-center bg-black/30 backdrop-blur-sm px-4 py-2 rounded">
            <div className="h-2 w-2 rounded-full bg-green-400 mr-2"></div>
            <span className="text-sm font-medium text-white">{formatAddress(walletAddress)}</span>
          </div>
        ) : (
          <button 
            onClick={connectWallet} 
            disabled={isLoading}
            className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
} 