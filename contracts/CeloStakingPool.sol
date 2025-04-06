// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CeloStakingPool is ReentrancyGuard, Ownable {
    // The token being staked (CELO or another Celo token like cUSD)
    IERC20 public stakingToken;
    
    // Reward rate per second
    uint256 public rewardRate = 1e15; // 0.001 tokens per second
    
    // Last time the reward was updated
    uint256 public lastUpdateTime;
    
    // Reward per token stored
    uint256 public rewardPerTokenStored;
    
    // User reward per token paid
    mapping(address => uint256) public userRewardPerTokenPaid;
    
    // User rewards
    mapping(address => uint256) public rewards;
    
    // Total supply of staked tokens
    uint256 private _totalSupply;
    
    // Balances of staked tokens by user
    mapping(address => uint256) private _balances;
    
    // Minimum staking period in seconds
    uint256 public lockPeriod = 86400; // 1 day 
    
    // Mapping for user staking timestamp
    mapping(address => uint256) public stakingTime;
    
    // Constants for emergencies
    bool public paused = false;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    
    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
        lastUpdateTime = block.timestamp;
    }
    
    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // Update reward for a specific account
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
    
    // Calculate the current reward per token
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + (
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / _totalSupply
        );
    }
    
    // Calculate earned rewards for an account
    function earned(address account) public view returns (uint256) {
        return (
            (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18
        ) + rewards[account];
    }
    
    // Stake tokens
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) notPaused {
        require(amount > 0, "Cannot stake 0");
        
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        stakingTime[msg.sender] = block.timestamp;
        
        // Transfer tokens from user to contract
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit Staked(msg.sender, amount);
    }
    
    // Withdraw staked tokens
    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(_balances[msg.sender] >= amount, "Not enough staked tokens");
        
        // Allow withdraw ignoring lock period if paused
        if (!paused) {
            require(block.timestamp >= stakingTime[msg.sender] + lockPeriod, "Still in lock period");
        }
        
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        
        // Transfer tokens from contract to user
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // Claim rewards
    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            require(stakingToken.transfer(msg.sender, reward), "Transfer failed");
            emit RewardPaid(msg.sender, reward);
        }
    }
    
    // Get staked balance for an account
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    // Get total staked tokens
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
    
    // Update reward rate (only owner)
    function setRewardRate(uint256 _rewardRate) external onlyOwner updateReward(address(0)) {
        rewardRate = _rewardRate;
    }
    
    // Update lock period (only owner)
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        lockPeriod = _lockPeriod;
    }
    
    // Fund the contract with rewards
    function fundRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Cannot fund 0");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
    
    // Emergency pause (only owner)
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }
    
    // Resume from pause (only owner)
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    // Emergency withdraw all tokens (only owner)
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = stakingToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(stakingToken.transfer(owner(), balance), "Transfer failed");
    }
} 