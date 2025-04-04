import Image from "next/image";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

// Import Press Start 2P font
import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Simulate wallet connection
  const connectWallet = () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress("");
      return;
    }
    
    // Mock wallet connection
    const mockAddress = "0x" + Math.random().toString(16).substring(2, 14) + "...";
    setWalletAddress(mockAddress);
    setWalletConnected(true);
  };

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
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-[#FFC107] rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 7}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-20 w-full h-full min-h-screen">
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
          <nav className="hidden md:flex gap-6">
            <Link href="/listing" className="pixel-btn bg-transparent backdrop-blur-sm border-[#6200EA] border-2 py-2 px-3 text-xs text-white hover:bg-[#6200EA]/50 transition-colors">Listing</Link>
            <Link href="/derivative" className="pixel-btn bg-transparent backdrop-blur-sm border-[#4CAF50] border-2 py-2 px-3 text-xs text-white hover:bg-[#4CAF50]/50 transition-colors">Derivative</Link>
          </nav>
          <button 
            onClick={connectWallet} 
            className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white"
          >
            {walletConnected ? walletAddress : "Connect Wallet"}
          </button>
        </header>

        <main className="container mx-auto flex items-center px-4" style={{ minHeight: "calc(100vh - 100px)" }}>
          <div className={`w-full md:w-1/2 backdrop-blur-sm bg-black/30 p-6 rounded-lg ${isLoaded ? 'pixel-animation' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <h2 className="pixel-header text-lg mb-6 inline-block">Real World Assets</h2>
            <h3 className="text-3xl font-bold mb-6 text-white pixel-text">Tokenize Your <br /> Real World <span className="text-[#FFD54F]">Assets</span></h3>
            <p className="mb-8 text-sm pixel-text text-white/90">
              Transform physical properties into blockchain tokens with our revolutionary DeFi platform. 
              List properties, create derivatives, borrow against your assets, and build your digital real estate portfolio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white">Launch App</button>
              <button className="pixel-btn bg-transparent border-white border-2 text-xs py-3 px-6 text-white hover:bg-white/10">Learn More</button>
            </div>
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
