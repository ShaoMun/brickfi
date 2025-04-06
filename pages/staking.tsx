import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
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

export default function Staking() {
  // State variables
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [stakingContract, setStakingContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
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
  const initializeContracts = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
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
  const refreshData = async (address, staking, token) => {
    try {
      // Use existing contract instances if provided, otherwise use state
      const stakingInstance = staking || stakingContract;
      const tokenInstance = token || tokenContract;
      const userAddress = address || walletAddress;
      
      if (!stakingInstance || !tokenInstance || !userAddress) return;
      
      // Get token balance
      const balance = await tokenInstance.balanceOf(userAddress);
      setTokenBalance(ethers.utils.formatEther(balance));
      
      // Get staked balance
      const staked = await stakingInstance.balanceOf(userAddress);
      setStakedBalance(ethers.utils.formatEther(staked));
      
      // Get earned rewards
      const earned = await stakingInstance.earned(userAddress);
      setEarnedRewards(ethers.utils.formatEther(earned));
      
      // Get allowance
      const currentAllowance = await tokenInstance.allowance(userAddress, STAKING_CONTRACT_ADDRESS);
      setAllowance(ethers.utils.formatEther(currentAllowance));
      
      // Get lock time left
      const stakingTime = await stakingInstance.stakingTime(userAddress);
      const lockPeriod = await stakingInstance.lockPeriod();
      const unlockTime = stakingTime.add(lockPeriod).toNumber();
      const now = Math.floor(Date.now() / 1000);
      setLockTimeLeft(Math.max(0, unlockTime - now));
      
      // Get total staked
      const total = await stakingInstance.totalSupply();
      setTotalStaked(ethers.utils.formatEther(total));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Approve tokens
  const approveTokens = async () => {
    try {
      setIsApproving(true);
      setErrorMessage('');
      
      // Approve a large amount (max uint256)
      const tx = await tokenContract.approve(
        STAKING_CONTRACT_ADDRESS, 
        ethers.constants.MaxUint256
      );
      
      await tx.wait();
      alert(`Successfully approved ${tokenSymbol} for staking!`);
      
      // Refresh allowance
      const newAllowance = await tokenContract.allowance(walletAddress, STAKING_CONTRACT_ADDRESS);
      setAllowance(ethers.utils.formatEther(newAllowance));
    } catch (error) {
      console.error('Approval error:', error);
      setErrorMessage('Failed to approve tokens');
    } finally {
      setIsApproving(false);
    }
  };

  // Stake tokens
  const stakeTokens = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setErrorMessage('Please enter a valid amount to stake');
      return;
    }
    
    try {
      setIsStaking(true);
      setErrorMessage('');
      
      const amount = ethers.utils.parseEther(stakeAmount);
      
      // Check if allowance is sufficient
      if (ethers.utils.parseEther(allowance).lt(amount)) {
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
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setErrorMessage('Please enter a valid amount to withdraw');
      return;
    }
    
    try {
      setIsWithdrawing(true);
      setErrorMessage('');
      
      const amount = ethers.utils.parseEther(withdrawAmount);
      
      // Check if staked balance is sufficient
      if (ethers.utils.parseEther(stakedBalance).lt(amount)) {
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
    try {
      setIsClaiming(true);
      setErrorMessage('');
      
      const tx = await stakingContract.getReward();
      await tx.wait();
      
      alert(`Successfully claimed rewards!`);
      
      // Refresh data
      refreshData();
    } catch (error) {
      console.error('Claim rewards error:', error);
      setErrorMessage('Failed to claim rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  // Set up periodic data refresh
  useEffect(() => {
    if (walletConnected && stakingContract && tokenContract) {
      // Refresh initially
      refreshData();
      
      // Set up interval for periodic refreshes
      const intervalId = setInterval(() => {
        refreshData();
      }, 15000); // Every 15 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [walletConnected, stakingContract, tokenContract]);
  
  // Format time left for display
  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return 'No lock period';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 text-white">
      <Head>
        <title>Celo Staking Pool</title>
        <meta name="description" content="Stake your Celo tokens and earn rewards" />
      </Head>
      
      <NavigationBar />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Celo Staking Pool</h1>
        
        {!walletConnected ? (
          <div className="max-w-md mx-auto bg-blue-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="mb-6">Connect your wallet to stake tokens and earn rewards.</p>
            <button 
              onClick={connectWallet}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-md transition duration-300"
            >
              Connect Wallet
            </button>
            {errorMessage && <p className="mt-4 text-red-400">{errorMessage}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Your Stats</h2>
              <div className="space-y-3">
                <p>Wallet: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</p>
                <p>{tokenSymbol} Balance: {parseFloat(tokenBalance).toFixed(4)}</p>
                <p>Staked Balance: {parseFloat(stakedBalance).toFixed(4)}</p>
                <p>Earned Rewards: {parseFloat(earnedRewards).toFixed(6)}</p>
                <p>Unlock Time: {formatTimeLeft(lockTimeLeft)}</p>
              </div>
              
              {parseFloat(allowance) === 0 && (
                <div className="mt-6">
                  <button 
                    onClick={approveTokens}
                    disabled={isApproving}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
                  >
                    {isApproving ? 'Approving...' : `Approve ${tokenSymbol} for Staking`}
                  </button>
                </div>
              )}
              
              {parseFloat(earnedRewards) > 0 && (
                <div className="mt-6">
                  <button 
                    onClick={claimRewards}
                    disabled={isClaiming}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
                  >
                    {isClaiming ? 'Claiming...' : `Claim ${parseFloat(earnedRewards).toFixed(6)} ${tokenSymbol} Rewards`}
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-blue-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Stake & Withdraw</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Stake {tokenSymbol}</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder={`Amount of ${tokenSymbol}`}
                    className="flex-1 bg-blue-900 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={stakeTokens}
                    disabled={isStaking || parseFloat(allowance) === 0}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
                  >
                    {isStaking ? 'Staking...' : 'Stake'}
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Withdraw {tokenSymbol}</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Amount of ${tokenSymbol}`}
                    className="flex-1 bg-blue-900 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={withdrawTokens}
                    disabled={isWithdrawing || parseFloat(stakedBalance) === 0}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
                {lockTimeLeft > 0 && <p className="text-xs text-yellow-300 mt-1">Note: Withdrawals are locked until {formatTimeLeft(lockTimeLeft)}</p>}
              </div>
              
              {errorMessage && <p className="text-red-400 mt-4">{errorMessage}</p>}
            </div>
            
            <div className="bg-blue-800 rounded-lg p-6 shadow-lg md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Pool Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>Total Staked: {parseFloat(totalStaked).toFixed(4)} {tokenSymbol}</p>
                  <p>Token Address: {CUSD_TOKEN_ADDRESS.substring(0, 6)}...{CUSD_TOKEN_ADDRESS.substring(CUSD_TOKEN_ADDRESS.length - 4)}</p>
                  <p>Contract Address: {STAKING_CONTRACT_ADDRESS.substring(0, 6)}...{STAKING_CONTRACT_ADDRESS.substring(STAKING_CONTRACT_ADDRESS.length - 4)}</p>
                </div>
                <div>
                  <p>Lock Period: 1 day</p>
                  <p>Reward Rate: 0.001 tokens per second</p>
                  <p>Network: Celo Mainnet</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}