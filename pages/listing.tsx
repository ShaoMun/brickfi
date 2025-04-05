import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Press_Start_2P } from "next/font/google";
import Script from "next/script";
import { KYCService, createKYCService } from "../utils/kycService";
import { AttestationService, createAttestationService } from "../utils/attestationService";

// Extend Window interface to recognize Ethereum provider and Tesseract
declare global {
  interface Window {
    Tesseract: any;
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

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

// Sample listings data
const sampleListings = [
  {
    id: 1,
    propertyName: "Evergreen Estate",
    description: "Luxury residential property with 20 units",
    availability: "85%",
    price: "0.05 ETH",
    imageUrl: "/images/property1.png"
  },
  {
    id: 2,
    propertyName: "Sunset Apartments",
    description: "Commercial office space in downtown",
    availability: "60%",
    price: "0.08 ETH",
    imageUrl: "/images/property1.png"
  },
  {
    id: 3,
    propertyName: "Harbor View",
    description: "Beachfront vacation property",
    availability: "25%",
    price: "0.12 ETH",
    imageUrl: "/images/property1.png"
  }
];

export default function Listing() {
  // States
  const [isLoaded, setIsLoaded] = useState(false);
  const [step, setStep] = useState("kyc"); // kyc, attestation, dashboard
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [kycCompleted, setKycCompleted] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // KYC form states
  const [age, setAge] = useState("");
  const [isCitizen, setIsCitizen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [documentType, setDocumentType] = useState("passport"); // passport, driver_license, id_card
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [hashedData, setHashedData] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [fieldsLocked, setFieldsLocked] = useState(false);
  
  // Reference for the file input and canvas for image processing
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Attestation form states
  const [propertyName, setPropertyName] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [deedNumber, setDeedNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [fractionizeAmount, setFractionizeAmount] = useState("");
  const [legalDocumentation, setLegalDocumentation] = useState("");
  const [attestationComplete, setAttestationComplete] = useState(false);
  const [assetPhotos, setAssetPhotos] = useState<File[]>([]);
  const [assetPhotoUrls, setAssetPhotoUrls] = useState<string[]>([]);
  const [legalDocs, setLegalDocs] = useState<File[]>([]);
  const [docScanStatuses, setDocScanStatuses] = useState<string[]>([]);
  const [extractedProperties, setExtractedProperties] = useState({
    deedNumber: "",
    address: "",
    ownerName: "",
    taxId: ""
  });
  const [propertyDataHash, setPropertyDataHash] = useState<string | null>(null);
  const [attestationStatus, setAttestationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [attestationTxHash, setAttestationTxHash] = useState<string | null>(null);
  
  // Add KYC blockchain state
  const [kycService, setKycService] = useState<KYCService | null>(null);
  const [kycVerificationStatus, setKycVerificationStatus] = useState<'none' | 'pending' | 'success' | 'failed'>('none');
  const [kycVerificationMessage, setKycVerificationMessage] = useState<string>('');
  const [kycTransactionHash, setKycTransactionHash] = useState<string | null>(null);

  // Add the state for attestation service below kycService state 
  const [attestationService, setAttestationService] = useState<AttestationService | null>(null);
  const [propertyDataExtracted, setPropertyDataExtracted] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    setIsClient(true);
    
    // Load Tesseract.js script dynamically
    const tesseractScript = document.createElement('script');
    tesseractScript.src = 'https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js';
    tesseractScript.async = true;
    document.body.appendChild(tesseractScript);
    
    // Check if wallet is already connected
    checkIfWalletIsConnected();
    
    // Setup wallet event listeners
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }
    
    return () => {
      document.body.removeChild(tesseractScript);
      
      // Cleanup wallet event listeners
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);
  
  // Check if wallet is already connected
  const checkIfWalletIsConnected = async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return;
      
      // Check if ethereum provider exists (e.g., MetaMask)
      if (!window.ethereum) {
        setWalletError("No Ethereum wallet found. Please install MetaMask.");
        return;
      }
      
      // Get the chainId and set network name
      const chainId = window.ethereum.chainId;
      updateNetworkName(chainId);
      
      // Check if already connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        setWalletError(null);
        console.log("Wallet already connected:", accounts[0]);
      }
    } catch (error) {
      console.error("Failed to check wallet connection:", error);
      setWalletError("Failed to check wallet connection. Please try again.");
    }
  };
  
  // Handler for account changes
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
  
  // Handler for chain/network changes
  const handleChainChanged = (chainId: string) => {
    // Refresh the page as recommended by MetaMask
    updateNetworkName(chainId);
    console.log("Network changed to:", chainId);
    // Optional: window.location.reload();
  };
  
  // Handler for disconnect event
  const handleDisconnect = (error: { code: number; message: string }) => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletError(`Wallet disconnected: ${error.message}`);
  };
  
  // Update network name based on chainId
  const updateNetworkName = (chainId: string | undefined) => {
    if (!chainId) return;
    
    const networks: { [key: string]: string } = {
      '0x1': 'Ethereum Mainnet',
      '0x3': 'Ropsten Testnet',
      '0x4': 'Rinkeby Testnet',
      '0x5': 'Goerli Testnet',
      '0x2a': 'Kovan Testnet',
      '0x38': 'Binance Smart Chain',
      '0x89': 'Polygon Mainnet',
      '0x13881': 'Polygon Mumbai',
      '0xa86a': 'Avalanche Mainnet',
      '0xa': 'Optimism Mainnet',
      '0xa4b1': 'Arbitrum One',
      '0x85': 'HashKey Chain Testnet'  // Chain ID 133 in hex
    };
    
    setNetworkName(networks[chainId] || `Chain ID: ${parseInt(chainId, 16)}`);
    
    // Check if we're on HashKey Chain testnet
    if (chainId !== "0x85") { // 133 in hex
      console.warn("Not connected to HashKey Chain Testnet. KYC contract may not work correctly.");
      setWalletError("Please connect to HashKey Chain Testnet for KYC verification");
    } else {
      setWalletError(null);
    }
  };
  
  // Function to switch to HashKey Chain Testnet
  const switchToHashKeyChain = async () => {
    if (!window.ethereum) return;
    
    try {
      // Try to switch to HashKey Chain Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x85' }], // 133 in hex
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x85', // 133 in hex
                chainName: 'HashKey Chain Testnet',
                nativeCurrency: {
                  name: 'HSK',
                  symbol: 'HSK',
                  decimals: 18,
                },
                rpcUrls: ['https://hashkeychain-testnet.alt.technology'],
                blockExplorerUrls: ['https://hashkeychain-testnet-explorer.alt.technology'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding HashKey Chain network:', addError);
          setWalletError('Could not add HashKey Chain network to your wallet');
        }
      } else {
        console.error('Error switching to HashKey Chain network:', switchError);
        setWalletError('Error switching to HashKey Chain network');
      }
    }
  };

  // Function to preprocess image for better OCR results
  const preprocessImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve(imageSrc); // Return original if canvas not available
          return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }
        
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Apply preprocessing - more advanced image processing for better OCR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Advanced preprocessing pipeline
        // 1. Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; // Proper luminance formula
          data[i] = avg;     // Red
          data[i + 1] = avg; // Green
          data[i + 2] = avg; // Blue
        }
        
        // 2. Apply contrast enhancement
        const contrastFactor = 1.5; // Increase contrast
        const intercept = 128 * (1 - contrastFactor);
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] * contrastFactor + intercept;
          data[i + 1] = data[i + 1] * contrastFactor + intercept;
          data[i + 2] = data[i + 2] * contrastFactor + intercept;
        }
        
        // 3. Apply thresholding for text documents like passports
        // This works better for documents with clear text
        if (documentType === "passport") {
          const threshold = 120;
          for (let i = 0; i < data.length; i += 4) {
            const val = data[i] > threshold ? 255 : 0;
            data[i] = val;     // Red
            data[i + 1] = val; // Green
            data[i + 2] = val; // Blue
          }
        }
        
        // 4. Noise reduction (simple)
        // Skip for simplicity, but could be added
        
        ctx.putImageData(imageData, 0, 0);
        
        // Get processed image as data URL
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.src = imageSrc;
    });
  };

  // Function to hash data for encryption
  const hashData = (data: string): string => {
    // In a real production app, you'd use a more secure encryption method
    // and potentially store the hash on a secure blockchain or use the Web Crypto API
    try {
      // Simple simulation of hashing using base64 encoding + random salt
      // Note: This is NOT secure for production use
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      const salt = Math.random().toString(36).substring(2, 15);
      
      // Simulate hashing with salt
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(encodedData)));
      return `hashed_${base64.substring(0, 20)}_${salt}`;
    } catch (error) {
      console.error("Error hashing data:", error);
      return "hash_error";
    }
  };

  // Handle document upload
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setDocumentFile(file);
    
    // Reset scanning states when new document is uploaded
    setScanComplete(false);
    setExtractedText("");
    
    // Create preview for the uploaded document
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  
} 