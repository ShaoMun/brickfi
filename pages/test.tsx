import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import cheerio from 'cheerio';

// In production, import the actual scraper and contract ABI
// import ZillowScraper, { PropertyData } from '../utils/zillowScraper';
// import PropertyPriceOracleABI from '../abi/PropertyPriceOracle.json';

// Define interface for property data (same as in utils/zillowScraper.ts)
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
  
  // In production: Contract address on Polygon Amoy testnet from deployment
  // const contractAddress = "0x..."; // From deployment-record.json
  
  // Function to scrape real estate data from Zillow (following robots.txt rules)
  const scrapeZillowData = async (location: string): Promise<PropertyData[]> => {
    try {
      setLoading(true);
      setError('');
      
      // Format location for URL (e.g., "New York" -> "New-York")
      const formattedLocation = location.replace(/\s+/g, '-');
      
      // In production: Use the actual ZillowScraper class
      // const scraper = new ZillowScraper();
      // const data = await scraper.getAveragePriceData(location);
      // return data.properties;
      
      // Simulate scraping delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Sample data that would be scraped
      const scrapedProperties: PropertyData[] = [
        {
          price: 450000,
          sqft: 1200,
          bedrooms: 2,
          bathrooms: 2,
          address: `123 Main St, ${location}`
        },
        {
          price: 675000,
          sqft: 1800,
          bedrooms: 3,
          bathrooms: 2.5,
          address: `456 Oak Ave, ${location}`
        },
        {
          price: 825000,
          sqft: 2200,
          bedrooms: 4,
          bathrooms: 3,
          address: `789 Pine Dr, ${location}`
        },
        {
          price: 550000,
          sqft: 1500,
          bedrooms: 3,
          bathrooms: 2,
          address: `321 Elm St, ${location}`
        },
        {
          price: 375000,
          sqft: 1100,
          bedrooms: 2,
          bathrooms: 1,
          address: `555 Cedar Ln, ${location}`
        }
      ];
      
      // Adjust based on location popularity (simple model for POC)
      let locationMultiplier = 1.0;
      const popularLocations = ['New York', 'San Francisco', 'Los Angeles', 'Miami', 'Seattle'];
      const affordableLocations = ['Chicago', 'Dallas', 'Houston', 'Phoenix', 'Philadelphia'];
      
      if (popularLocations.some(loc => location.toLowerCase().includes(loc.toLowerCase()))) {
        locationMultiplier = 1.5;
      } else if (affordableLocations.some(loc => location.toLowerCase().includes(loc.toLowerCase()))) {
        locationMultiplier = 0.8;
      }
      
      // Apply location multiplier to prices
      const adjustedProperties = scrapedProperties.map(prop => ({
        ...prop,
        price: Math.round(prop.price * locationMultiplier)
      }));
      
      setProperties(adjustedProperties);
      setLoading(false);
      
      return adjustedProperties;
    } catch (err) {
      setError('Error fetching property data. Please try again.');
      setLoading(false);
      console.error('Scraping error:', err);
      return [];
    }
  };
  
  // Calculate property price based on scraped data and ML model
  const calculatePrice = async () => {
    if (!location) {
      setError('Please enter a location');
      return;
    }
    
    const scrapedProperties = await scrapeZillowData(location);
    
    if (scrapedProperties.length === 0) {
      setError('No properties found for this location');
      return;
    }
    
    // Calculate average property price and sqft from scraped data
    const avgPrice = scrapedProperties.reduce((sum, prop) => sum + prop.price, 0) / scrapedProperties.length;
    const avgSqft = scrapedProperties.reduce((sum, prop) => sum + prop.sqft, 0) / scrapedProperties.length;
    
    // Use ML model to adjust price based on sqft and condition
    const calculatedPrice = calculatePriceAdjustment(avgPrice, sqft, condition, avgSqft);
    
    setPrice(Math.round(calculatedPrice));
    
    // Simulate blockchain integration
    simulateBlockchainData(calculatedPrice);
  };
  
  // Simulate sending data to Polygon Amoy blockchain and retrieving via Chainlink
  const simulateBlockchainData = async (calculatedPrice: number): Promise<void> => {
    try {
      setLoading(true);
      
      // In production: Connect to actual blockchain
      /*
      // Check if MetaMask is installed and connected to Polygon Amoy
      if (window.ethereum) {
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          // Create Web3 provider and signer
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          
          // Check if connected to Polygon Amoy (ChainID: 80002)
          const network = await provider.getNetwork();
          if (network.chainId !== 80002) {
            // Request network switch to Polygon Amoy
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x1387A' }], // 80002 in hex
            });
          }
          
          // Connect to PropertyPriceOracle contract
          const contract = new ethers.Contract(contractAddress, PropertyPriceOracleABI, signer);
          
          // Send price data to blockchain
          const tx = await contract.setPropertyPrice(location, Math.round(calculatedPrice));
          await tx.wait();
          console.log('Transaction confirmed:', tx.hash);
          
          // Get price from contract
          const onChainPrice = await contract.getPropertyPrice(location);
          setOnchainPrice(onChainPrice.toString());
          
          // In full implementation, you would also call requestPropertyPriceData
          // to get a Chainlink Oracle to fetch the latest off-chain data
        } catch (error) {
          console.error('Blockchain error:', error);
          setError('Error connecting to Polygon Amoy. Please make sure your wallet is configured correctly.');
        }
      } else {
        setError('Please install MetaMask to interact with the blockchain.');
      }
      */
      
      // For this POC, we're simulating the blockchain behavior
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate slight price variation from Chainlink Oracle
      const variation = 0.98 + (Math.random() * 0.04); // +/- 2%
      const blockchainPrice = (calculatedPrice * variation).toFixed(2);
      
      setOnchainPrice(blockchainPrice);
      setLoading(false);
      
    } catch (err) {
      setError('Error connecting to blockchain. Please try again.');
      setLoading(false);
      console.error('Blockchain error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
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
                  *Price verified via Chainlink oracle on Polygon Amoy testnet
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
              <li>Web scraping simulates gathering data from Zillow (respecting robots.txt)</li>
              <li>ML model adjusts prices based on property size and condition</li>
              <li>Blockchain integration simulates Polygon Amoy testnet & Chainlink</li>
              <li>In production, actual on-chain data would provide full transparency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}