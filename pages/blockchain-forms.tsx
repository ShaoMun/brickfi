import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Container } from '@mui/material';
import KYCSubmitForm from '../components/KYCSubmitForm';
import PropertyAttestationForm from '../components/PropertyAttestationForm';
import Head from 'next/head';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`blockchain-tabpanel-${index}`}
      aria-labelledby={`blockchain-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `blockchain-tab-${index}`,
    'aria-controls': `blockchain-tabpanel-${index}`,
  };
}

export default function BlockchainForms() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Head>
        <title>BrickFi - Blockchain Forms</title>
        <meta name="description" content="Submit KYC verification and property attestations to the blockchain" />
      </Head>
      
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" align="center" gutterBottom>
          BrickFi Blockchain Forms
        </Typography>
        
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          These forms demonstrate the gas-error-free approach to submitting transactions to the Polygon Amoy testnet.
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="blockchain form tabs"
            centered
          >
            <Tab label="KYC Verification" {...a11yProps(0)} />
            <Tab label="Property Attestation" {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <KYCSubmitForm />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <PropertyAttestationForm />
        </TabPanel>
      </Box>
    </Container>
  );
} 