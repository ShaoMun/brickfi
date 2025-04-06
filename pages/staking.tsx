import { useState, useEffect } from 'react';
import { ethers, Contract, formatEther, parseEther } from 'ethers';
import Head from 'next/head';
import NavigationBar from '../components/NavigationBar';

// ABI for the CeloStakingPool contract (include only the functions you need)
const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function getReward() external",
  "function balanceOf(address account) external view returns (uint256)",
  "function earned(address account) public view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function lockPeriod() external view returns (uint256)",
  "function stakingTime(address account) external view returns (uint256)"
];

// ABI for ERC20 tokens
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)"
];

// Constants - replace with your deployed contract address
const STAKING_CONTRACT_ADDRESS = "0x34199f76AcC3299d6c0157b32Ff9f713D7b44715";
const CUSD_TOKEN_ADDRESS = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // cUSD on mainnet

// Type definitions
type ContractState = Contract | null;

export default function Staking() {
  // State variables
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [stakingContract, setStakingContract] = useState<ContractState>(null);
  const [tokenContract, setTokenContract] = useState<ContractState>(null);
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [stakedBalance, setStakedBalance] = useState('0');
  const [earnedRewards, setEarnedRewards] = useState('0');
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [allowance, setAllowance] = useState('0');
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [totalStaked, setTotalStaked] = useState('0');
  const [errorMessage, setErrorMessage] = useState('');

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          
          // Check for Celo network
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          if (chainId !== '0xa4ec') { // 42220 in hex is Celo Mainnet
            alert('Please connect to Celo network');
            // You can add auto-switching code here
          }
          
          initializeContracts(accounts[0]);
        }
      } else {
        setErrorMessage('Please install MetaMask or a Celo-compatible wallet');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setErrorMessage('Failed to connect wallet');
    }
  };

  // Initialize contracts
  const initializeContracts = async (address: string) => {
    try {
      if (!window.ethereum) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Initialize staking contract
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);
      setStakingContract(staking);
      
      // Initialize token contract
      const token = new ethers.Contract(CUSD_TOKEN_ADDRESS, ERC20_ABI, signer);
      setTokenContract(token);
      
      // Get token symbol
      const symbol = await token.symbol();
      setTokenSymbol(symbol);
      
      // Load initial data
      refreshData(address, staking, token);
    } catch (error) {
      console.error('Contract initialization error:', error);
      setErrorMessage('Failed to initialize contracts');
    }
  };

  // Refresh data
  const refreshData = async (address?: string, staking?: Contract, token?: Contract) => {
    try {
      // Use existing contract instances if provided, otherwise use state
      const stakingInstance = staking || stakingContract;
      const tokenInstance = token || tokenContract;
      const userAddress = address || walletAddress;
      
      if (!stakingInstance || !tokenInstance || !userAddress) return;
      
      // Get token balance
      const balance = await tokenInstance.balanceOf(userAddress);
      setTokenBalance(formatEther(balance));
      
      // Get staked balance
      const staked = await stakingInstance.balanceOf(userAddress);
      setStakedBalance(formatEther(staked));
      
      // Get earned rewards
      const earned = await stakingInstance.earned(userAddress);
      setEarnedRewards(formatEther(earned));
      
      // Get allowance
      const currentAllowance = await tokenInstance.allowance(userAddress, STAKING_CONTRACT_ADDRESS);
      setAllowance(formatEther(currentAllowance));
      
      // Get lock time left
      const stakingTime = await stakingInstance.stakingTime(userAddress);
      const lockPeriod = await stakingInstance.lockPeriod();
      const unlockTime = Number(stakingTime) + Number(lockPeriod);
      const now = Math.floor(Date.now() / 1000);
      setLockTimeLeft(Math.max(0, unlockTime - now));
      
      // Get total staked
      const total = await stakingInstance.totalSupply();
      setTotalStaked(formatEther(total));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Approve tokens
  const approveTokens = async () => {
    try {
      if (!tokenContract) return;
      
      setIsApproving(true);
      setErrorMessage('');
      
      // Approve a large amount (max uint256)
      const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      const tx = await tokenContract.approve(
        STAKING_CONTRACT_ADDRESS, 
        maxUint256
      );
      
      await tx.wait();
      alert(`Successfully approved ${tokenSymbol} for staking!`);
      
      // Refresh allowance
      if (walletAddress) {
        const newAllowance = await tokenContract.allowance(walletAddress, STAKING_CONTRACT_ADDRESS);
        setAllowance(formatEther(newAllowance));
      }
    } catch (error) {
      console.error('Approval error:', error);
      setErrorMessage('Failed to approve tokens');
    } finally {
      setIsApproving(false);
    }
  };

  // Stake tokens
  const stakeTokens = async () => {
    if (!stakingContract || !stakeAmount || parseFloat(stakeAmount) <= 0) {
      setErrorMessage('Please enter a valid amount to stake');
      return;
    }
    
    try {
      setIsStaking(true);
      setErrorMessage('');
      
      const amount = parseEther(stakeAmount);
      
      // Check if allowance is sufficient
      if (parseEther(allowance) < amount) {
        setErrorMessage('Insufficient allowance. Please approve tokens first.');
        setIsStaking(false);
        return;
      }
      
      const tx = await stakingContract.stake(amount);
      await tx.wait();
      
      alert(`Successfully staked ${stakeAmount} ${tokenSymbol}!`);
      setStakeAmount('');
      
      // Refresh data
      refreshData();
    } catch (error) {
      console.error('Staking error:', error);
      setErrorMessage('Failed to stake tokens');
    } finally {
      setIsStaking(false);
    }
  };

  // Withdraw tokens
  const withdrawTokens = async () => {
    if (!stakingContract || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setErrorMessage('Please enter a valid amount to withdraw');
      return;
    }
    
    try {
      setIsWithdrawing(true);
      setErrorMessage('');
      
      const amount = parseEther(withdrawAmount);
      
      // Check if staked balance is sufficient
      if (parseEther(stakedBalance) < amount) {
        setErrorMessage('Insufficient staked balance');
        setIsWithdrawing(false);
        return;
      }
      
      const tx = await stakingContract.withdraw(amount);
      await tx.wait();
      
      alert(`Successfully withdrawn ${withdrawAmount} ${tokenSymbol}!`);
      setWithdrawAmount('');
      
      // Refresh data
      refreshData();
    } catch (error) {
      console.error('Withdrawal error:', error);
      setErrorMessage('Failed to withdraw tokens. You may still be in the lock period.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Claim rewards
  const claimRewards = async () => {
    if (!stakingContract) {
      setErrorMessage('Contract not initialized');
      return;
    }
    
    try {
      setIsClaiming(true);
      setErrorMessage('');
      
      const tx = await stakingContract.getReward();
      await tx.wait();
      
      alert(`Successfully claimed rewards!`);
      
      // Refresh data
      refreshData();
    } catch (error) {
      console.error('Claim error:', error);
      setErrorMessage('Failed to claim rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  // Format time left
  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return 'Unlocked';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Refresh data periodically
  useEffect(() => {
    if (walletConnected) {
      refreshData();
      
      const interval = setInterval(() => {
        refreshData();
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [walletConnected]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Celo Staking Pool</title>
        <meta name="description" content="Stake Celo and earn rewards" />
      </Head>
      
      <NavigationBar />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6 text-center">Celo Staking Pool</h1>
        
        {!walletConnected ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-gray-800 rounded-lg">
            <p className="text-xl">Connect your wallet to start staking</p>
            <button 
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Connect Wallet
            </button>
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Balance Info */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Your Balance</h2>
                <div className="space-y-2">
                  <p>Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</p>
                  <p>Token Balance: {tokenBalance} {tokenSymbol}</p>
                  <p>Staked Balance: {stakedBalance} {tokenSymbol}</p>
                  <p>Earned Rewards: {earnedRewards} {tokenSymbol}</p>
                  <p>Lock Status: {formatTimeLeft(lockTimeLeft)}</p>
                  <p>Total Pool: {totalStaked} {tokenSymbol}</p>
                </div>
              </div>
              
              {/* Approve */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Step 1: Approve Tokens</h2>
                <p className="mb-4">
                  Approve {tokenSymbol} to be used by the staking contract. This is a one-time step.
                </p>
                <button 
                  onClick={approveTokens}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50"
                >
                  {isApproving ? 'Approving...' : 'Approve Tokens'}
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Stake */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Step 2: Stake</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Amount to Stake</label>
                    <input 
                      type="number" 
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="Enter amount" 
                      className="w-full p-2 bg-gray-700 rounded text-white"
                    />
                  </div>
                  <button 
                    onClick={stakeTokens}
                    disabled={isStaking}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50"
                  >
                    {isStaking ? 'Staking...' : 'Stake Tokens'}
                  </button>
                </div>
              </div>
              
              {/* Withdraw */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Step 3: Withdraw</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Amount to Withdraw</label>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount" 
                      className="w-full p-2 bg-gray-700 rounded text-white"
                    />
                  </div>
                  <button 
                    onClick={withdrawTokens}
                    disabled={isWithdrawing || lockTimeLeft > 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw Tokens'}
                  </button>
                  {lockTimeLeft > 0 && (
                    <p className="text-yellow-500 text-sm">Still locked for {formatTimeLeft(lockTimeLeft)}</p>
                  )}
                </div>
              </div>
              
              {/* Claim Rewards */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Step 4: Claim Rewards</h2>
                <div className="space-y-4">
                  <p>Current rewards: {earnedRewards} {tokenSymbol}</p>
                  <button 
                    onClick={claimRewards}
                    disabled={isClaiming || parseFloat(earnedRewards) <= 0}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                  </button>
                </div>
              </div>
            </div>
            
            {errorMessage && (
              <div className="bg-red-800 p-4 rounded-lg">
                <p className="text-red-200">{errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}