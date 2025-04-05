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

  
} 