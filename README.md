# Celo Staking Pool

A simple staking pool contract for Celo mainnet that allows users to stake tokens (CELO, cUSD, cEUR, or cREAL) and earn rewards.

## Features

- Stake tokens and earn rewards
- Configurable reward rate
- Configurable lock period
- Emergency functions (pause, unpause, emergency withdraw)
- Owner can fund the contract with rewards

## Celo Mainnet Token Addresses

- CELO (native token): `0x471EcE3750Da237f93B8E339c536989b8978a438`
- cUSD (stablecoin): `0x765DE816845861e75A25fCA122bb6898B8B1282a`
- cEUR (stablecoin): `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73`
- cREAL (stablecoin): `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787`

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd celo-staking-pool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your private key and API key:
   ```
   PRIVATE_KEY=your_private_key_here_without_0x_prefix
   CELOSCAN_API_KEY=your_celoscan_api_key_here
   ```

## Deployment

### Test on Alfajores Testnet First

1. Get testnet tokens from the [Celo Faucet](https://faucet.celo.org)

2. Deploy to Alfajores:
   ```bash
   npm run deploy:alfajores
   ```

3. Verify contract on Alfajores Explorer:
   ```bash
   npx hardhat verify --network celoAlfajores [CONTRACT_ADDRESS] [TOKEN_ADDRESS]
   ```

### Deploy to Mainnet

1. Ensure you have real CELO tokens for gas fees.

2. Deploy to Celo mainnet:
   ```bash
   npm run deploy:mainnet
   ```

3. Verify contract on Celo Explorer:
   ```bash
   npx hardhat verify --network celo [CONTRACT_ADDRESS] [TOKEN_ADDRESS]
   ```

## Post-Deployment Steps

1. Fund the contract with reward tokens:
   - Approve the contract to spend your tokens
   - Call the `fundRewards` function with the desired amount

2. Set an appropriate reward rate:
   - Call the `setRewardRate` function with the desired rate
   - Default rate is 0.001 tokens per second (1e15)

3. Users can now stake tokens and earn rewards:
   - They must approve the contract to spend their tokens
   - They can call `stake` to stake tokens
   - They can call `getReward` to claim rewards
   - They can call `withdraw` to withdraw their tokens after the lock period

## Security Considerations

- The contract includes emergency functions that only the owner can call
- The owner can pause the contract in case of emergency
- Users can still withdraw their funds when the contract is paused
- The owner can withdraw all tokens in case of emergency

## License

This project is licensed under the MIT License.
