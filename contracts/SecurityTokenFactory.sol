// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title SecurityToken
 * @dev ERC3643-compliant token with compliance features including KYC verification
 */
contract SecurityToken is ERC20, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Token metadata
    string public tokenSymbol;
    string public documentURI;
    string public tokenName;
    string public industry;
    string public assetType;
    uint256 public tokenValue;
    uint256 public offeringSize;
    string public dividendFrequency;
    string public maturityDate;
    
    // KYC registry to verify investor addresses
    mapping(address => bool) public kycVerified;
    
    // Compliance settings
    bool public transfersEnabled = true;
    EnumerableSet.AddressSet private investors;
    
    // Events
    event KYCStatusChanged(address indexed investor, bool status);
    event MetadataUpdated(string name, string symbol, string documentURI);
    event TransfersEnabledChanged(bool status);
    
    /**
     * @dev Constructor initializes the token with metadata, owner, and initial supply
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        string memory _documentURI,
        string memory _industry,
        string memory _assetType,
        uint256 _tokenValue,
        uint256 _offeringSize,
        string memory _dividendFrequency,
        string memory _maturityDate,
        address _owner
    ) ERC20(_name, _symbol) {
        tokenName = _name;
        tokenSymbol = _symbol;
        documentURI = _documentURI;
        industry = _industry;
        assetType = _assetType;
        tokenValue = _tokenValue;
        offeringSize = _offeringSize;
        dividendFrequency = _dividendFrequency;
        maturityDate = _maturityDate;
        
        // Auto-verify the owner for KYC
        kycVerified[_owner] = true;
        investors.add(_owner);
        emit KYCStatusChanged(_owner, true);
        
        // Mint initial supply to the owner
        _mint(_owner, _initialSupply);
        
        // Transfer ownership
        transferOwnership(_owner);
    }
    
    /**
     * @dev Set KYC verification status for an investor
     * @param investor Address of the investor
     * @param status KYC verification status
     */
    function setKYCStatus(address investor, bool status) public onlyOwner {
        kycVerified[investor] = status;
        
        if (status) {
            investors.add(investor);
        } else {
            investors.remove(investor);
        }
        
        emit KYCStatusChanged(investor, status);
    }
    
    /**
     * @dev Batch set KYC verification status for multiple investors
     * @param _investors Array of investor addresses
     * @param _status Array of KYC verification statuses
     */
    function batchSetKYCStatus(address[] calldata _investors, bool[] calldata _status) external onlyOwner {
        require(_investors.length == _status.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _investors.length; i++) {
            setKYCStatus(_investors[i], _status[i]);
        }
    }
    
    /**
     * @dev Update token metadata
     * @param _name New token name
     * @param _symbol New token symbol
     * @param _documentURI New document URI
     */
    function updateMetadata(
        string memory _name,
        string memory _symbol,
        string memory _documentURI
    ) external onlyOwner {
        tokenName = _name;
        tokenSymbol = _symbol;
        documentURI = _documentURI;
        
        emit MetadataUpdated(_name, _symbol, _documentURI);
    }
    
    /**
     * @dev Enable or disable token transfers
     * @param _enabled Transfer enablement status
     */
    function setTransfersEnabled(bool _enabled) external onlyOwner {
        transfersEnabled = _enabled;
        emit TransfersEnabledChanged(_enabled);
    }
    
    /**
     * @dev Get the count of KYC verified investors
     * @return Count of verified investors
     */
    function getInvestorCount() external view returns (uint256) {
        return investors.length();
    }
    
    /**
     * @dev Get investor address by index
     * @param index Index of the investor
     * @return Investor address
     */
    function getInvestorAt(uint256 index) external view returns (address) {
        require(index < investors.length(), "Index out of bounds");
        return investors.at(index);
    }
    
    /**
     * @dev Get array of all investors
     * @return Array of investor addresses
     */
    function getAllInvestors() external view returns (address[] memory) {
        uint256 count = investors.length();
        address[] memory result = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = investors.at(i);
        }
        
        return result;
    }
    
    /**
     * @dev Override to enforce KYC verification and transfer enablement
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Skip checks for minting operations
        if (from != address(0)) {
            require(transfersEnabled, "Transfers are currently disabled");
            require(kycVerified[from], "Sender is not KYC verified");
        }
        
        if (to != address(0)) {
            require(kycVerified[to], "Recipient is not KYC verified");
        }
        
        super._beforeTokenTransfer(from, to, amount);
    }
}

/**
 * @title SecurityTokenFactory
 * @dev Factory contract for creating new SecurityTokens
 */
