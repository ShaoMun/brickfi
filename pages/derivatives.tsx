import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Press_Start_2P } from "next/font/google";
import NavigationBar from "../components/NavigationBar";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

// Sample RWA options data
const rwaOptions = [
  {
    id: 1,
    name: "Evergreen Estate",
    currentPrice: 0.05,
    dailyChange: "+2.3%",
    type: "Real Estate",
    imageUrl: "/images/property1.png"
  },
  {
    id: 2,
    name: "Gold Standard",
    currentPrice: 0.08,
    dailyChange: "-1.2%",
    type: "Commodity",
    imageUrl: "/images/property1.png"
  },
  {
    id: 3,
    name: "Urban Office Complex",
    currentPrice: 0.12,
    dailyChange: "+4.5%",
    type: "Commercial",
    imageUrl: "/images/property1.png"
  },
  {
    id: 4,
    name: "Vintage Vineyard",
    currentPrice: 0.07,
    dailyChange: "+0.8%",
    type: "Agricultural",
    imageUrl: "/images/property1.png"
  }
];

// Sample user positions
const initialPositions = [
  {
    id: 1,
    assetName: "Evergreen Estate",
    type: "Call",
    direction: "Buy",
    strikePrice: 0.055,
    expiryDate: "2025-06-30",
    premium: 0.005,
    profitLoss: "+10.2%"
  },
  {
    id: 2,
    assetName: "Gold Standard",
    type: "Put",
    direction: "Sell",
    strikePrice: 0.075,
    expiryDate: "2025-05-15",
    premium: 0.008,
    profitLoss: "-3.5%"
  }
];

