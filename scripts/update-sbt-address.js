// Script to update the SBT contract address in the service files
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Read deployment record to get the SBT contract address
    const deploymentRecord = JSON.parse(fs.readFileSync('./deployment-record.json', 'utf8'));
    const sbtAddress = deploymentRecord.VerificationSBT;
    
    if (!sbtAddress) {
      console.error('SBT contract address not found in deployment record');
      process.exit(1);
    }
    
    console.log(`Found SBT contract address: ${sbtAddress}`);
    
    // Update the sbtService.ts file
    const sbtServicePath = path.join(__dirname, '../utils/sbtService.ts');
    
    if (!fs.existsSync(sbtServicePath)) {
      console.error('SBT service file not found');
      process.exit(1);
    }
    
    // Read the file
    let content = fs.readFileSync(sbtServicePath, 'utf8');
    
    // Replace the SBT contract address
    const addressRegex = /const SBT_CONTRACT_ADDRESS = '(0x[a-fA-F0-9]{40}|0x0{40})';/;
    content = content.replace(addressRegex, `const SBT_CONTRACT_ADDRESS = '${sbtAddress}';`);
    
    // Write the updated content back to the file
    fs.writeFileSync(sbtServicePath, content);
    
    console.log(`Updated SBT contract address in sbtService.ts`);
    
  } catch (error) {
    console.error('Error updating SBT contract address:', error);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 