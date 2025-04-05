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
  
  // Enhanced document scanning with NLP techniques for DOB extraction
  const scanDocument = async () => {
    if (!documentFile || !documentPreview) {
      alert("Please upload a document first");
      return;
    }
    
    setIsScanning(true);
    setScanProgress(0);
    setFieldsLocked(false); // Reset fields lock state
    
    try {
      // Check if Tesseract is loaded
      if (typeof window.Tesseract === 'undefined') {
        alert("OCR library is still loading. Please try again in a few seconds.");
        setIsScanning(false);
        return;
      }
      
      // Reset all form fields to ensure no leftover data
      setFullName("");
      setAge("");
      setDateOfBirth("");
      setIsCitizen(false);
      
      // Preprocess the image for better OCR results
      const processedImage = await preprocessImage(documentPreview);
      
      // Advanced Tesseract.js options for better accuracy
      const tessOptions = {
        lang: 'eng',
        engine: 'tesseract',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: (progress: any) => {
          if (progress.status === 'recognizing text') {
            setScanProgress(parseInt((progress.progress * 100).toFixed(0)));
          }
        },
        // Add optimal OCR parameters
        tessjs_create_pdf: '0',
        tessjs_image_rectangle_left: '0',
        tessjs_image_rectangle_top: '0',
        tessjs_image_rectangle_width: '1000',
        tessjs_image_rectangle_height: '1000',
        // Improve accuracy with these settings
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz<>.:;,/\\|()[]{}\'"`~!@#$%^&*-_+=',
        tessjs_create_hocr: '1', // Generate HOCR for better structure recognition
        tessjs_create_tsv: '1',   // Generate TSV for better data extraction
      };
      
      // First attempt - with regular settings
      setScanProgress(10);
      console.log("Starting OCR with standard settings...");
      let result = await window.Tesseract.recognize(
        processedImage,
        'eng',
        {
          logger: (progress: any) => {
            if (progress.status === 'recognizing text') {
              setScanProgress(10 + parseInt((progress.progress * 40).toFixed(0)));
            }
          }
        }
      );
      
      let extractedText = result.data.text;
      console.log("First pass OCR result:", extractedText);
      
      // Second attempt - with OSD (orientation and script detection)
      setScanProgress(50);
      console.log("Starting OCR with OSD...");
      const resultOsd = await window.Tesseract.recognize(
        processedImage,
        'eng',
        {
          ...tessOptions,
          logger: (progress: any) => {
            if (progress.status === 'recognizing text') {
              setScanProgress(50 + parseInt((progress.progress * 40).toFixed(0)));
            }
          },
          tessedit_ocr_engine_mode: '2', // Use OSD mode
        }
      );
      
      // Combine results if the second pass gave better results
      if (resultOsd.data.text.length > extractedText.length) {
        console.log("OSD pass produced better results");
        extractedText = resultOsd.data.text;
      }
      
      // Store the extracted raw text
      setExtractedText(extractedText);
      setScanProgress(95);
      
      // Extract structured data from the text
      console.log("Extracting document data...");
      const extractedData = extractDocumentData(extractedText);
      
      // Update form fields with extracted data if available - NO HARDCODED VALUES
      if (extractedData.fullName) {
        setFullName(extractedData.fullName);
        console.log("Setting full name:", extractedData.fullName);
      }
      
      // PRIORITIZE DOB AND AGE CALCULATION
      let ageWasSet = false;
      
      // First priority: Use date of birth if available for precise age calculation
      if (extractedData.dateOfBirth) {
        setDateOfBirth(extractedData.dateOfBirth);
        console.log("Setting DOB:", extractedData.dateOfBirth);
        
        try {
          // Calculate age from DOB
          const dob = new Date(extractedData.dateOfBirth);
          const today = new Date();
          let calculatedAge = today.getFullYear() - dob.getFullYear();
          
          // Adjust age if birthday hasn't occurred yet this year
          if (today.getMonth() < dob.getMonth() || 
              (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
            calculatedAge--;
          }
          
          if (calculatedAge > 0 && calculatedAge < 120) {
            console.log("Setting age from calculated DOB:", calculatedAge);
            setAge(String(calculatedAge));
            ageWasSet = true;
          }
        } catch (e) {
          console.error("Error calculating age from DOB:", e);
        }
      }
      
      // Second priority: Use extracted age if DOB calculation failed
      if (!ageWasSet && extractedData.age) {
        // Validate age is reasonable before setting
        const ageNum = parseInt(extractedData.age);
        if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
          console.log("Setting age from extracted data:", extractedData.age);
          setAge(extractedData.age);
          ageWasSet = true;
        }
      }
      
      // Last resort: If still no age but we have birth year, calculate approximate age
      if (!ageWasSet && extractedData.birthYear) {
        const currentYear = new Date().getFullYear();
        const approximateAge = currentYear - parseInt(extractedData.birthYear);
        
        if (approximateAge > 0 && approximateAge < 120) {
          console.log("Setting age from birth year only:", approximateAge);
          setAge(String(approximateAge));
          ageWasSet = true;
        }
      }
      
      // Set US citizen status based on nationality - NO HARDCODING
      if (extractedData.nationality) {
        const isUSCitizen = extractedData.nationality === 'United States' || 
                          extractedData.nationality === 'USA' ||
                          extractedData.nationality === 'US';
        
        setIsCitizen(isUSCitizen);
        console.log("Setting citizenship status based on nationality:", isUSCitizen);
      } else {
        // Default to false if no nationality detected
        setIsCitizen(false);
      }
      
      // Lock fields after scanning to make them uneditable
      setFieldsLocked(true);
      
      // Hash the extracted data for secure storage
      const dataToHash = JSON.stringify({
        ...extractedData,
        scanTimestamp: new Date().toISOString()
      });
      
      const hashedResult = hashData(dataToHash);
      setHashedData(hashedResult);
      
      setIsScanning(false);
      setScanComplete(true);
      setScanProgress(100);
    } catch (error) {
      console.error("Error during document scanning:", error);
      alert("An error occurred during document scanning. Please try again.");
      setIsScanning(false);
    }
  };

  // Extract document data with enhanced NLP for Date of Birth detection
  const extractDocumentData = (text: string) => {
    // Clean up the text - remove extra whitespace and make lowercase for easier matching
    const cleanText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    console.log("Clean text:", cleanText); // For development debugging
    
    // Initialize extracted data object with additional birthYear field
    const extractedData: { 
      fullName?: string; 
      age?: string;
      dateOfBirth?: string;
      birthYear?: string;  // Added specifically for year-only calculations
      nationality?: string;
      documentNumber?: string;
      issuanceDate?: string;
      expiryDate?: string;
    } = {};
    
    // Split text into lines for better row/column analysis
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    
    // Helper function to normalize text for better matching
    const normalizeText = (text: string): string => {
      return text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .trim()
        .toLowerCase();
    };
    
    // Function to find a line containing a specific label and extract the value after it
    const findValueByLabel = (label: string, lineArray: string[]): string | null => {
      const labelNormalized = normalizeText(label);
      
      // Look for exact matches first
      for (const line of lineArray) {
        const lineNormalized = normalizeText(line);
        if (lineNormalized.includes(labelNormalized)) {
          // Extract text after the label
          const afterLabel = line.substring(line.toLowerCase().indexOf(label.toLowerCase()) + label.length);
          const value = afterLabel.replace(/^[:;.,\s]+/, '').trim();
          if (value) return value;
        }
      }
      
      // Look for matches with word boundaries
      for (const line of lineArray) {
        const match = line.match(new RegExp(`\\b${label}\\b[^a-zA-Z0-9]?\\s*([\\w\\s]+)`, 'i'));
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      // Look for lines that start with the label
      for (let i = 0; i < lineArray.length; i++) {
        if (normalizeText(lineArray[i]).startsWith(labelNormalized)) {
          // Check if value is on same line after label
          const value = lineArray[i].substring(lineArray[i].toLowerCase().indexOf(label.toLowerCase()) + label.length)
            .replace(/^[:;.,\s]+/, '').trim();
          
          if (value) return value;
          
          // If not found on same line, value might be on next line
          if (i + 1 < lineArray.length) return lineArray[i + 1].trim();
        }
      }
      
      // Try fuzzy matching as a last resort
      for (const line of lineArray) {
        // Allow for OCR errors by checking if label is mostly contained in the line
        const lineNormalized = normalizeText(line);
        const labelWords = labelNormalized.split(' ');
        let matchCount = 0;
        
        for (const word of labelWords) {
          if (word.length > 2 && lineNormalized.includes(word)) { // Only check words longer than 2 chars
            matchCount++;
          }
        }
        
        // If more than half of the label words are found, consider it a match
        if (matchCount > labelWords.length / 2) {
          const labelEndIndex = Math.max(...labelWords.map(word => {
            const idx = lineNormalized.indexOf(word);
            return idx >= 0 ? idx + word.length : -1;
          }));
          
          if (labelEndIndex > 0) {
            const value = line.substring(labelEndIndex).replace(/^[:;.,\s]+/, '').trim();
            if (value) return value;
          }
        }
      }
      
      return null;
    };
    
    // Try to find MRZ lines with more aggressive pattern matching
    let mrzLine = '';
    
    // First approach: Find lines that look like MRZ (long lines with uppercase and special chars)
    const potentialMrzLines = lines.filter(line => {
      // Typical MRZ line characteristics
      return (line.length > 20 && 
              (line.includes('P<') || 
               line.includes('PK') || // Common OCR error for P<
               line.includes('PL') || // Common OCR error for P<
               line.includes('PC') || // Common OCR error for P<
               line.toUpperCase() === line)); // All uppercase is a good indicator
    });
    
    if (potentialMrzLines.length > 0) {
      mrzLine = potentialMrzLines.reduce((longest, current) => 
        current.length > longest.length ? current : longest, '');
      console.log("Found potential MRZ line:", mrzLine);
    }
    
    // Second approach: Look for country codes in the text as indicator of MRZ
    if (!mrzLine) {
      const commonCountryCodes = ['USA', 'MYS', 'GBR', 'CAN', 'AUS', 'NZL', 'DEU', 'FRA'];
      for (const code of commonCountryCodes) {
        const countryLine = lines.find(line => 
          line.includes(`P<${code}`) || 
          line.includes(`PK${code}`) || 
          line.includes(`PL${code}`) ||
          line.includes(`PC${code}`)
        );
        
        if (countryLine) {
          mrzLine = countryLine;
          console.log("Found country code MRZ line:", mrzLine);
          break;
        }
      }
    }
    
    // If we still don't have MRZ, look more aggressively for passport line patterns
    if (!mrzLine) {
      // Replace common OCR mistakes before matching
      const preprocessedText = text
        .replace(/PK/g, 'P<')
        .replace(/PL/g, 'P<')
        .replace(/PC/g, 'P<');
      
      const mrzRegex = /P[<KLC][A-Z]{3}[A-Z0-9<KLC]+/g;
      const mrzMatches = [...preprocessedText.matchAll(mrzRegex)];
      
      if (mrzMatches.length > 0) {
        mrzLine = mrzMatches.reduce((best, current) => 
          current[0].length > best.length ? current[0] : best, '');
          
        console.log("Extracted MRZ with aggressive pattern:", mrzLine);
      }
    }
    
    // Process MRZ line if found
    if (mrzLine) {
      // Pre-process the MRZ line to fix common OCR errors
      // Replace K, L, C with < when they're likely to be separators
      mrzLine = mrzLine
        .replace(/PK/g, 'P<')
        .replace(/PL/g, 'P<')
        .replace(/PC/g, 'P<');
      
      // Extract country code and name portion with more lenient pattern
      const mrzMatch = mrzLine.match(/P[<KLC]([A-Z]{3})([A-Z0-9<KLC\s]+)/);
      
      if (mrzMatch) {
        const countryCode = mrzMatch[1];
        let namePortion = mrzMatch[2];
        
        console.log("Country code:", countryCode);
        console.log("Name portion before cleanup:", namePortion);
        
        // IMPROVED: Set nationality and citizenship based on country code
        if (countryCode === 'MYS') {
          extractedData.nationality = 'Malaysia';
        } else if (countryCode === 'USA') {
          extractedData.nationality = 'United States';
        } else {
          extractedData.nationality = countryCode; // Just use the code if we don't have a mapping
        }
        
        // ENHANCED: More aggressive replacement of K, L, C characters with <
        // First, handle the most common pattern: replace all K, L, C between letters
        namePortion = namePortion.replace(/([A-Z0-9])[KLC]([A-Z0-9])/g, '$1<$2');
        
        // Handle sequences of K, L, C (likely multiple < symbols)
        namePortion = namePortion.replace(/K{2,}/g, '<<');
        namePortion = namePortion.replace(/L{2,}/g, '<<');
        namePortion = namePortion.replace(/C{2,}/g, '<<');
        
        // Handle K, L, C at beginning or end of words
        namePortion = namePortion.replace(/^([KLC])([A-Z0-9])/g, '<$2');
        namePortion = namePortion.replace(/([A-Z0-9])([KLC])$/g, '$1<');
        
        // Second-pass replacements for remaining K, L, C in MRZ context
        namePortion = namePortion.replace(/([A-Z0-9])K([A-Z0-9])/g, '$1<$2');
        namePortion = namePortion.replace(/([A-Z0-9])L([A-Z0-9])/g, '$1<$2');
        namePortion = namePortion.replace(/([A-Z0-9])C([A-Z0-9])/g, '$1<$2');
        
        console.log("Name portion after cleanup:", namePortion);
        
        // Process name portion - replace < with spaces and handle special cases
        let fullName = namePortion.replace(/</g, ' ').trim();
        
        // Clean up multiple spaces
        fullName = fullName.replace(/\s+/g, ' ');
        
        // Detect Malaysian name pattern (with BIN/BINTI)
        const nameParts = fullName.split(' ');
        const binIndex = nameParts.findIndex(part => 
          part === 'BIN' || part === 'BINTI' || part === 'B' || part === 'BT');
        
        if (countryCode === 'MYS' && binIndex !== -1) {
          // Format Malaysian name properly
          const firstName = nameParts.slice(0, binIndex).join(' ');
          let binPart = nameParts[binIndex];
          // Expand shortened forms
          if (binPart === 'B') binPart = 'BIN';
          if (binPart === 'BT') binPart = 'BINTI';
          
          const lastName = nameParts.slice(binIndex + 1).join(' ');
          fullName = `${firstName} ${binPart} ${lastName}`;
        }
        
        extractedData.fullName = fullName;
        console.log("Extracted name from MRZ:", fullName);
      }
      
      // Try to extract date of birth from MRZ
      // Common MRZ date format is YYMMDD
      const dobRegex = /\d{6}/g;
      const dobMatches = [...mrzLine.matchAll(dobRegex)];
      
      if (dobMatches.length > 0) {
        // Use the first 6-digit sequence as potential DOB
        let dobString = dobMatches[0][0];
        console.log("Potential DOB from MRZ before correction:", dobString);
        
        // Correct common OCR errors in digits
        dobString = dobString
          .replace(/[gq]/gi, '9') // g and q often misread as 9
          .replace(/[B]/gi, '8')  // B often misread as 8
          .replace(/[G]/gi, '6')  // G often misread as 6
          .replace(/[S]/gi, '5')  // S often misread as 5
          .replace(/[l|I]/gi, '1'); // l and I often misread as 1
        
        console.log("Potential DOB from MRZ after correction:", dobString);
        
        if (dobString && dobString.length === 6) {
          try {
            // Extract year, month, day
            let year = parseInt(dobString.substring(0, 2));
            const month = parseInt(dobString.substring(2, 4)) - 1; // JS months are 0-based
            const day = parseInt(dobString.substring(4, 6));
            
            // Determine century - MRZ typically uses 2-digit years
            // If year > current 2-digit year + 20, assume 1900s, otherwise 2000s
            // This handles the case where someone born in 2022 would have '22' as year
            const currentYear = new Date().getFullYear();
            const currentYearLastTwo = currentYear % 100;
            
            if (year > currentYearLastTwo + 20) {
              year += 1900;
            } else {
              year += 2000;
            }
            
            // Create date object
            const dob = new Date(year, month, day);
            
            // Check if valid date
            if (!isNaN(dob.getTime())) {
              extractedData.dateOfBirth = dob.toISOString().split('T')[0]; // YYYY-MM-DD format
              
              // Calculate age
              const today = new Date();
              let age = today.getFullYear() - dob.getFullYear();
              
              // Adjust age if birthday hasn't occurred yet this year
              if (today.getMonth() < dob.getMonth() || 
                 (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
                age--;
              }
              
              extractedData.age = String(age);
              console.log("Calculated age from MRZ DOB:", age);
            } else {
              // If dob is invalid, just calculate age from year as a fallback
              console.log("DOB invalid, falling back to year-only calculation");
              const ageFromYear = currentYear - year;
              extractedData.age = String(ageFromYear);
              extractedData.dateOfBirth = `${year}-01-01`; // Approximate with Jan 1
              console.log("Approximated age from year:", ageFromYear);
            }
          } catch (e) {
            console.error("Error processing DOB from MRZ:", e);
            // Fallback: Try to extract just the year and calculate approximate age
            try {
              const yearStr = dobString.substring(0, 2);
              let year = parseInt(yearStr);
              const currentYear = new Date().getFullYear();
              
              // Determine century
              if (year > (currentYear % 100) + 20) {
                year += 1900;
              } else {
                year += 2000;
              }
              
              const approximateAge = currentYear - year;
              if (approximateAge > 0 && approximateAge < 120) {
                extractedData.age = String(approximateAge);
                extractedData.dateOfBirth = `${year}-01-01`; // Approximate with Jan 1
                console.log("Fallback age calculation from year:", approximateAge);
              }
            } catch (yearErr) {
              console.error("Failed to extract year for age calculation:", yearErr);
            }
          }
        }
      }
    }
    
    // ENHANCED DATE OF BIRTH EXTRACTION
    // Strategy 1: Extract from MRZ line in passports
    // ... existing MRZ extraction logic ...
    
    // Strategy 2: Look for explicit date patterns with DOB labels
    const explicitDobPatterns = [
      // Label-based patterns
      /(?:birth|dob|born|date\s+of\s+birth|birth\s+date)[\s:.,-]+(\d{1,4}[\s./-]+\d{1,2}[\s./-]+\d{1,4})/i,
      /(?:birth|dob|born|date\s+of\s+birth|birth\s+date)[\s:.,-]+(\d{1,2}[\s./-]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s./-]*\d{1,4})/i,
      // Pattern with date first then label
      /(\d{1,4}[\s./-]+\d{1,2}[\s./-]+\d{1,4})[\s:.,-]+(\d{1,2}[\s./-]+birth|dob|born|date\s+of\s+birth|birth\s+date)/i,
      // Japanese format (year, month, day)
      /(?:birth|dob|born|date\s+of\s+birth|birth\s+date)[\s:.,-]+(\d{4}年\d{1,2}月\d{1,2}日)/i,
      // Chinese format
      /(?:birth|dob|born|date\s+of\s+birth|birth\s+date)[\s:.,-]+(\d{4}年\d{1,2}月\d{1,2}日)/i,
      // European formats
      /(?:birth|dob|born|date\s+of\s+birth|birth\s+date)[\s:.,-]+(\d{1,2}[\s./-]+\d{1,2}[\s./-]+\d{4})/i,
      // Simple digit sequences that might be dates
      /(?:birth|dob|born|date\s+of\s+birth|birth\s+date)[\s:.,-]+(\d{2}[\s./-]+\d{2}[\s./-]+\d{2,4})/i,
    ];
    
    for (const pattern of explicitDobPatterns) {
      const match = text.match(pattern);
      if (match) {
        const potentialDob = match[1].trim();
        console.log("Found potential DOB with explicit pattern:", potentialDob);
        
        // Clean up the date string for better parsing
        let cleanDate = potentialDob
          .replace(/年|月|日/g, '/') // Convert Japanese/Chinese date separators
          .replace(/[^\d/.\-]/g, '/') // Convert any non-digit, non-separator char to /
          .replace(/[/.\-]+/g, '/');  // Normalize all separators to /
        
        // Try different date parsing approaches
        let parsedDate: Date | null = null;
        
        // Try different date formats
        const dateFormats = [
          // YYYY/MM/DD
          () => {
            const parts = cleanDate.split('/');
            if (parts.length === 3 && parts[0].length === 4) {
              return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            }
            return null;
          },
          // DD/MM/YYYY
          () => {
            const parts = cleanDate.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
              return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
            }
            return null;
          },
          // MM/DD/YYYY
          () => {
            const parts = cleanDate.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
              return new Date(parseInt(parts[2]), parseInt(parts[0])-1, parseInt(parts[1]));
            }
            return null;
          },
          // Try standard Date parsing
          () => {
            const date = new Date(cleanDate);
            return isNaN(date.getTime()) ? null : date;
          }
        ];
        
        // Try each format until one works
        for (const formatFn of dateFormats) {
          parsedDate = formatFn();
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            
            // Validate the year is reasonable
            const currentYear = new Date().getFullYear();
            if (year > 1900 && year <= currentYear) {
              extractedData.dateOfBirth = parsedDate.toISOString().split('T')[0];
              extractedData.birthYear = String(year);
              
              // Calculate age
              let age = currentYear - year;
              const currentMonth = new Date().getMonth();
              const birthMonth = parsedDate.getMonth();
              
              // Adjust if birthday hasn't occurred yet this year
              if (currentMonth < birthMonth || 
                 (currentMonth === birthMonth && new Date().getDate() < parsedDate.getDate())) {
                age--;
              }
              
              extractedData.age = String(age);
              console.log("Calculated age from explicit DOB pattern:", age);
              break;
            }
          }
        }
        
        if (extractedData.dateOfBirth) break; // Stop if we found a valid date
      }
    }
    
    // Strategy 3: Look for year-only mentions
    if (!extractedData.dateOfBirth) {
      const yearPatterns = [
        /(?:birth|born|birth\s+year|year\s+of\s+birth)[\s:.,-]+(?:in\s+)?(\d{4})\b/i,
        /\b(19\d{2}|20[0-2]\d)[\s:.,-]+(?:birth|born|birth\s+year|year\s+of\s+birth)/i,
      ];
      
      for (const pattern of yearPatterns) {
        const match = text.match(pattern);
        if (match) {
          const birthYear = match[1].trim();
          console.log("Found birth year:", birthYear);
          
          const year = parseInt(birthYear);
          const currentYear = new Date().getFullYear();
          
          // Validate year is reasonable
          if (year > 1900 && year <= currentYear) {
            // Set the birth year
            extractedData.birthYear = birthYear;
            
            // Approximate DOB as January 1st of that year
            extractedData.dateOfBirth = `${year}-01-01`;
            
            // Calculate approximate age
            const age = currentYear - year;
            extractedData.age = String(age);
            console.log("Calculated approximate age from birth year:", age);
            break;
          }
        }
      }
    }
    
    // Strategy 4: Extract potential birth year from any 4-digit number that looks like a year
    if (!extractedData.dateOfBirth && !extractedData.birthYear) {
      const yearMatches = text.match(/\b(19\d{2}|20[0-2]\d)\b/g);
      if (yearMatches) {
        // Filter years that are likely to be birth years (not too old, not in future)
        const currentYear = new Date().getFullYear();
        const potentialBirthYears = yearMatches
          .map(y => parseInt(y))
          .filter(y => y >= 1920 && y <= currentYear - 18) // Assuming minimum age is 18
          .sort((a, b) => b - a); // Sort newest first
        
        if (potentialBirthYears.length > 0) {
          // Use the most recent year that's reasonable for a birth year
          const birthYear = potentialBirthYears[potentialBirthYears.length - 1];
          extractedData.birthYear = String(birthYear);
          extractedData.dateOfBirth = `${birthYear}-01-01`;
          
          // Calculate approximate age
          const age = currentYear - birthYear;
          extractedData.age = String(age);
          console.log("Calculated approximate age from potential birth year:", age);
        }
      }
    }
    
    // ... existing nationality detection code ...
    
    console.log("Final extracted data:", extractedData);
    return extractedData;
  };

  // Connect wallet functionality - real implementation
  const connectWallet = async () => {
    // If already connected, disconnect
    if (walletConnected) {
      setWalletConnected(false);
      setWalletAddress("");
      setWalletError(null);
      setKycService(null);
      return;
    }
    
    try {
      // Ensure we're in a browser environment
      if (typeof window === 'undefined') return;
      
      // Check if ethereum provider exists (e.g., MetaMask)
      if (!window.ethereum) {
        setWalletError("No Ethereum wallet found. Please install MetaMask.");
        return;
      }
      
      // Request accounts access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        // Get current chain ID
        const chainId = window.ethereum.chainId;
        updateNetworkName(chainId);
        
        // Save account info
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        setWalletError(null);
        console.log("Connected wallet:", accounts[0]);
        
        // Check if we're on HashKey Chain Testnet, if not, prompt to switch
        if (chainId !== "0x85") {
          console.log("Not on HashKey Chain Testnet, attempting to switch...");
          await switchToHashKeyChain();
        }
      } else {
        setWalletError("No accounts found. Please create an account in your wallet.");
      }
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

  // Initialize KYC service when wallet is connected
  useEffect(() => {
    if (walletConnected && typeof window !== 'undefined') {
      const initKycService = async () => {
        try {
          console.log('Initializing KYC service...');
          const service = await createKYCService();
          if (service) {
            setKycService(service);
            console.log('KYC service initialized successfully');
            
            // Check if user has already passed KYC
            if (walletAddress) {
              try {
                const hasPassedKYC = await service.hasPassedKYC(walletAddress);
                if (hasPassedKYC) {
                  console.log('User has already passed KYC verification');
                  setKycCompleted(true);
                  setKycVerificationStatus('success');
                  setKycVerificationMessage('KYC verification already completed!');
                  
                  // Get verification timestamp
                  const timestamp = await service.getVerificationTimestamp(walletAddress);
                  if (timestamp > 0) {
                    const date = new Date(timestamp * 1000);
                    setKycVerificationMessage(`KYC verified on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
                  }
                }
              } catch (error) {
                console.error('Error checking KYC status:', error);
              }
            }
          } else {
            console.error('Failed to create KYC service');
          }
        } catch (error) {
          console.error('Error initializing KYC service:', error);
        }
      };
      
      initKycService();
    }
  }, [walletConnected, walletAddress]);
  
  // Check if user has already passed KYC
  useEffect(() => {
    if (kycService && walletAddress) {
      const checkKycStatus = async () => {
        try {
          const hasPassedKYC = await kycService.hasPassedKYC(walletAddress);
          if (hasPassedKYC) {
            setKycCompleted(true);
            setKycVerificationStatus('success');
            setKycVerificationMessage('KYC verification already completed. You can proceed.');
            
            // Get verification timestamp
            const timestamp = await kycService.getVerificationTimestamp(walletAddress);
            if (timestamp > 0) {
              const date = new Date(timestamp * 1000);
              setKycVerificationMessage(`KYC verified on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
            }
          }
        } catch (error) {
          console.error('Error checking KYC status:', error);
        }
      };
      
      checkKycStatus();
    }
  }, [kycService, walletAddress]);

  // Handle KYC submission - updated to use blockchain
  const handleKycSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Basic validation
    if (parseInt(age) < 18) {
      alert("You must be 18 or older to proceed");
      return;
    }
    
    if (!fullName) {
      alert("Please enter your full name");
      return;
    }
    
    if (!documentFile || !hashedData) {
      alert("Please upload and scan your identification document");
      return;
    }
    
    // If no KYC service available, revert to old behavior
    if (!kycService) {
      console.warn("KYC service not available, using legacy verification method");
      console.log("Securely stored hashed KYC data:", hashedData);
      setKycCompleted(true);
      setStep("attestation");
      return;
    }
    
    // Prepare user data for blockchain verification
    setKycVerificationStatus('pending');
    setKycVerificationMessage('Submitting KYC data to blockchain...');
    
    try {
      const userData = {
        fullName,
        age,
        dateOfBirth: dateOfBirth || new Date().toISOString().split('T')[0], // Use current date if DOB not available
        nationality: isCitizen ? 'United States' : 'Other',
        isUSCitizen: isCitizen,
        documentNumber: hashedData // Use the hashed data as document number for privacy
      };
      
      // Submit to blockchain
      const result = await kycService.submitKYCVerification(userData);
      
      if (result.success) {
        setKycVerificationStatus('success');
        setKycVerificationMessage('KYC verification completed successfully!');
        setKycTransactionHash(result.txHash || null);
        setKycCompleted(true);
        
        // Proceed to next step after a short delay
        setTimeout(() => {
          setStep("attestation");
        }, 2000);
      } else {
        setKycVerificationStatus('failed');
        setKycVerificationMessage(`KYC verification failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error during KYC submission:', error);
      setKycVerificationStatus('failed');
      setKycVerificationMessage(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  // Initialize attestation service when wallet is connected - add this after the KYC service initialization
  useEffect(() => {
    if (walletConnected && typeof window !== 'undefined') {
      const initAttestationService = async () => {
        try {
          console.log('Initializing attestation service...');
          const service = await createAttestationService();
          if (service) {
            setAttestationService(service);
            console.log('Attestation service initialized successfully');
          } else {
            console.error('Failed to create attestation service');
          }
        } catch (error) {
          console.error('Error initializing attestation service:', error);
        }
      };
      
      initAttestationService();
    }
  }, [walletConnected]);

  // Handle attestation submission
  const handleAttestationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate attestation data
    if (!legalDocs.length || !assetPhotos.length) {
      alert("Please upload at least one legal document and one asset photo");
      return;
    }
    
    if (!propertyDataExtracted || !propertyDataHash) {
      alert("Please scan at least one document to extract property data");
      return;
    }
    
    // Check if wallet is connected
    if (!walletConnected) {
      alert("Please connect your wallet to submit attestation");
      return;
    }
    
    // Check if KYC is completed
    if (!kycCompleted) {
      alert("Please complete KYC verification before submitting attestation");
      return;
    }
    
    // Check if attestation service is initialized
    if (!attestationService) {
      alert("Attestation service is not initialized. Please try again.");
      return;
    }
    
    // Set attestation status to pending
    setAttestationStatus('pending');
    
    try {
      // Prepare photo hashes - in a real app, you'd upload to IPFS and get hashes
      const photoHashes = assetPhotoUrls.map((_, index) => 
        `photo_${index}_${Math.random().toString(36).substring(2, 10)}`
      );
      
      // Use the extracted property data from scanned documents
      // If a field is missing, use the current state value as fallback
      const propertyData = {
        propertyName: extractedProperties.deedNumber?.split('-')[0] || "Property " + Math.floor(Math.random() * 1000),
        propertyDescription: "Property attested through blockchain verification",
        propertyAddress: extractedProperties.address || propertyAddress,
        deedNumber: extractedProperties.deedNumber || deedNumber,
        ownerName: extractedProperties.ownerName || fullName,
        taxId: extractedProperties.taxId || taxId,
        fractionizeAmount: "1000", // Default fractionization amount
        photoHashes
      };
      
      // Update state with the data that will be submitted
      setPropertyName(propertyData.propertyName);
      setPropertyDescription(propertyData.propertyDescription);
      setPropertyAddress(propertyData.propertyAddress);
      setDeedNumber(propertyData.deedNumber);
      setFractionizeAmount(propertyData.fractionizeAmount);
      
      console.log("Submitting attestation with data:", propertyData);
      
      // Submit attestation to blockchain
      const result = await attestationService.attestProperty(propertyData, photoHashes);
      
      if (result.success) {
        setAttestationStatus('success');
        setAttestationTxHash(result.txHash || null);
        setAttestationComplete(true);
        
        // Show success message
        alert("Property attestation successful! Your asset is now verified on the blockchain and ready for listing.");
        
        // Proceed to dashboard after a short delay
        setTimeout(() => {
          setStep("dashboard");
        }, 2000);
      } else {
        setAttestationStatus('failed');
        alert(`Attestation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error during attestation submission:', error);
      setAttestationStatus('failed');
      alert(`Error: ${error.message || 'Unknown error during attestation'}`);
    }
  };

  // Handle asset photo upload
  const handleAssetPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setAssetPhotos(Array.from(files));
    setAssetPhotoUrls(Array.from(files).map(file => URL.createObjectURL(file)));
  };

  // Handle legal document upload
  const handleLegalDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setLegalDocs(Array.from(files));
  };

  // Add scanLegalDocument implementation to actually extract data
  const scanLegalDocument = async (index: number) => {
    if (!legalDocs[index]) return;
    
    setDocScanStatuses(prevStatuses => {
      const newStatuses = [...prevStatuses];
      newStatuses[index] = 'scanning';
      return newStatuses;
    });
    
    try {
      // Create a FileReader to read the document as text or data URL
      const fileReader = new FileReader();
      
      // Get file extension/type
      const fileName = legalDocs[index].name;
      const fileType = legalDocs[index].type;
      
      // Different processing based on file type
      if (fileType.includes('image/')) {
        // Image processing using OCR
        fileReader.readAsDataURL(legalDocs[index]);
        
        fileReader.onload = async (e) => {
          const imageDataUrl = e.target?.result as string;
          
          // Simulate preprocessing (similar to our KYC scan)
          // In a real app, process the image with Tesseract.js or a similar OCR library
          setTimeout(async () => {
            // Simulate document scanning
            console.log(`Scanning document: ${legalDocs[index].name}`);
            
            // Example extracted text (simulate OCR result)
            const extractedText = `
              PROPERTY DEED
              Deed Number: D${Math.floor(Math.random() * 1000000)}
              Property Address: 123 Blockchain Avenue, Crypto City, CC 12345
              Owner: ${fullName || 'Property Owner'}
              Tax ID: TX${Math.floor(Math.random() * 10000)}
              Date: ${new Date().toLocaleDateString()}
            `;
            
            // Extract property data fields from the text
            const propertyData = extractPropertyData(extractedText);
            
            // Update extracted data state
            setExtractedProperties(prev => ({
              deedNumber: propertyData.deedNumber || prev.deedNumber || deedNumber,
              address: propertyData.address || prev.address || propertyAddress,
              ownerName: propertyData.ownerName || prev.ownerName || fullName,
              taxId: propertyData.taxId || prev.taxId || taxId
            }));
            
            // Set form values from extracted data if empty
            if (!deedNumber && propertyData.deedNumber) setDeedNumber(propertyData.deedNumber);
            if (!propertyAddress && propertyData.address) setPropertyAddress(propertyData.address);
            if (!taxId && propertyData.taxId) setTaxId(propertyData.taxId);
            
            // Mark document as scanned
            setDocScanStatuses(prevStatuses => {
              const newStatuses = [...prevStatuses];
              newStatuses[index] = 'scanned';
              return newStatuses;
            });
            
            // Hash the extracted data for blockchain storage
            const dataToHash = JSON.stringify({
              propertyName,
              propertyAddress: propertyData.address || propertyAddress,
              deedNumber: propertyData.deedNumber || deedNumber,
              ownerName: propertyData.ownerName || fullName,
              taxId: propertyData.taxId || taxId,
              timestamp: new Date().toISOString()
            });
            
            const hashedData = hashData(dataToHash);
            setPropertyDataHash(hashedData);
            setPropertyDataExtracted(true);
            
            // Check if property is already attested on the blockchain
            if (attestationService) {
              try {
                console.log("Checking if property is already attested:", hashedData);
                const isVerified = await attestationService.isHashVerified(hashedData);
                
                if (isVerified) {
                  console.log("Property already attested on blockchain!");
                  setAttestationStatus('success');
                  setKycVerificationMessage("This property is already verified on the blockchain. You can view its attestation data.");
                  setAttestationTxHash("");
                  
                  // Get additional attestation data if available
                  try {
                    const propertyData = await attestationService.getPropertyData(hashedData);
                    console.log("Retrieved property attestation data:", propertyData);
                    
                    // Update UI with blockchain data
                    if (propertyData) {
                      setPropertyName(propertyData.propertyName || "");
                      setPropertyAddress(propertyData.propertyAddress || "");
                      setDeedNumber(propertyData.deedNumber || "");
                      
                      // Show timestamp of attestation if available
                      if (propertyData.timestamp) {
                        const attestationDate = new Date(propertyData.timestamp * 1000);
                        setKycVerificationMessage(`Property verified on blockchain on ${attestationDate.toLocaleDateString()} at ${attestationDate.toLocaleTimeString()}`);
                      }
                    }
                  } catch (error) {
                    console.error("Error fetching attestation data:", error);
                  }
                } else {
                  console.log("Property not yet attested, ready for submission");
                }
              } catch (error) {
                console.error("Error checking attestation status:", error);
              }
            } else {
              console.log("Attestation service not initialized, skipping blockchain verification");
            }
            
          }, 2000); // Simulate processing delay
        };
      } else {
        // For non-image files, simulate document parsing
        setTimeout(async () => {
          // Simulate extraction for non-image documents
          const propertyData = {
            deedNumber: `DN-${Math.floor(Math.random() * 10000)}`,
            address: propertyAddress || "123 Main Street, Anytown",
            ownerName: fullName || "Property Owner",
            taxId: `T-${Math.floor(Math.random() * 10000)}`
          };
          
          // Update extracted data state
          setExtractedProperties(prev => ({
            deedNumber: propertyData.deedNumber || prev.deedNumber || deedNumber,
            address: propertyData.address || prev.address || propertyAddress,
            ownerName: propertyData.ownerName || prev.ownerName || fullName,
            taxId: propertyData.taxId || prev.taxId || taxId
          }));
          
          // Set form values from extracted data if empty
          if (!deedNumber) setDeedNumber(propertyData.deedNumber);
          if (!propertyAddress) setPropertyAddress(propertyData.address);
          if (!taxId) setTaxId(propertyData.taxId);
          
          // Mark document as scanned
          setDocScanStatuses(prevStatuses => {
            const newStatuses = [...prevStatuses];
            newStatuses[index] = 'scanned';
            return newStatuses;
          });
          
          // Hash the extracted data for blockchain storage
          const dataToHash = JSON.stringify({
            propertyName,
            propertyAddress: propertyData.address || propertyAddress,
            deedNumber: propertyData.deedNumber || deedNumber,
            ownerName: propertyData.ownerName || fullName,
            taxId: propertyData.taxId || taxId,
            timestamp: new Date().toISOString()
          });
          
          const hashedData = hashData(dataToHash);
          setPropertyDataHash(hashedData);
          setPropertyDataExtracted(true);
          
          // Check if property is already attested on the blockchain
          if (attestationService) {
            try {
              console.log("Checking if property is already attested:", hashedData);
              const isVerified = await attestationService.isHashVerified(hashedData);
              
              if (isVerified) {
                console.log("Property already attested on blockchain!");
                setAttestationStatus('success');
                setKycVerificationMessage("This property is already verified on the blockchain. You can view its attestation data.");
                setAttestationTxHash("");
                
                // Get additional attestation data if available
                try {
                  const propertyData = await attestationService.getPropertyData(hashedData);
                  console.log("Retrieved property attestation data:", propertyData);
                  
                  if (propertyData) {
                    // Update UI with blockchain data if available
                    setPropertyName(propertyData.propertyName || "");
                    setPropertyAddress(propertyData.propertyAddress || "");
                    setDeedNumber(propertyData.deedNumber || "");
                    
                    // Show timestamp of attestation if available
                    if (propertyData.timestamp) {
                      const attestationDate = new Date(propertyData.timestamp * 1000);
                      setKycVerificationMessage(`Property verified on blockchain on ${attestationDate.toLocaleDateString()} at ${attestationDate.toLocaleTimeString()}`);
                    }
                  }
                } catch (error) {
                  console.error("Error fetching attestation data:", error);
                }
              } else {
                console.log("Property not yet attested, ready for submission");
              }
            } catch (error) {
              console.error("Error checking attestation status:", error);
            }
          } else {
            console.log("Attestation service not initialized, skipping blockchain verification");
          }
          
        }, 2000);
      }
    } catch (error) {
      console.error("Error scanning document:", error);
      
      // Mark as failed
      setDocScanStatuses(prevStatuses => {
        const newStatuses = [...prevStatuses];
        newStatuses[index] = 'none';
        return newStatuses;
      });
    }
  };

  // Remove asset photo
  const removeAssetPhoto = (index: number) => {
    setAssetPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
    setAssetPhotoUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  // Remove legal document
  const removeLegalDoc = (index: number) => {
    setLegalDocs(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  // Extract property data from scanned documents with enhanced pattern recognition
  const extractPropertyData = (text: string) => {
    // Clean up the text - remove extra whitespace and make lowercase for easier matching
    const cleanText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    console.log("Clean text:", cleanText); // For development debugging
    
    // Initialize extracted data object
    const extractedData: { 
      deedNumber?: string;
      address?: string;
      ownerName?: string;
      taxId?: string;
    } = {};
    
    // Split text into lines for better analysis
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    
    // Enhanced pattern matching for property documents
    
    // Deed/Title Number patterns
    const deedNumberPatterns = [
      /deed\s*(?:number|no|#)?[:\s]*([a-z0-9\-]+)/i,
      /title\s*(?:number|no|#)?[:\s]*([a-z0-9\-]+)/i,
      /property\s*id[:\s]*([a-z0-9\-]+)/i,
      /reference\s*(?:number|no|#)?[:\s]*([a-z0-9\-]+)/i,
      /recording\s*(?:number|no|#)?[:\s]*([a-z0-9\-]+)/i,
      /d([0-9]{5,7})/i
    ];
    
    // Address patterns
    const addressPatterns = [
      /property\s*address[:\s]*([^,\n]{5,}(?:,[^,\n]+)*)/i,
      /address[:\s]*([^,\n]{5,}(?:,[^,\n]+)*)/i,
      /property\s*location[:\s]*([^,\n]{5,}(?:,[^,\n]+)*)/i,
      /location[:\s]*([^,\n]{5,}(?:,[^,\n]+)*)/i
    ];
    
    // Owner name patterns
    const ownerPatterns = [
      /owner(?:\(s\))?[:\s]*([^,\n]{2,})/i,
      /owner\s*name[:\s]*([^,\n]{2,})/i,
      /legal\s*owner[:\s]*([^,\n]{2,})/i,
      /owner\s*of\s*record[:\s]*([^,\n]{2,})/i
    ];
    
    // Tax ID patterns
    const taxIdPatterns = [
      /tax\s*(?:id|identification)[:\s]*([a-z0-9\-]+)/i,
      /tax\s*(?:parcel|reference)[:\s]*([a-z0-9\-]+)/i,
      /parcel\s*(?:id|number)[:\s]*([a-z0-9\-]+)/i,
      /tax\s*number[:\s]*([a-z0-9\-]+)/i,
      /tx[:\s\-]*([0-9]{3,5})/i
    ];
    
    // Function to apply patterns to text
    const extractWithPatterns = (patterns: RegExp[], text: string): string | undefined => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          return match[1].trim();
        }
      }
      
      // Try line by line if no match in full text
      for (const line of lines) {
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1] && match[1].trim().length > 0) {
            return match[1].trim();
          }
        }
      }
      
      return undefined;
    };
    
    // Extract each field using the patterns
    extractedData.deedNumber = extractWithPatterns(deedNumberPatterns, cleanText);
    extractedData.address = extractWithPatterns(addressPatterns, cleanText);
    extractedData.ownerName = extractWithPatterns(ownerPatterns, cleanText);
    extractedData.taxId = extractWithPatterns(taxIdPatterns, cleanText);
    
    return extractedData;
  };

  return (
    <div className={`${pressStart2P.variable} min-h-screen relative overflow-hidden`}>
      <Head>
        <title>RWA DeFi - Asset Listing</title>
        <meta name="description" content="List your real world assets on the blockchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Load Tesseract.js */}
      <Script
        src="https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js"
        strategy="beforeInteractive"
      />
      
      {/* Load ethers.js */}
      <Script
        src="https://cdn.ethers.io/lib/ethers-5.6.umd.min.js"
        strategy="beforeInteractive"
      />

      {/* Canvas used for image preprocessing (hidden) */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
      />

      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image 
          src="/listing_bg.png" 
          alt="Listing Background" 
          layout="fill"
          objectFit="cover"
          quality={100}
          priority
        />
      </div>

      {/* Yellow particles animation */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
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
        {/* Header */}
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
          <div className="flex flex-col items-end">
            <button 
              onClick={connectWallet} 
              className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white"
            >
              {walletConnected ? 
                `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 
                "Connect Wallet"
              }
            </button>
            {networkName && walletConnected && (
              <span className="text-xs text-[#FFD54F] mt-1">{networkName}</span>
            )}
            {walletError && (
              <span className="text-xs text-red-400 mt-1">{walletError}</span>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto py-12 px-4">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Asset Listing Portal</h2>
            <p className="text-xs text-white/80 max-w-2xl mx-auto">
              Tokenize and fractionize your real world assets securely through our verification process.
            </p>
          </div>

          {!walletConnected ? (
            <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg max-w-md mx-auto">
              <p className="text-white text-center text-xs mb-6">Please connect your wallet to continue</p>
              <button 
                onClick={connectWallet}
                className="pixel-btn bg-[#6200EA] text-xs py-3 px-6 text-white mx-auto block"
              >
                Connect Wallet
              </button>
              {isClient && !window.ethereum && (
                <div className="mt-4 text-center">
                  <p className="text-yellow-300 text-xs mb-2">No wallet detected</p>
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#FFD54F] underline text-xs"
                  >
                    Install MetaMask
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* KYC Form */}
              {step === "kyc" && (
                <div className={`backdrop-blur-sm bg-black/30 p-6 rounded-lg max-w-xl mx-auto ${isLoaded ? 'pixel-animation' : 'opacity-0'}`}>
                  <h3 className="text-lg text-white mb-6 text-center">KYC Verification</h3>
                  
                  {/* Display blockchain verification status if available */}
                  {kycVerificationStatus !== 'none' && (
                    <div className={`mb-6 p-4 rounded-lg ${
                      kycVerificationStatus === 'pending' ? 'bg-yellow-500/20 border border-yellow-500' :
                      kycVerificationStatus === 'success' ? 'bg-green-500/20 border border-green-500' :
                      'bg-red-500/20 border border-red-500'
                    }`}>
                      <p className="text-white text-xs">{kycVerificationMessage}</p>
                      
                      {kycTransactionHash && (
                        <div className="mt-2">
                          <p className="text-white/70 text-xs">Transaction Hash:</p>
                          <p className="text-xs font-mono text-[#FFD54F] break-all">{kycTransactionHash}</p>
                        </div>
                      )}
                      
                      {kycVerificationStatus === 'success' && (
                        <button
                          onClick={() => setStep("attestation")}
                          className="pixel-btn bg-green-600 text-xs py-2 px-4 text-white mt-3"
                        >
                          Proceed to Attestation
                        </button>
                      )}
                    </div>
                  )}
                  
                  <form onSubmit={handleKycSubmit} className="space-y-6">
                    {/* Document Upload Section */}
                    <div className="space-y-4 mb-8">
                      <h4 className="text-white text-xs mb-2">Upload Identification Document</h4>
                      
                      <div className="space-y-2">
                        <label className="block text-white text-xs">Document Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setDocumentType("passport")}
                            className={`py-2 text-xs ${documentType === "passport" ? 'bg-[#6200EA] text-white' : 'bg-black/20 text-white/70'} rounded border border-white/20`}
                          >
                            Passport
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocumentType("driver_license")}
                            className={`py-2 text-xs ${documentType === "driver_license" ? 'bg-[#6200EA] text-white' : 'bg-black/20 text-white/70'} rounded border border-white/20`}
                          >
                            Driver's License
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocumentType("id_card")}
                            className={`py-2 text-xs ${documentType === "id_card" ? 'bg-[#6200EA] text-white' : 'bg-black/20 text-white/70'} rounded border border-white/20`}
                          >
                            ID Card
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleDocumentUpload}
                            className="hidden" 
                            accept="image/*,.pdf"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="pixel-btn bg-transparent border-white border-2 text-xs py-2 px-4 text-white cursor-pointer"
                          >
                            Upload Document
                          </button>
                          <span className="text-white text-xs ml-3">
                            {documentFile ? documentFile.name : "No file chosen"}
                          </span>
                        </div>
                        <p className="text-white/60 text-xs mt-1">
                          Please upload a clear image of your {documentType === "passport" ? "passport" : documentType === "driver_license" ? "driver's license" : "ID card"}
                        </p>
                      </div>
                      
                      {/* Document Preview */}
                      {documentPreview && (
                        <div className="mt-4">
                          <div className="border-2 border-dashed border-white/30 rounded-lg p-2 bg-black/20">
                            <div className="aspect-video relative overflow-hidden rounded">
                              <Image 
                                src={documentPreview}
                                alt="Document Preview" 
                                layout="fill"
                                objectFit="contain"
                                className="rounded"
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center mt-3">
                            <button
                              type="button"
                              onClick={scanDocument}
                              disabled={isScanning || scanComplete}
                              className={`pixel-btn ${isScanning ? 'bg-gray-500' : scanComplete ? 'bg-green-600' : 'bg-[#6200EA]'} text-xs py-2 px-4 text-white mx-auto`}
                            >
                              {isScanning ? `Scanning (${scanProgress}%)...` : scanComplete ? "Scan Complete ✓" : "Scan Document"}
                            </button>
                            
                            {isScanning && (
                              <div className="w-full max-w-xs mt-2">
                                <div className="bg-black/30 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-purple-500 h-full transition-all duration-300"
                                    style={{ width: `${scanProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Scan Results Summary */}
                      {scanComplete && (
                        <div className="mt-4 p-3 bg-[#6200EA]/20 rounded-lg border border-[#6200EA]">
                          <h5 className="text-white text-xs mb-2">Data Extraction Complete</h5>
                          <p className="text-white/70 text-xs">
                            We've extracted and securely encrypted your identity information.
                          </p>
                          <div className="mt-2 p-2 bg-black/30 rounded text-xs text-green-400 font-mono">
                            {hashedData?.substring(0, 20) + "..." || "Hash generation error"}
                          </div>
                          
                          {/* Debugging section - can be removed in production */}
                          <div className="mt-3 border-t border-purple-500/30 pt-2">
                            <details>
                              <summary className="text-white/70 text-xs cursor-pointer">View extracted text (for debugging)</summary>
                              <div className="mt-2 p-2 bg-black/50 rounded text-xs text-white/60 font-mono h-24 overflow-y-auto">
                                {extractedText || "No text extracted"}
                              </div>
                            </details>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Add new section for blockchain verification */}
                    <div className="border-t border-white/10 pt-6 mt-6">
                      <h4 className="text-white text-xs mb-4">Blockchain Verification</h4>
                      <p className="text-white/70 text-xs mb-4">
                        Your KYC data will be securely verified on-chain. Only a hash of your data is stored, 
                        keeping your personal information private while providing cryptographic proof of verification.
                      </p>
                      
                      {/* Show wallet connection status */}
                      <div className="bg-black/30 p-3 rounded-lg mb-4">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${walletConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <p className="text-white text-xs">
                            {walletConnected ? 'Wallet Connected' : 'Connect wallet to enable blockchain verification'}
                          </p>
                        </div>
                        {walletConnected && (
                          <>
                            <p className="text-white/60 text-xs mt-1">Address: {walletAddress}</p>
                            {networkName && (
                              <p className="text-white/60 text-xs mt-1">Network: {networkName}</p>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Show switch network button if not on HashKey Chain */}
                      {walletConnected && networkName !== "HashKey Chain Testnet" && (
                        <button
                          onClick={switchToHashKeyChain}
                          className="pixel-btn bg-[#FFD54F] text-xs py-2 px-4 text-black mb-4 w-full"
                        >
                          Switch to HashKey Chain Testnet
                        </button>
                      )}
                      
                      {/* Display transaction hash and explorer link if available */}
                      {kycTransactionHash && kycVerificationStatus === 'success' && (
                        <div className="bg-green-900/30 p-3 rounded-lg mt-3">
                          <p className="text-white text-xs mb-2">Transaction Details:</p>
                          <a 
                            href={`https://hashkeychain-testnet-explorer.alt.technology/tx/${kycTransactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FFD54F] underline text-xs"
                          >
                            View on HashKey Chain Explorer
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      type="submit"
                      className={`pixel-btn text-xs py-3 px-6 text-white mx-auto block mt-8 ${
                        !scanComplete || kycVerificationStatus === 'pending' 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : 'bg-[#6200EA]'
                      }`}
                      disabled={!scanComplete || kycVerificationStatus === 'pending'}
                    >
                      {kycVerificationStatus === 'pending' 
                        ? 'Verifying...' 
                        : kycVerificationStatus === 'success' 
                          ? 'Verified ✓' 
                          : 'Verify Identity'}
                    </button>
                  </form>
                </div>
              )}

              {/* Attestation Form */}
              {step === "attestation" && (
                <div className={`${isLoaded ? 'pixel-animation' : 'opacity-0'}`}>
                  <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg">
                    <h3 className="text-xl text-white mb-6">Asset Attestation</h3>
                    
                    <form onSubmit={handleAttestationSubmit} className="space-y-6">
                      <div className="mb-6">
                        <h4 className="text-white text-sm mb-2">RWA Attestation Process</h4>
                        <p className="text-white/70 text-xs">
                          Submit your property documents and photos for blockchain attestation. Our system will automatically extract 
                          property details for verification. Complete these steps to tokenize your real world asset on the blockchain.
                        </p>
                      </div>
                    
                      {/* Asset Photo Upload */}
                      <div className="space-y-2 border border-white/20 p-4 rounded">
                        <h5 className="text-white text-xs font-bold mb-3">Step 1: Upload Asset Photos</h5>
                        <p className="text-white/60 text-xs mb-3">
                          Upload clear photos of your property. These images will be used to verify the asset's condition and features.
                        </p>
                        <div className="flex items-center">
                          <input 
                            type="file" 
                            id="assetPhotos"
                            onChange={handleAssetPhotoUpload}
                            className="hidden"
                            accept="image/*"
                            multiple
                          />
                          <label 
                            htmlFor="assetPhotos" 
                            className="pixel-btn bg-[#4CAF50] text-xs py-2 px-4 text-white cursor-pointer"
                          >
                            Upload Photos
                          </label>
                          <span className="text-white text-xs ml-3">
                            {assetPhotos.length > 0 ? `${assetPhotos.length} photos selected` : "No photos uploaded"}
                          </span>
                        </div>
                        
                        {/* Photo Previews */}
                        {assetPhotos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {assetPhotoUrls.map((url, index) => (
                              <div key={index} className="relative aspect-square border border-white/20 rounded overflow-hidden">
                                <Image
                                  src={url}
                                  alt={`Property photo ${index + 1}`}
                                  layout="fill"
                                  objectFit="cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeAssetPhoto(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                  aria-label="Remove photo"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Multiple Documents Upload */}
                      <div className="space-y-2 border border-white/20 p-4 rounded">
                        <h5 className="text-white text-xs font-bold mb-3">Step 2: Upload & Scan Legal Documents</h5>
                        <p className="text-white/60 text-xs mb-3">
                          Upload property documents (deed, title, tax certificates). Our system will automatically 
                          extract and verify the property information.
                        </p>
                        <div className="flex items-center">
                          <input 
                            type="file" 
                            id="legalDocumentation"
                            onChange={handleLegalDocsUpload}
                            className="hidden"
                            accept=".pdf,image/*,.doc,.docx"
                            multiple
                          />
                          <label 
                            htmlFor="legalDocumentation" 
                            className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white cursor-pointer"
                          >
                            Upload Documents
                          </label>
                          <span className="text-white text-xs ml-3">
                            {legalDocs.length > 0 ? `${legalDocs.length} documents selected` : "No documents uploaded"}
                          </span>
                        </div>
                        
                        {/* Document List */}
                        {legalDocs.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {legalDocs.map((doc, index) => (
                              <div key={index} className="flex justify-between items-center bg-black/30 rounded p-2">
                                <div className="flex items-center">
                                  <div className="bg-[#6200EA] p-1 rounded mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <span className="text-white text-xs truncate max-w-xs">{doc.name}</span>
                                </div>
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => scanLegalDocument(index)}
                                    className={`pixel-btn text-xs mr-2 py-1 px-2 ${
                                      docScanStatuses[index] === 'scanned' ? 'bg-green-600 text-white' :
                                      docScanStatuses[index] === 'scanning' ? 'bg-yellow-600 text-white' :
                                      'bg-[#6200EA] text-white'
                                    }`}
                                    disabled={docScanStatuses[index] === 'scanning' || docScanStatuses[index] === 'scanned'}
                                  >
                                    {docScanStatuses[index] === 'scanned' ? 'Scanned ✓' :
                                     docScanStatuses[index] === 'scanning' ? 'Scanning...' :
                                     'Scan Document'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeLegalDoc(index)}
                                    className="text-red-400 hover:text-red-300"
                                    aria-label="Remove document"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Scan Results Display */}
                      {propertyDataExtracted && (
                        <div className="border border-green-500 p-4 rounded bg-green-900/20">
                          <h5 className="text-white text-xs font-bold mb-3">Step 3: Review Extracted Property Data</h5>
                          <p className="text-white/70 text-xs mb-3">
                            We've successfully extracted the following property details from your documents:
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {extractedProperties.deedNumber && (
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Deed Number:</p>
                                <p className="text-white text-xs">{extractedProperties.deedNumber}</p>
                              </div>
                            )}
                            {extractedProperties.address && (
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Property Address:</p>
                                <p className="text-white text-xs">{extractedProperties.address}</p>
                              </div>
                            )}
                            {extractedProperties.ownerName && (
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Owner Name:</p>
                                <p className="text-white text-xs">{extractedProperties.ownerName}</p>
                              </div>
                            )}
                            {extractedProperties.taxId && (
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Tax ID:</p>
                                <p className="text-white text-xs">{extractedProperties.taxId}</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-white/60 text-xs">Data Hash:</p>
                            <p className="text-xs font-mono text-green-400 break-all">
                              {propertyDataHash?.substring(0, 20) + "..." || "Hash generation error"}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Blockchain Attestation Status */}
                      <div className="border border-white/20 p-4 rounded">
                        <h5 className="text-white text-xs font-bold mb-3">Step 4: Submit Blockchain Attestation</h5>
                        <p className="text-white/70 text-xs mb-3">
                          Your property data will be securely verified on-chain. This creates an immutable record
                          of your ownership while keeping sensitive data private through encryption.
                        </p>
                        
                        {/* Show attestation status */}
                        <div className="bg-black/30 p-3 rounded-lg mb-4">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              attestationStatus === 'pending' ? 'bg-yellow-500' :
                              attestationStatus === 'success' ? 'bg-green-500' :
                              attestationStatus === 'failed' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}></div>
                            <p className="text-white text-xs">
                              {attestationStatus === 'pending' ? 'Attestation in progress...' :
                               attestationStatus === 'success' ? 'Attestation verified successfully' :
                               attestationStatus === 'failed' ? 'Attestation failed' :
                               'Ready for attestation'}
                            </p>
                          </div>
                          
                          {attestationTxHash && (
                            <div className="mt-2">
                              <p className="text-white/60 text-xs">Transaction Hash:</p>
                              <a 
                                href={`https://hashkeychain-testnet-explorer.alt.technology/tx/${attestationTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#FFD54F] underline text-xs break-all"
                              >
                                {attestationTxHash}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          id="termsConditions"
                          className="mr-3 h-4 w-4"
                          required
                        />
                        <label htmlFor="termsConditions" className="text-white text-xs">
                          I certify that all information extracted from my documents is accurate and I own the rights to tokenize this asset
                        </label>
                      </div>
                      
                      <div className="flex justify-between pt-4">
                        <button 
                          type="button"
                          onClick={() => setStep("kyc")}
                          className="pixel-btn bg-transparent border-white border-2 text-xs py-3 px-6 text-white"
                        >
                          Back
                        </button>
                        <button 
                          type="submit"
                          className={`pixel-btn text-xs py-3 px-6 text-white ${
                            legalDocs.length === 0 || !propertyDataExtracted || assetPhotos.length === 0 ? 
                            'bg-gray-500 cursor-not-allowed' : 'bg-[#6200EA]'
                          }`}
                          disabled={legalDocs.length === 0 || !propertyDataExtracted || assetPhotos.length === 0}
                        >
                          Submit Attestation
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Dashboard */}
              {step === "dashboard" && (
                <div className={`${isLoaded ? 'pixel-animation' : 'opacity-0'}`}>
                  <div className="backdrop-blur-sm bg-black/30 p-6 rounded-lg mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg text-white">Available Listings</h3>
                      <button
                        onClick={() => setStep("attestation")}
                        className="pixel-btn bg-[#6200EA] text-xs py-2 px-4 text-white"
                      >
                        + New Listing
                      </button>
                    </div>
                    
                    {/* Recently submitted property - shows at top if attestation was just completed */}
                    {attestationComplete && (
                      <div className="bg-[#6200EA]/20 backdrop-blur-sm p-6 rounded-lg mb-8 border-2 border-[#6200EA]">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Property Images */}
                          <div className="md:w-1/3">
                            <div className="aspect-video rounded-lg overflow-hidden bg-black/40 mb-2">
                              {assetPhotoUrls.length > 0 ? (
                                <Image
                                  src={assetPhotoUrls[0]}
                                  alt="Property Main Image"
                                  layout="responsive"
                                  width={16}
                                  height={9}
                                  objectFit="cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-r from-purple-800 to-indigo-800">
                                  <span className="text-white text-xs">No images available</span>
                                </div>
                              )}
                            </div>
                            
                            {assetPhotoUrls.length > 1 && (
                              <div className="grid grid-cols-4 gap-1">
                                {assetPhotoUrls.slice(1, 5).map((url, idx) => (
                                  <div key={idx} className="aspect-square rounded overflow-hidden bg-black/40">
                                    <Image
                                      src={url}
                                      alt={`Property Image ${idx + 2}`}
                                      layout="responsive"
                                      width={1}
                                      height={1}
                                      objectFit="cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Property Details */}
                          <div className="md:w-2/3">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-white text-sm font-bold">{propertyName}</h4>
                              <span className="text-xs text-white bg-green-600 px-2 py-1 rounded">Verified on Chain</span>
                            </div>
                            
                            <p className="text-white/80 text-xs mb-4">{propertyDescription}</p>
                            
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Property Address:</p>
                                <p className="text-white text-xs">{propertyAddress}</p>
                              </div>
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Deed Number:</p>
                                <p className="text-white text-xs">{deedNumber}</p>
                              </div>
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Owner:</p>
                                <p className="text-white text-xs">{extractedProperties.ownerName || fullName}</p>
                              </div>
                              <div className="bg-black/30 p-2 rounded">
                                <p className="text-white/60 text-xs">Tax ID:</p>
                                <p className="text-white text-xs">{extractedProperties.taxId || taxId || "Not available"}</p>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-xs text-white/60">Fractions:</span>
                                <span className="text-xs text-white ml-2">{fractionizeAmount}</span>
                              </div>
                              <div>
                                <span className="text-xs text-white/60">Verified:</span>
                                <span className="text-xs text-white ml-2">Just now</span>
                              </div>
                              <div>
                                <a 
                                  href={`https://hashkeychain-testnet-explorer.alt.technology/tx/${attestationTxHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pixel-btn bg-[#4CAF50]/70 text-xs py-1 px-3 text-white"
                                >
                                  View on Explorer
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Listing Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="px-4 py-3 text-left text-xs text-white">Property</th>
                            <th className="px-4 py-3 text-left text-xs text-white">Availability</th>
                            <th className="px-4 py-3 text-left text-xs text-white">Price per Token</th>
                            <th className="px-4 py-3 text-center text-xs text-white">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleListings.map((listing) => (
                            <tr key={listing.id} className="border-b border-white/10 hover:bg-white/5">
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded overflow-hidden bg-gray-800 mr-3">
                                    <div className="h-full w-full bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                                  </div>
                                  <div>
                                    <p className="text-white text-xs">{listing.propertyName}</p>
                                    <p className="text-white/60 text-xs">{listing.description.substring(0, 30)}...</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="relative h-2 w-24 bg-white/20 rounded-full overflow-hidden">
                                  <div 
                                    className="absolute top-0 left-0 h-full bg-[#4CAF50]"
                                    style={{ width: listing.availability }}
                                  ></div>
                                </div>
                                <span className="text-white text-xs mt-1 block">{listing.availability}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-[#FFD54F] text-xs">{listing.price}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button className="pixel-btn bg-transparent border-[#4CAF50] border text-xs py-1 px-3 text-white">
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

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