// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./VerificationSBT.sol";

/**
 * @title KYCVerifier
 * @dev Smart contract for verifying KYC data and setting user eligibility
 * Uses cryptographic methods to keep sensitive user data off-chain
 */
contract KYCVerifier is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Secure mapping to store KYC verification status
    mapping(address => bool) private kycApproved;
    
    // Mapping to store verification timestamps
    mapping(address => uint256) private verificationTimestamp;
    
    // Trusted verifiers who can sign KYC data
    mapping(address => bool) private trustedVerifiers;
    
    // SBT contract for verification tokens
    VerificationSBT public verificationSBT;
    bool public sbtMintingEnabled = false;
    
    // KYC verification event
    event KYCVerified(address indexed user, bool approved, uint256 timestamp);
    event SBTMinted(address indexed user, uint256 tokenId);
    
    // Verifier management events
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event SBTContractUpdated(address indexed sbtContract);
    
    // Execution errors
    error InvalidSignature();
    error VerifierNotTrusted();
    error InvalidAge();
    error InvalidDataFormat();

    /**
     * @dev Constructor sets the contract owner as initial trusted verifier
     */
    constructor() {
        trustedVerifiers[msg.sender] = true;
        emit VerifierAdded(msg.sender);
    }
    
    /**
     * @dev Set the SBT contract address
     * @param sbtAddress Address of the VerificationSBT contract
     */
    function setSBTContract(address sbtAddress) external onlyOwner {
        verificationSBT = VerificationSBT(sbtAddress);
        emit SBTContractUpdated(sbtAddress);
    }
    
    /**
     * @dev Enable or disable SBT minting
     * @param enabled Whether SBT minting should be enabled
     */
    function setSBTMintingEnabled(bool enabled) external onlyOwner {
        sbtMintingEnabled = enabled;
    }
    
    /**
     * @dev Add a trusted verifier who can sign KYC data
     * @param verifier Address of the verifier to add
     */
    function addTrustedVerifier(address verifier) external onlyOwner {
        trustedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }
    
    /**
     * @dev Remove a trusted verifier
     * @param verifier Address of the verifier to remove
     */
    function removeTrustedVerifier(address verifier) external onlyOwner {
        trustedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    /**
     * @dev Check if an address is a trusted verifier
     * @param verifier Address to check
     * @return bool True if the address is a trusted verifier
     */
    function isTrustedVerifier(address verifier) public view returns (bool) {
        return trustedVerifiers[verifier];
    }
    
    /**
     * @dev Verify the KYC status based on provided data and signature
     * The actual user data remains off-chain, only the hash is used for verification
     * @param dataHash Hash of the KYC data (including age, citizenship)
     * @param age User's age (extracted for on-chain verification)
     * @param isUSCitizen Boolean indicating US citizenship status
     * @param signature Cryptographic signature from a trusted verifier
     * @param verifier Address of the verifier who signed the data
     */
    function verifyKYC(
        bytes32 dataHash,
        uint8 age,
        bool isUSCitizen,
        bytes memory signature,
        address verifier
    ) external nonReentrant {
        // Ensure the verifier is trusted
        if (!trustedVerifiers[verifier]) {
            revert VerifierNotTrusted();
        }
        
        // Verify the signature is valid
        bytes32 messageHash = keccak256(abi.encodePacked(dataHash, age, isUSCitizen, msg.sender));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        if (ethSignedMessageHash.recover(signature) != verifier) {
            revert InvalidSignature();
        }
        
        // On-chain verification of age >= 18
        if (age < 18) {
            revert InvalidAge();
        }
        
        // Set KYC status based on both age and citizenship
        bool approved = (age >= 18 && isUSCitizen);
        
        // Update KYC status
        kycApproved[msg.sender] = approved;
        verificationTimestamp[msg.sender] = block.timestamp;
        
        // Emit event
        emit KYCVerified(msg.sender, approved, block.timestamp);
        
        // If approved and SBT minting is enabled, mint verification token
        if (approved && sbtMintingEnabled && address(verificationSBT) != address(0)) {
            _mintVerificationSBT(msg.sender, dataHash);
        }
    }
    
    /**
     * @dev Allow a verifier to directly set KYC status for a user
     * This is useful for special cases or manual verification
     * @param user Address of the user to set KYC status for
     * @param approved Whether the user is approved
     * @param dataHash Optional hash of the KYC data for SBT minting
     */
    function setKYCStatus(address user, bool approved, bytes32 dataHash) external nonReentrant {
        // Only trusted verifiers can call this function
        if (!trustedVerifiers[msg.sender]) {
            revert VerifierNotTrusted();
        }
        
        // Update KYC status
        kycApproved[user] = approved;
        verificationTimestamp[user] = block.timestamp;
        
        // Emit event
        emit KYCVerified(user, approved, block.timestamp);
        
        // If approved and SBT minting is enabled, mint verification token
        if (approved && sbtMintingEnabled && address(verificationSBT) != address(0)) {
            _mintVerificationSBT(user, dataHash);
        }
    }
    
    /**
     * @dev Internal function to mint verification SBT
     * @param user Address of the user to mint for
     * @param dataHash Hash of the KYC data
     */
    function _mintVerificationSBT(address user, bytes32 dataHash) internal {
        // Generate token metadata URI (JSON string with verification info)
        string memory tokenURI = _generateTokenURI(user, dataHash);
        
        // Check if user already has a token
        if (!verificationSBT.hasVerificationToken(user)) {
            // Mint the token
            uint256 tokenId = verificationSBT.mintVerificationToken(user, dataHash, tokenURI);
            emit SBTMinted(user, tokenId);
        }
    }
    
    /**
     * @dev Internal function to generate token URI
     * @param user Address of the user
     * @param dataHash Hash of the KYC data
     * @return string JSON metadata as a string
     */
    function _generateTokenURI(address user, bytes32 dataHash) internal view returns (string memory) {
        // Convert verification timestamp to string
        string memory timestampStr = _uintToString(verificationTimestamp[user]);
        
        // Convert data hash to hex string (without 0x prefix)
        string memory dataHashStr = _bytes32ToHexString(dataHash);
        
        // Return formatted JSON string
        return string(
            abi.encodePacked(
                '{"name":"KYC Verification Token","description":"This token certifies that the holder has completed KYC verification.",',
                '"attributes":[',
                '{"trait_type":"Status","value":"Verified"},',
                '{"trait_type":"Verification Timestamp","value":"', timestampStr, '"},',
                '{"trait_type":"KYC Hash","value":"', dataHashStr, '"}',
                ']}'
            )
        );
    }
    
    /**
     * @dev Convert uint to string
     * @param value Uint value to convert
     * @return string String representation
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
    
    /**
     * @dev Convert bytes32 to hex string
     * @param data Bytes32 data to convert
     * @return string Hex string representation (without 0x prefix)
     */
    function _bytes32ToHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(64); // 32 bytes * 2 hex chars
        
        for (uint8 i = 0; i < 32; i++) {
            result[i*2] = hexChars[uint8(data[i] >> 4)];
            result[i*2+1] = hexChars[uint8(data[i] & 0x0f)];
        }
        
        return string(result);
    }
    
    /**
     * @dev Check if a user has passed KYC verification
     * @param user Address of the user to check
     * @return bool True if the user has passed KYC
     */
    function hasPassedKYC(address user) external view returns (bool) {
        return kycApproved[user];
    }
    
    /**
     * @dev Get the timestamp of when a user last completed verification
     * @param user Address of the user to check
     * @return uint256 Timestamp of verification (0 if never verified)
     */
    function getVerificationTimestamp(address user) external view returns (uint256) {
        return verificationTimestamp[user];
    }
    
    /**
     * @dev Batch check of KYC status for multiple users
     * @param users Array of user addresses to check
     * @return results Array of boolean results indicating KYC status
     */
    function batchCheckKYC(address[] calldata users) external view returns (bool[] memory results) {
        results = new bool[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            results[i] = kycApproved[users[i]];
        }
        
        return results;
    }
} 