contract SecurityTokenFactory is Ownable {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;
    
    Counters.Counter private _tokenIdCounter;
    EnumerableSet.AddressSet private _tokenAddresses;
    
    // Mapping from token ID to token address
    mapping(uint256 => address) public tokenById;
    // Mapping from token address to token data
    mapping(address => TokenData) public tokenData;
    
    struct TokenData {
        uint256 id;
        string name;
        string symbol;
        uint256 totalSupply;
        string documentURI;
        string industry;
        string assetType;
        uint256 tokenValue;
        uint256 offeringSize;
        string dividendFrequency;
        string maturityDate;
        address creator;
        uint256 createdAt;
    }
    
    // Events
    event TokenCreated(
        uint256 indexed id,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply,
        address indexed creator
    );
    
    /**
     * @dev Create a new security token
     * @return The address of the newly created token
     */
    function createSecurityToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        string memory documentURI,
        string memory industry,
        string memory assetType,
        uint256 tokenValue,
        uint256 offeringSize,
        string memory dividendFrequency,
        string memory maturityDate
    ) external returns (address) {
        // Create a new security token
        SecurityToken newToken = new SecurityToken(
            name,
            symbol,
            totalSupply,
            documentURI,
            industry,
            assetType,
            tokenValue,
            offeringSize,
            dividendFrequency,
            maturityDate,
            msg.sender
        );
        
        address tokenAddress = address(newToken);
        
        // Increment token counter
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        // Store token data
        tokenById[tokenId] = tokenAddress;
        tokenData[tokenAddress] = TokenData({
            id: tokenId,
            name: name,
            symbol: symbol,
            totalSupply: totalSupply,
            documentURI: documentURI,
            industry: industry,
            assetType: assetType,
            tokenValue: tokenValue,
            offeringSize: offeringSize,
            dividendFrequency: dividendFrequency,
            maturityDate: maturityDate,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        _tokenAddresses.add(tokenAddress);
        
        emit TokenCreated(tokenId, tokenAddress, name, symbol, totalSupply, msg.sender);
        
        return tokenAddress;
    }
    
    /**
     * @dev Get token by ID
     * @param tokenId ID of the token
     * @return Token address
     */
    function getTokenById(uint256 tokenId) external view returns (address) {
        require(tokenId > 0 && tokenId <= _tokenIdCounter.current(), "Token ID does not exist");
        return tokenById[tokenId];
    }
    
    /**
     * @dev Get token count
     * @return Count of created tokens
     */
    function getTokenCount() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev Get token data
     * @param tokenAddress Address of the token
     * @return Token data
     */
    function getTokenData(address tokenAddress) external view returns (TokenData memory) {
        require(_tokenAddresses.contains(tokenAddress), "Token does not exist");
        return tokenData[tokenAddress];
    }
    
    /**
     * @dev Get all token addresses
     * @return Array of token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        uint256 count = _tokenAddresses.length();
        address[] memory result = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = _tokenAddresses.at(i);
        }
        
        return result;
    }
    
    /**
     * @dev Get token at index
     * @param index Index of the token
     * @return Token address
     */
    function getTokenAt(uint256 index) external view returns (address) {
        require(index < _tokenAddresses.length(), "Index out of bounds");
        return _tokenAddresses.at(index);
    }
} 