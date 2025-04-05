# ERC3643 Security Token Factory

This project contains a SecurityTokenFactory contract for creating ERC3643-compliant security tokens on the Polygon Amoy testnet.

## Prerequisites

- Node.js (v14+)
- npm or yarn
- An account with MATIC on Polygon Amoy testnet

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`:
   - `PRIVATE_KEY`: Your private key (without 0x prefix)
   - `POLYGON_AMOY_RPC_URL`: Polygon Amoy RPC URL (default should work)
   - `POLYGONSCAN_API_KEY`: Your Polygonscan API key (optional, for verification)

## Deployment

1. Compile the contracts:
```bash
npx hardhat compile
```

2. Deploy to Polygon Amoy testnet:
```bash
npx hardhat run scripts/deploy-token-factory.js --network amoy
```

3. The deployment script will output:
   - The address of the deployed contract
   - A verification command
   - The deployment information is saved to `deployments/polygon-amoy-deployment.json`

## Contract Verification

Verify your contract on Polygonscan:

```bash
npx hardhat verify --network amoy [CONTRACT_ADDRESS]
```

## Updating the Frontend

After deployment, update the token factory address in your frontend code:

1. Open `pages/listing.tsx`
2. Find the line with `const tokenFactoryAddress = "0x0000000000000000000000000000000000000000";`
3. Replace it with the actual deployed contract address

## Usage

The SecurityTokenFactory contract allows you to:

1. Create new Security Tokens with the required compliance features
2. Track created tokens
3. Retrieve information about deployed tokens

## License

MIT