// Add this stable random function near the top of the file after imports
const generateStableRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export default function Derivative() {
  // States
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(rwaOptions[0]);
  const [positions, setPositions] = useState(initialPositions);
  
  // Option states
  const [optionType, setOptionType] = useState("call"); // call or put
  const [direction, setDirection] = useState("buy"); // buy or sell
  const [strikePrice, setStrikePrice] = useState<string>("");
  const [optionExpiry, setOptionExpiry] = useState("");
  const [optionAmount, setOptionAmount] = useState<string>("");
  
  // UI states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [estimatedPremium, setEstimatedPremium] = useState(0);
  const [activePage, setActivePage] = useState("trade"); // trade, positions, history
  
  // Precompute particle positions with stable seeds
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    top: `${generateStableRandom(i * 1) * 100}%`,
    left: `${generateStableRandom(i * 2) * 100}%`,
    delay: `${generateStableRandom(i * 3) * 5}s`,
    duration: `${3 + generateStableRandom(i * 4) * 7}s`
  }));

  useEffect(() => {
    setIsLoaded(true);
    
    // Calculate estimated premium whenever option parameters change
    if (strikePrice && optionExpiry && optionAmount && selectedAsset) {
      calculatePremium();
    }
  }, [strikePrice, optionExpiry, optionAmount, optionType, direction, selectedAsset]);
  
  // Connect wallet function
  const connectWallet = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          setWalletConnected(true);
          
          // Get chain ID
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          updateNetworkName(chainIdHex);
        }
      } else {
        console.error("No ethereum wallet found");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateNetworkName = (chainId: string) => {
    let network;
    switch (chainId) {
      case '0x1':
        network = 'Ethereum Mainnet';
        break;
      case '0x5':
        network = 'Goerli Testnet';
        break;
      case '0x11':
        network = 'HashKey Chain Testnet';
        break;
      case '0x12':
        network = 'HashKey Chain Mainnet';
        break;
      default:
        network = 'Unknown Network';
    }
    setNetworkName(network);
  };
  
  // Calculate option premium (simplified for demo)
  const calculatePremium = () => {
    const price = parseFloat(strikePrice);
    const currentPrice = selectedAsset.currentPrice;
    const amount = parseFloat(optionAmount) || 1;
    
    // Very simplified Black-Scholes inspired calculation
    const daysToExpiry = Math.max(1, Math.floor((new Date(optionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
    const volatility = 0.15; // Assumed volatility
    
    let premium;
    if (optionType === "call") {
      premium = Math.max(0, (currentPrice * 0.05) * Math.sqrt(daysToExpiry / 30) * amount);
      if (direction === "sell") premium *= 0.95; // Slightly less premium for selling
    } else {
      premium = Math.max(0, (currentPrice * 0.06) * Math.sqrt(daysToExpiry / 30) * amount);
      if (direction === "sell") premium *= 0.95;
    }
    
    setEstimatedPremium(Number(premium.toFixed(5)));
  };
  
  // Handle option trade submission
  const handleOptionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!walletConnected) {
      alert("Please connect your wallet first");
      return;
    }
    
    if (!strikePrice || !optionExpiry || !optionAmount) {
      alert("Please fill out all fields");
      return;
    }
    
    setShowConfirmation(true);
  };
  
  // Confirm and execute option trade
  const executeOptionTrade = () => {
    // In a real app, this would interact with a smart contract
    
    // Add to positions
    const newPosition = {
      id: positions.length + 1,
      assetName: selectedAsset.name,
      type: optionType === "call" ? "Call" : "Put",
      direction: direction === "buy" ? "Buy" : "Sell",
      strikePrice: parseFloat(strikePrice),
      expiryDate: optionExpiry,
      premium: estimatedPremium,
      profitLoss: "0.0%"
    };
    
    setPositions([newPosition, ...positions]);
    
    // Reset form
    setStrikePrice("");
    setOptionExpiry("");
    setOptionAmount("");
    setShowConfirmation(false);
    
    // Show success message
    alert(`Option trade executed successfully!\nPosition ID: ${newPosition.id}`);
  };
  
  return (
    <div className={`${pressStart2P.variable} min-h-screen relative overflow-hidden`}>
      <Head>
        <title>RWA DeFi - Derivatives</title>
        <meta name="description" content="Trade options on real world assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image 
          src="/page_bg.svg" 
          alt="Derivatives Background" 
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
        <NavigationBar 
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          getNetworkName={() => networkName || ''}
          formatAddress={(address) => address.substring(0, 6) + "..." + address.substring(address.length - 4)}
          connectWallet={connectWallet}
          isLoading={isLoading}
        />

        {/* Main Content */}
        <main className="container mx-auto py-8 px-4">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">RWA Options Trading</h2>
            <p className="text-xs text-white/80 max-w-2xl mx-auto">
              Trade options on tokenized real world assets with low fees and high liquidity.
            </p>
          </div>

          {!walletConnected ? (
            <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg max-w-md mx-auto">
              <p className="text-white text-center text-xs mb-6">Please connect your wallet to trade options</p>
              <button 
                onClick={connectWallet}
                className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white mx-auto block"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Control Panel (Left Side) */}
              <div className="md:w-1/3">
                <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg mb-6">
                  <h3 className="text-md text-white mb-6 pixel-text">Control Panel</h3>
                  
                  {/* Panel Navigation */}
                  <div className="flex border-b border-white/20 mb-4">
                    <button 
                      className={`py-2 px-3 text-xs ${activePage === 'trade' ? 'text-[#FFD54F] border-b-2 border-[#FFD54F]' : 'text-white/70'}`}
                      onClick={() => setActivePage('trade')}
                    >
                      Trade
                    </button>
                    <button 
                      className={`py-2 px-3 text-xs ${activePage === 'positions' ? 'text-[#FFD54F] border-b-2 border-[#FFD54F]' : 'text-white/70'}`}
                      onClick={() => setActivePage('positions')}
                    >
                      Positions
                    </button>
                    <button 
                      className={`py-2 px-3 text-xs ${activePage === 'history' ? 'text-[#FFD54F] border-b-2 border-[#FFD54F]' : 'text-white/70'}`}
                      onClick={() => setActivePage('history')}
                    >
                      History
                    </button>
                  </div>
                  
                  {/* Position Panel Content */}
                  {activePage === 'positions' && (
                    <div className="space-y-4">
                      <h4 className="text-white text-xs mb-2">Your Open Positions</h4>
                      
                      {positions.length === 0 ? (
                        <p className="text-white/60 text-xs">No open positions</p>
                      ) : (
                        <div className="space-y-3">
                          {positions.map((position) => (
                            <div key={position.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-white text-xs">{position.assetName}</span>
                                <span className={`text-xs ${position.profitLoss.startsWith('+') ? 'text-green-400' : position.profitLoss.startsWith('-') ? 'text-red-400' : 'text-white'}`}>
                                  {position.profitLoss}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-white/70">
                                <span>{position.direction} {position.type}</span>
                                <span>{position.strikePrice} ETH</span>
                              </div>
                              <div className="flex justify-between text-xs text-white/50 mt-1">
                                <span>Premium: {position.premium} ETH</span>
                                <span>Expires: {new Date(position.expiryDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* History Panel Content */}
                  {activePage === 'history' && (
                    <div className="space-y-4">
                      <h4 className="text-white text-xs mb-2">Transaction History</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">Bought 1 CALL option</span>
                          <span className="text-white/70">2 days ago</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">Sold 2 PUT options</span>
                          <span className="text-white/70">5 days ago</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">Option expired</span>
                          <span className="text-white/70">1 week ago</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Trade Panel Content */}
                  {activePage === 'trade' && (
                    <div className="space-y-4">
                      <h4 className="text-white text-xs mb-2">Market Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">Total Open Interest</span>
                          <span className="text-white">156.2 ETH</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">24h Volume</span>
                          <span className="text-white">43.7 ETH</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">Most Active Asset</span>
                          <span className="text-white">Evergreen Estate</span>
                        </div>
                      </div>
                      
                      <h4 className="text-white text-xs mt-4 mb-2">Portfolio Value</h4>
                      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-white text-xs">Total Value</span>
                          <span className="text-white text-md">0.427 ETH</span>
                        </div>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-white/70">Unrealized P/L</span>
                          <span className="text-green-400">+0.032 ETH</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Asset Navigation */}
                <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg">
                  <h3 className="text-md text-white mb-4 pixel-text">RWA Options</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {rwaOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedAsset(option)}
                        className={`p-3 rounded text-left ${selectedAsset.id === option.id ? 'bg-[#6200EA]/30 border-2 border-[#6200EA]' : 'bg-black/20 border border-white/10'}`}
                      >
                        <p className="text-white text-xs mb-1">{option.name}</p>
                        <p className="text-white/70 text-xs mb-1">{option.type}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-white text-xs">{option.currentPrice} ETH</span>
                          <span className={`text-xs ${option.dailyChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                            {option.dailyChange}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Options Trading Panel (Right Side) */}
              <div className="md:w-2/3">
                <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg text-white">Options Trading</h3>
                    <div className="flex items-center bg-black/20 rounded px-3 py-1">
                      <span className="text-white text-xs mr-2">Selected Asset:</span>
                      <span className="text-[#FFD54F] text-xs">{selectedAsset.name}</span>
                    </div>
                  </div>
                  
                  {/* Asset Details */}
                  <div className="bg-black/20 p-4 rounded-lg mb-6">
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="text-white/70 text-xs">Current Price</p>
                        <p className="text-white text-md">{selectedAsset.currentPrice} ETH</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">24h Change</p>
                        <p className={`text-md ${selectedAsset.dailyChange.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedAsset.dailyChange}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Asset Type</p>
                        <p className="text-white text-md">{selectedAsset.type}</p>
                      </div>
                    </div>
                    
                    <div className="h-24 w-full bg-black/10 rounded flex items-center justify-center">
                      <p className="text-white/50 text-xs">Price chart would be displayed here</p>
                    </div>
                  </div>
                  
                  {/* Option Trading Form */}
                  <form onSubmit={handleOptionSubmit} className="space-y-6">
                    {/* Option Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Option Type Selection */}
                        <div className="space-y-2">
                          <label className="block text-white text-xs">Option Type</label>
                          <div className="flex">
                            <button
                              type="button"
                              onClick={() => setOptionType("call")}
                              className={`flex-1 py-2 text-xs ${optionType === "call" ? 'bg-[#6200EA] text-white' : 'bg-black/20 text-white/70'} rounded-l border border-white/20`}
                            >
                              CALL
                            </button>
                            <button
                              type="button"
                              onClick={() => setOptionType("put")}
                              className={`flex-1 py-2 text-xs ${optionType === "put" ? 'bg-[#6200EA] text-white' : 'bg-black/20 text-white/70'} rounded-r border border-white/20`}
                            >
                              PUT
                            </button>
                          </div>
                          <p className="text-white/50 text-xs">
                            {optionType === "call" ? 
                              "Right to buy asset at strike price" : 
                              "Right to sell asset at strike price"}
                          </p>
                        </div>
                        
                        {/* Direction Selection */}
                        <div className="space-y-2">
                          <label className="block text-white text-xs">Direction</label>
                          <div className="flex">
                            <button
                              type="button"
                              onClick={() => setDirection("buy")}
                              className={`flex-1 py-2 text-xs ${direction === "buy" ? 'bg-green-500 text-white' : 'bg-black/20 text-white/70'} rounded-l border border-white/20`}
                            >
                              BUY
                            </button>
                            <button
                              type="button"
                              onClick={() => setDirection("sell")}
                              className={`flex-1 py-2 text-xs ${direction === "sell" ? 'bg-red-500 text-white' : 'bg-black/20 text-white/70'} rounded-r border border-white/20`}
                            >
                              SELL
                            </button>
                          </div>
                          <p className="text-white/50 text-xs">
                            {direction === "buy" ? 
                              "Pay premium to buy the option" : 
                              "Receive premium but take obligation"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Strike Price */}
                        <div className="space-y-2">
                          <label htmlFor="strikePrice" className="block text-white text-xs">Strike Price (ETH)</label>
                          <input 
                            type="number" 
                            id="strikePrice"
                            value={strikePrice}
                            onChange={(e) => setStrikePrice(e.target.value)}
                            step="0.001"
                            min="0.001"
                            className="pixel-input w-full text-xs"
                            placeholder={`Current price: ${selectedAsset.currentPrice} ETH`}
                            required
                          />
                        </div>
                        
                        {/* Expiry Date */}
                        <div className="space-y-2">
                          <label htmlFor="optionExpiry" className="block text-white text-xs">Expiry Date</label>
                          <input 
                            type="date" 
                            id="optionExpiry"
                            value={optionExpiry}
                            onChange={(e) => setOptionExpiry(e.target.value)}
                            className="pixel-input w-full text-xs"
                            min={new Date().toISOString().split('T')[0]} // Set min to today
                            required
                          />
                        </div>
                        
                        {/* Option Amount */}
                        <div className="space-y-2">
                          <label htmlFor="optionAmount" className="block text-white text-xs">Number of Options</label>
                          <input 
                            type="number" 
                            id="optionAmount"
                            value={optionAmount}
                            onChange={(e) => setOptionAmount(e.target.value)}
                            step="1"
                            min="1"
                            className="pixel-input w-full text-xs"
                            placeholder="How many options?"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Trade Summary */}
                    <div className="bg-black/20 p-4 rounded-lg mb-4">
                      <h4 className="text-white text-xs mb-3">Trade Summary</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-white/70 text-xs">Option Type</p>
                          <p className="text-white text-xs">{optionType === "call" ? "CALL" : "PUT"} Option</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Direction</p>
                          <p className="text-white text-xs">{direction === "buy" ? "BUY" : "SELL"}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Asset</p>
                          <p className="text-white text-xs">{selectedAsset.name}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Strike Price</p>
                          <p className="text-white text-xs">{strikePrice || "–"} ETH</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Expiry Date</p>
                          <p className="text-white text-xs">{optionExpiry ? new Date(optionExpiry).toLocaleDateString() : "–"}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Quantity</p>
                          <p className="text-white text-xs">{optionAmount || "–"} options</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 border-t border-white/10 pt-4">
                        <div>
                          <p className="text-white/70 text-xs">Estimated {direction === "buy" ? "Cost" : "Premium"}</p>
                          <p className="text-[#FFD54F] text-md">{estimatedPremium} ETH</p>
                        </div>
                        <button 
                          type="submit"
                          className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white"
                          disabled={!strikePrice || !optionExpiry || !optionAmount}
                        >
                          Review Trade
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="backdrop-blur-sm bg-black/80 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg text-white mb-4 text-center">Confirm Option Trade</h3>
              <div className="space-y-4">
                <div className="bg-[#6200EA]/10 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70 text-xs">Asset</span>
                    <span className="text-white text-xs">{selectedAsset.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70 text-xs">Action</span>
                    <span className="text-white text-xs">{direction === 'buy' ? 'BUY' : 'SELL'} {optionType === 'call' ? 'CALL' : 'PUT'}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70 text-xs">Strike Price</span>
                    <span className="text-white text-xs">{strikePrice} ETH</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70 text-xs">Expiry Date</span>
                    <span className="text-white text-xs">{new Date(optionExpiry).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/70 text-xs">Quantity</span>
                    <span className="text-white text-xs">{optionAmount}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-white/70 text-xs">Total {direction === 'buy' ? 'Cost' : 'Premium'}</span>
                    <span className="text-[#FFD54F] text-xs">{estimatedPremium} ETH</span>
                  </div>
                </div>
                
                <p className="text-white/60 text-xs text-center">
                  {direction === 'buy' 
                    ? `You are buying the right to ${optionType === 'call' ? 'purchase' : 'sell'} ${selectedAsset.name} at ${strikePrice} ETH before expiry.` 
                    : `You are selling the obligation to ${optionType === 'call' ? 'deliver' : 'purchase'} ${selectedAsset.name} at ${strikePrice} ETH if the buyer exercises.`}
                </p>
                
                <div className="flex gap-4 justify-center pt-2">
                  <button 
                    onClick={() => setShowConfirmation(false)}
                    className="pixel-btn bg-transparent border-white border-2 text-xs py-3 px-6 text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeOptionTrade}
                    className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white"
                  >
                    Confirm Trade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
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