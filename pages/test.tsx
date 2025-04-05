import { useState, useEffect } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import axios from 'axios';
import Head from 'next/head';

// Import the contract ABI
import PropertyPriceOracleABI from '../contracts/abis/PropertyPriceOracle.json';

// Define interface for property data
interface PropertyData {
  price: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  address: string;
}

// Simple ML model that adjusts price based on property features
const calculatePriceAdjustment = (
  basePrice: number,
  sqft: number,
  condition: number,
  averageSqft: number
) => {
  // Size adjustment: larger properties get discount per sqft, smaller get premium
  const sizeMultiplier = sqft > averageSqft ? 0.95 : 1.05;
  
  // Condition adjustment: 1-10 scale, affects price significantly
  const conditionMultiplier = 0.7 + (condition * 0.06);
  
  return basePrice * sizeMultiplier * conditionMultiplier;
};

export default function Test() {
  const [location, setLocation] = useState('');
  const [sqft, setSqft] = useState(1500);
  const [condition, setCondition] = useState(5);
  const [price, setPrice] = useState(0);
  const [onchainPrice, setOnchainPrice] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState<PropertyData[]>([]);
  
  // Contract address on Polygon Amoy testnet from deployment
  const contractAddress = "0x5E93dDD7250a1d954618fab590831445Bae69458";
  
  // Generate sample property data based on location
  const generatePropertyData = (location: string): PropertyData[] => {
    // Base property prices
    const basePrices = [450000, 675000, 825000, 550000, 375000];
    const sqftSizes = [1200, 1800, 2200, 1500, 1100];
    const bedrooms = [2, 3, 4, 3, 2];
    const bathrooms = [2, 2.5, 3, 2, 1];
    const streetNames = ['Main St', 'Oak Ave', 'Pine Dr', 'Elm St', 'Cedar Ln'];
    
    // Location-based price adjustment
    let locationMultiplier = 1.0;
    const highPriceLocations = ['New York', 'San Francisco', 'Los Angeles', 'Miami', 'Seattle'];
    const lowPriceLocations = ['Chicago', 'Dallas', 'Houston', 'Phoenix', 'Philadelphia'];
    
    if (highPriceLocations.some(loc => location.toLowerCase().includes(loc.toLowerCase()))) {
      locationMultiplier = 1.5;
    } else if (lowPriceLocations.some(loc => location.toLowerCase().includes(loc.toLowerCase()))) {
      locationMultiplier = 0.8;
    }
    
    // Generate property data
    return basePrices.map((basePrice, idx) => ({
      price: Math.round(basePrice * locationMultiplier),
      sqft: sqftSizes[idx],
      bedrooms: bedrooms[idx],
      bathrooms: bathrooms[idx],
      address: `${100 + idx * 100} ${streetNames[idx]}, ${location}`
    }));
  };
  
  // Calculate property price based on property data and ML model
  const calculatePrice = async () => {
    if (!location) {
      setError('Please enter a location');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Generate sample property data
      const propertyData = generatePropertyData(location);
      setProperties(propertyData);
      
      // Calculate average property price and sqft
      const avgPrice = propertyData.reduce((sum, prop) => sum + prop.price, 0) / propertyData.length;
      const avgSqft = propertyData.reduce((sum, prop) => sum + prop.sqft, 0) / propertyData.length;
      
      // Use ML model to adjust price based on sqft and condition
      const calculatedPrice = calculatePriceAdjustment(avgPrice, sqft, condition, avgSqft);
      setPrice(Math.round(calculatedPrice));
      
      // Connect to blockchain
      await sendDataToBlockchain(calculatedPrice);
      
    } catch (err) {
      console.error('Error in price calculation:', err);
      setError('Error calculating price. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Send data to Polygon Amoy blockchain and retrieve via Oracle
  const sendDataToBlockchain = async (calculatedPrice: number): Promise<void> => {
    try {
      setLoading(true);
      
      // Check if MetaMask is installed and connected to Polygon Amoy
      if (window.ethereum) {
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          // Create Web3 provider and signer
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          // Check if connected to Polygon Amoy (ChainID: 80002)
          const network = await provider.getNetwork();
          // Convert chainId to number for comparison
          const chainIdNumber = Number(network.chainId);
          if (chainIdNumber !== 80002) {
            // Request network switch to Polygon Amoy
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x1387A' }], // 80002 in hex
            });
          }
          
          // Connect to PropertyPriceOracle contract
          const contract = new Contract(contractAddress, PropertyPriceOracleABI, signer);
          
          // Send price data to blockchain
          const tx = await contract.setPropertyPrice(location, Math.round(calculatedPrice));
          await tx.wait();
          console.log('Transaction confirmed:', tx.hash);
          
          // Get price from contract
          const onChainPrice = await contract.getPropertyPrice(location);
          setOnchainPrice(onChainPrice.toString());
          
        } catch (error) {
          console.error('Blockchain error:', error);
          setError('Error connecting to Polygon Amoy. Please make sure your wallet is configured correctly.');
        }
      } else {
        setError('Please install MetaMask to interact with the blockchain.');
      }
      
      setLoading(false);
      
    } catch (err) {
      setError('Error connecting to blockchain. Please try again.');
      setLoading(false);
      console.error('Blockchain error:', err);
    }
  };

  return (
    <>
      <Head>
        <style>{`
          .polygon-background {
            background-image: url('/polygon-logo.webp');
            background-repeat: repeat;
            background-size: 80px;
            position: relative;
          }
          
          .content-overlay {
            background-color: rgba(255, 255, 255, 0.85);
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 10;
          }
        `}</style>
      </Head>
      <div className="min-h-screen polygon-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto content-overlay overflow-hidden md:max-w-2xl p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Real Estate Tokenization Platform</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="Enter city (e.g., San Francisco)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Property Size (sqft)
              </label>
              <input
                type="number"
                value={sqft}
                onChange={(e) => setSqft(Number(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                min="500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Property Condition (1-10)
              </label>
              <input
                type="range"
                value={condition}
                onChange={(e) => setCondition(Number(e.target.value))}
                className="mt-1 block w-full"
                min="1"
                max="10"
                step="1"
              />
              <div className="text-sm text-gray-500 mt-1 flex justify-between">
                <span>Poor (1)</span>
                <span>Average (5)</span>
                <span>Excellent (10)</span>
              </div>
              <div className="text-sm text-blue-600 font-medium mt-1">
                Selected: {condition}/10
              </div>
            </div>
            
            <button
              onClick={calculatePrice}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Calculate Property Price'}
            </button>
            
            {error && <div className="text-red-500 text-center">{error}</div>}
            
            {price > 0 && (
              <div className="mt-4 p-4 border rounded-md bg-gray-50">
                <h2 className="text-lg font-semibold">Estimated Property Value:</h2>
                <p className="text-3xl font-bold text-blue-600">${price.toLocaleString()}</p>
                
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-md font-semibold">On-Chain Oracle Price:</h3>
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p>Fetching from Polygon Amoy...</p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">${Number(onchainPrice).toLocaleString()}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    *Price verified via Oracle on Polygon Amoy testnet
                  </p>
                </div>
              </div>
            )}
            
            {properties.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Comparable Properties:</h3>
                <div className="space-y-3">
                  {properties.map((property, idx) => (
                    <div key={idx} className="border rounded-md p-3 bg-white shadow-sm">
                      <p className="font-medium">{property.address}</p>
                      <div className="grid grid-cols-3 gap-2 mt-1 text-sm text-gray-600">
                        <p>${property.price.toLocaleString()}</p>
                        <p>{property.sqft} sqft</p>
                        <p>{property.bedrooms}bd/{property.bathrooms}ba</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-6 pt-4 border-t">
              <p className="font-medium mb-1">About This Proof of Concept:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>ML model adjusts prices based on property size and condition</li>
                <li>Blockchain integration with Polygon Amoy testnet</li>
                <li>On-chain data provides full transparency and immutability</li>
                <li>Property price data securely stored on the blockchain</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}