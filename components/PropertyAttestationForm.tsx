import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AttestationService } from '../utils/attestationService';
import { Button, TextField, Typography, Box, CircularProgress, Alert, Grid } from '@mui/material';

interface PropertyData {
  propertyId: string;
  location: string;
  value: number;
  ownerName: string;
  walletAddress: string;
}

const PropertyAttestationForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState<PropertyData>({
    propertyId: '',
    location: '',
    value: 0,
    ownerName: '',
    walletAddress: '',
  });
  const [attestationService, setAttestationService] = useState<AttestationService | null>(null);

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
            
            // Initialize Attestation service
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const attestationServiceInstance = new AttestationService();
            await attestationServiceInstance.initialize(signer);
            setAttestationService(attestationServiceInstance);
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
      [name]: name === 'value' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    if (!attestationService) {
      setError('Attestation service not initialized');
      setLoading(false);
      return;
    }

    try {
      // Prepare property data
      const propertyData = {
        propertyId: formData.propertyId,
        location: formData.location,
        value: formData.value,
        ownerName: formData.ownerName
      };
      
      // Get transaction data using the updated Attestation service
      const txData = await attestationService.attestProperty(propertyData);
      
      // Show status to user
      setStatus('Preparing to submit property attestation to blockchain...');
      
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
      setStatus('Property attestation confirmed! Transaction hash: ' + receipt.transactionHash);
    } catch (error: any) {
      console.error('Error submitting property attestation:', error);
      setError('Error: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="warning">
          Please connect your wallet to submit property attestations
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Submit Property Attestation
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {status && <Alert severity="info" sx={{ mb: 2 }}>{status}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Property ID"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleInputChange}
              margin="normal"
              required
              helperText="Unique identifier for the property"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Owner Name"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleInputChange}
              margin="normal"
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Property Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              margin="normal"
              required
              helperText="Full address of the property"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Property Value (USD)"
              name="value"
              type="number"
              value={formData.value || ''}
              onChange={handleInputChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: <span>$</span>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Wallet Address"
              value={formData.walletAddress}
              margin="normal"
              disabled
            />
          </Grid>
        </Grid>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Property Attestation'}
        </Button>
      </form>
    </Box>
  );
};

export default PropertyAttestationForm; 