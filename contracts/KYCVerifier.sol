// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

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
    
    // KYC verification event
    event KYCVerified(address indexed user, bool approved, uint256 timestamp);
    
    // Verifier management events
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
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
    }
    
    /**
     * @dev Allow a verifier to directly set KYC status for a user
     * This is useful for special cases or manual verification
     * @param user Address of the user to set KYC status for
     * @param approved Whether the user is approved
     */
    function setKYCStatus(address user, bool approved) external nonReentrant {
        // Only trusted verifiers can call this function
        if (!trustedVerifiers[msg.sender]) {
            revert VerifierNotTrusted();
        }
        
        // Update KYC status
        kycApproved[user] = approved;
        verificationTimestamp[user] = block.timestamp;
        
        // Emit event
        emit KYCVerified(user, approved, block.timestamp);
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