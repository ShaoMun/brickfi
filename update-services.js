const fs = require('fs');
const path = require('path');

async function updateServiceFiles() {
  try {
    console.log('Updating service files to fix gas estimation errors...');
    
    // Step 1: Check if our fixed service files exist
    const fixedKYCPath = path.join(__dirname, 'utils', 'kycService_fixed.ts');
    const fixedAttestationPath = path.join(__dirname, 'utils', 'attestationService_fixed.ts');
    
    if (!fs.existsSync(fixedKYCPath)) {
      console.error('Error: Fixed KYC service file not found at', fixedKYCPath);
      return;
    }
    
    if (!fs.existsSync(fixedAttestationPath)) {
      console.error('Error: Fixed attestation service file not found at', fixedAttestationPath);
      return;
    }
    
    // Step 2: Backup original files
    const kycPath = path.join(__dirname, 'utils', 'kycService.ts');
    const attestationPath = path.join(__dirname, 'utils', 'attestationService.ts');
    
    if (fs.existsSync(kycPath)) {
      const backupKYCPath = path.join(__dirname, 'utils', 'kycService.ts.bak');
      fs.copyFileSync(kycPath, backupKYCPath);
      console.log('Backed up original KYC service to', backupKYCPath);
    }
    
    if (fs.existsSync(attestationPath)) {
      const backupAttestationPath = path.join(__dirname, 'utils', 'attestationService.ts.bak');
      fs.copyFileSync(attestationPath, backupAttestationPath);
      console.log('Backed up original attestation service to', backupAttestationPath);
    }
    
    // Step 3: Replace with fixed versions
    fs.copyFileSync(fixedKYCPath, kycPath);
    fs.copyFileSync(fixedAttestationPath, attestationPath);
    
    console.log('Successfully updated service files with fixed versions that avoid gas estimation errors');
    console.log('- KYC Service: Transactions are now prepared but need to be manually triggered from the frontend');
    console.log('- Attestation Service: Transactions are now prepared but need to be manually triggered from the frontend');
    console.log('');
    console.log('IMPORTANT: You will need to update your frontend code to handle these changes:');
    console.log('1. The submitKYCVerification and attestProperty methods now return data for the transaction');
    console.log('2. Your frontend needs to call these methods, then use the returned data to trigger the transaction');
    console.log('3. This approach avoids the gas estimation errors while still allowing blockchain interactions');
  } catch (error) {
    console.error('Error updating service files:', error);
  }
}

// Run the update
updateServiceFiles(); 