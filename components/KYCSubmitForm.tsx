import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { KYCService } from '../utils/kycService';
import { Button, TextField, Typography, Box, CircularProgress, Alert } from '@mui/material';

interface KYCFormData {
  fullName: string;
  age: number;
  country: string;
  walletAddress: string;
}

const KYCSubmitForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState<KYCFormData>({
    fullName: '',
    age: 0,
    country: '',
    walletAddress: '',
  });
  const [kycService, setKycService] = useState<KYCService | null>(null);

  useEffect(() => {
    const initializeEthers = async () => {
      try {
        // Check if wallet is available
        if (typeof window !== 'undefined' && window.ethereum) {
          // Request account access
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          if (accounts.length > 0) {
            setIsConnected(true);
            setFormData(prev => ({ ...prev, walletAddress: accounts[0] }));
            
            // Initialize KYC service
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const kycServiceInstance = new KYCService();
            await kycServiceInstance.initialize(signer);
            setKycService(kycServiceInstance);
          }
        }
      } catch (error) {
        console.error('Error connecting to wallet:', error);
        setError('Failed to connect to wallet. Please ensure MetaMask is installed and unlocked.');
      }
    };

    initializeEthers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    if (!kycService) {
      setError('KYC service not initialized');
      setLoading(false);
      return;
    }

    try {
      // Get transaction data using the updated KYC service
      const txData = await kycService.submitKYCVerification(
        formData.fullName,
        formData.age,
        formData.country
      );
      
      // Show status to user
      setStatus('Preparing to submit KYC verification to blockchain...');
      
      // Get signer from ethers
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Send the transaction with a fixed gas limit to avoid estimation errors
      const tx = await signer.sendTransaction({
        to: txData.to,
        data: txData.data,
        gasLimit: 500000 // Set a fixed gas limit
      });
      
      setStatus('Transaction submitted! Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      setStatus('KYC verification confirmed! Transaction hash: ' + receipt.transactionHash);
    } catch (error: any) {
      console.error('Error submitting KYC verification:', error);
      setError('Error: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="warning">
          Please connect your wallet to submit KYC verification
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Submit KYC Verification
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {status && <Alert severity="info" sx={{ mb: 2 }}>{status}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          label="Age"
          name="age"
          type="number"
          value={formData.age || ''}
          onChange={handleInputChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          label="Country"
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          label="Wallet Address"
          value={formData.walletAddress}
          margin="normal"
          disabled
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit KYC Verification'}
        </Button>
      </form>
    </Box>
  );
};

export default KYCSubmitForm; 