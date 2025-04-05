// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title VerificationSBT
 * @dev Implementation of a Soulbound Token (SBT) for KYC verification
 * Based on the ERC-5192 specification for non-transferable tokens
 */
contract VerificationSBT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    // Token ID counter
    Counters.Counter private _tokenIdCounter;
    
    // Interface for ERC-5192
    bytes4 private constant INTERFACE_ID_ERC5192 = 0xb45a3c0e;
    
    // KYC Verifier contract address
    address public kycVerifierAddress;
    
    // Mapping from wallet address to token ID
    mapping(address => uint256) private _walletToToken;
    
    // Mapping from token ID to KYC hash
    mapping(uint256 => bytes32) private _tokenToKYCHash;
    
    // Events
    event Locked(uint256 tokenId);
    event VerificationTokenMinted(address indexed to, uint256 tokenId, bytes32 kycHash);
    
    /**
     * @dev Constructor sets the token name, symbol, and initial KYC verifier
     * @param _kycVerifierAddress Address of the KYC verifier contract
     */
    constructor(address _kycVerifierAddress) ERC721("KYC Verification Token", "KYC-V") {
        kycVerifierAddress = _kycVerifierAddress;
    }
    
    /**
     * @dev Mint a new verification token for a wallet that has passed KYC
     * @param to Address to mint the token to
     * @param kycHash Hash of the KYC data
     * @param tokenURI URI for the token metadata
     */
    function mintVerificationToken(
        address to, 
        bytes32 kycHash,
        string memory tokenURI
    ) external returns (uint256) {
        // Only the KYC verifier contract or the owner can mint tokens
        require(
            msg.sender == kycVerifierAddress || msg.sender == owner(),
            "Only KYC verifier or owner can mint"
        );
        
        // Check if user already has a token
        require(_walletToToken[to] == 0, "Address already has a verification token");
        
        // Increment token ID
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        // Mint token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Store token to wallet mapping and KYC hash
        _walletToToken[to] = tokenId;
        _tokenToKYCHash[tokenId] = kycHash;
        
        // Emit events
        emit Locked(tokenId);
        emit VerificationTokenMinted(to, tokenId, kycHash);
        
        return tokenId;
    }
    
    /**
     * @dev Checks if a wallet has a verification token
     * @param wallet Address to check
     * @return bool True if the wallet has a verification token
     */
    function hasVerificationToken(address wallet) external view returns (bool) {
        return _walletToToken[wallet] > 0;
    }
    
    /**
     * @dev Gets the token ID for a wallet
     * @param wallet Address to check
     * @return uint256 Token ID (0 if none exists)
     */
    function getTokenId(address wallet) external view returns (uint256) {
        return _walletToToken[wallet];
    }
    
    /**
     * @dev Gets the KYC hash for a token
     * @param tokenId Token ID to check
     * @return bytes32 KYC hash
     */
    function getKYCHash(uint256 tokenId) external view returns (bytes32) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenToKYCHash[tokenId];
    }
    
    /**
     * @dev Update the KYC verifier address
     * @param _kycVerifierAddress New KYC verifier address
     */
    function setKYCVerifierAddress(address _kycVerifierAddress) external onlyOwner {
        kycVerifierAddress = _kycVerifierAddress;
    }
    
    /**
     * @dev Implements ERC-5192 interface to indicate token is soulbound
     * @param tokenId Token ID to check
     * @return bool Always returns true as all tokens are locked
     */
    function locked(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return true; // All tokens are locked (soulbound)
    }
    
    /**
     * @dev Check if contract supports an interface
     * @param interfaceId Interface identifier
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return
            interfaceId == INTERFACE_ID_ERC5192 ||
            super.supportsInterface(interfaceId);
    }
    
    // The following functions are overrides required by Solidity
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function _burn(uint256 tokenId) 
        internal 
        override(ERC721, ERC721URIStorage) 
    {
        super._burn(tokenId);
    }
    
    /**
     * @dev Overrides transferFrom to prevent transfers (implements soulbound property)
     */
    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        override 
    {
        revert("SBT: Token cannot be transferred");
    }
    
    /**
     * @dev Overrides safeTransferFrom to prevent transfers (implements soulbound property)
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) 
        public 
        override 
    {
        revert("SBT: Token cannot be transferred");
    }
    
    /**
     * @dev Overrides safeTransferFrom with data to prevent transfers (implements soulbound property)
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) 
        public 
        override 
    {
        revert("SBT: Token cannot be transferred");
    }
} 