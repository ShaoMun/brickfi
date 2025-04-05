import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createKYCService } from '../utils/kycService';
import { createAttestationService } from '../utils/attestationService';

export default function TestEthers() {
  const [status, setStatus] = useState<string>('Not connected');
  const [address, setAddress] = useState<string | null>(null);
  
  useEffect(() => {
    async function initEthers() {
      try {
        setStatus('Initializing...');
        
        // Check if ethereum provider is available
        if (typeof window !== 'undefined' && window.ethereum) {
          // Create web3 provider
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          
          // Connect to wallet
          await provider.send('eth_requestAccounts', []);
          
          // Get signer
          const signer = provider.getSigner();
          const userAddress = await signer.getAddress();
          setAddress(userAddress);
          
          // Test KYC service
          const kycService = await createKYCService();
          if (kycService) {
            setStatus('KYC service initialized successfully');
          } else {
            setStatus('KYC service failed to initialize');
          }
          
          // Test Attestation service
          const attestationService = await createAttestationService();
          if (attestationService) {
            setStatus('Attestation service initialized successfully');
          } else {
            setStatus('Attestation service failed to initialize');
          }
        } else {
          setStatus('Ethereum provider not available. Please install MetaMask.');
        }
      } catch (error: any) {
        console.error('Error initializing ethers:', error);
        setStatus(`Error: ${error.message || 'Unknown error'}`);
      }
    }
    
    initEthers();
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Ethers.js v5 Test</h1>
      <p><strong>Status:</strong> {status}</p>
      {address && <p><strong>Connected Address:</strong> {address}</p>}
    </div>
  );
} 