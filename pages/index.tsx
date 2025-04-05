import Image from "next/image";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import NavigationBar from "../components/NavigationBar";

// Import Press Start 2P font
import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

// Stable random function that generates the same values on server and client
const generateStableRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Client-side random values
  const [clientSideRendered, setClientSideRendered] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
    setClientSideRendered(true);
    
    // Check if wallet is already connected
    if (typeof window !== 'undefined' && window.ethereum) {
      // Use type assertion to tell TypeScript that ethereum exists
      const ethereum = window.ethereum as NonNullable<typeof window.ethereum>;
      ethereum.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            
            // Get network info
            ethereum.request({ method: "eth_chainId" })
              .then(updateNetworkName);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Update network name based on chainId
  const updateNetworkName = (chainId: string | undefined) => {
    if (!chainId) return;
    
    const networks: Record<string, string> = {
      "0x1": "Ethereum Mainnet",
      "0x5": "Goerli Testnet",
      "0x89": "Polygon",
      "0x13881": "Mumbai Testnet",
      "0x1388d1": "HashKey Chain Testnet"
    };
    
    const name = networks[chainId] || `Chain ID: ${parseInt(chainId, 16)}`;
    setNetworkName(name);
  };

  // Handle accounts changed event
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      setWalletConnected(false);
      setWalletAddress("");
      setWalletError("Wallet disconnected.");
    } else {
      // Update with the new account
      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      setWalletError(null);
    }
  };

  // Handle chain changed event
  const handleChainChanged = (chainId: string) => {
    updateNetworkName(chainId);
    // Refresh the page on chain change as recommended by MetaMask
    window.location.reload();
  };

  // Handle disconnect event
  const handleDisconnect = (error: { code: number; message: string }) => {
    console.log("Wallet disconnected:", error);
    setWalletConnected(false);
    setWalletAddress("");
  };

  // Real wallet connection implementation
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setWalletError("No Ethereum wallet detected. Please install MetaMask.");
        return;
      }
      
      // Reset wallet error
      setWalletError(null);
      
      // If already connected, disconnect by resetting state
      if (walletConnected) {
        setWalletConnected(false);
        setWalletAddress("");
        return;
      }
      
      // Request account access
      console.log("Requesting wallet accounts...");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      console.log("Accounts received:", accounts);
      
      if (accounts.length === 0) {
        setWalletError("No accounts found. Please create an account in your wallet.");
        return;
      }
      
      const address = accounts[0];
      console.log("Connected to wallet address:", address);
      setWalletAddress(address);
      setWalletConnected(true);
      
      // Get and update network information
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      updateNetworkName(chainId);
      
      // Subscribe to accounts change
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      
      // Subscribe to chainId change
      window.ethereum.on("chainChanged", handleChainChanged);
      
      // Subscribe to disconnect
      window.ethereum.on("disconnect", handleDisconnect);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      // Handle specific MetaMask errors
      if (error.code === 4001) {
        // User rejected the request
        setWalletError("Connection rejected. Please approve the connection request.");
      } else {
        setWalletError(`Failed to connect wallet: ${error.message || "Unknown error"}`);
      }
    }
  };

  // Precompute particle positions
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    top: `${generateStableRandom(i * 1) * 100}%`,
    left: `${generateStableRandom(i * 2) * 100}%`,
    delay: `${generateStableRandom(i * 3) * 5}s`,
    duration: `${3 + generateStableRandom(i * 4) * 7}s`
  }));

  return (
    <div className={`${pressStart2P.variable} min-h-screen relative overflow-hidden`}>
      <Head>
        <title>RWA DeFi - Real World Assets on the Blockchain</title>
        <meta name="description" content="Bringing real world assets to DeFi with our revolutionary blockchain platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Pixel art forest house background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image 
          src="/page_bg.svg" 
          alt="Pixel Art Forest House" 
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
        <NavigationBar />

        <main className="container mx-auto flex items-center px-4" style={{ minHeight: "calc(100vh - 100px)" }}>
          <div className={`w-full md:w-1/2 backdrop-blur-sm bg-black/30 p-6 rounded-lg ${isLoaded ? 'pixel-animation' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <h2 className="pixel-header text-lg mb-6 inline-block">Real World Assets</h2>
            <h3 className="text-3xl font-bold mb-6 text-white pixel-text">Tokenize Your <br /> Real World <span className="text-[#FFD54F]">Assets</span></h3>
            <p className="mb-8 text-sm pixel-text text-white/90">
              Transform physical properties into blockchain tokens with our revolutionary DeFi platform. 
              List properties, create derivatives, borrow against your assets, and build your digital real estate portfolio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/listing">
                <button className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white">Launch App</button>
              </Link>
              <button className="pixel-btn bg-transparent border-white border-2 text-xs py-3 px-6 text-white hover:bg-white/10">Learn More</button>
            </div>
            
            {/* Wallet error message */}
            {walletError && (
              <div className="mt-4 px-4 py-3 bg-red-500/20 border border-red-500 rounded-lg">
                <p className="text-xs text-white">{walletError}</p>
              </div>
            )}
            
            {/* Network information */}
            {walletConnected && networkName && (
              <div className="mt-4 px-4 py-3 bg-purple-500/20 border border-purple-500 rounded-lg">
                <p className="text-xs text-white">Connected to: {networkName}</p>
              </div>
            )}
          </div>
        </main>

        <footer className="container mx-auto py-6 px-4 relative z-20">
          <div className="flex flex-col md:flex-row justify-between items-center backdrop-blur-sm bg-black/30 p-4 rounded-lg">
            <p className="text-xs text-white/70">© 2025 RWA DeFi. All rights reserved.</p>
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
