This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

## KYC Verification with Soulbound Tokens (SBT)

This project includes a Soulbound Token (SBT) implementation for KYC verification. When a user successfully completes KYC verification, a non-transferable SBT is automatically minted to their wallet, providing an on-chain verification of their identity.

### Features

- **ERC-5192 SBT Implementation**: Non-transferable token based on the ERC-5192 standard
- **Automatic Minting**: SBTs are automatically minted upon successful KYC verification
- **KYC Metadata**: Contains verification timestamp, KYC hash, and verification status
- **Profile Integration**: Verification badge displayed on user profile with SBT details

### Deployment Steps

1. **Compile the Contracts**:
   ```
   npx hardhat compile
   ```

2. **Deploy the SBT Contract**:
   ```
   # For HashKey Chain Testnet
   npm run deploy:sbt
   
   # For local development
   npm run deploy:sbt:local
   ```

3. **Update the SBT Contract Address in the Frontend**:
   ```
   npm run update:sbt-address
   ```

4. **Start the Development Server**:
   ```
   npm run dev
   ```

### How It Works

1. **KYC Verification**: When a user completes KYC verification, the `KYCVerifier` contract verifies their identity and marks them as verified.

2. **SBT Minting**: If verification is successful, the `KYCVerifier` contract automatically mints an SBT to the user's wallet using the `VerificationSBT` contract.

3. **Token Metadata**: The SBT contains metadata including:
   - Verification status
   - Timestamp of verification
   - Hash of KYC data

4. **Profile Badge**: The user's profile displays a verification badge indicating they have completed KYC and hold an SBT.

### Contract Architecture

- **VerificationSBT.sol**: The SBT contract that implements the ERC-5192 standard for non-transferable tokens
- **KYCVerifier.sol**: Updated to integrate with the VerificationSBT contract and mint tokens upon successful verification

### Frontend Integration

- **sbtService.ts**: Service to interact with the VerificationSBT contract
- **WalletContext.tsx**: Updated to include the SBT service
- **Profile Page**: Displays the verification badge and SBT details
