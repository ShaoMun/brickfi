// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PropertyAttestationVerifier
 * @dev Smart contract to verify and attest real-world assets (RWA) ownership
 */
contract PropertyAttestationVerifier {
    // State variables
    address public owner;
    
    // Changed from single property to array of properties per owner
    mapping(address => Property[]) public ownerProperties;
    mapping(address => uint256) public ownerPropertyCount;
    mapping(bytes32 => bool) public verifiedPropertyHashes;
    
    // Property struct to store essential information
    struct Property {
        bytes32 dataHash;         // Hash of all property data for verification
        string deedNumber;        // Legal deed number
        string propertyName;      // Name of the property
        string propertyAddress;   // Physical address of the property
        string ownerName;         // Legal owner name
        string taxId;             // Property tax ID
        uint256 timestamp;        // When attestation was completed
        bool verified;            // Whether attestation was verified
        string[] photoHashes;     // IPFS hashes of property photos
    }
    
    // Events
    event PropertyAttested(address indexed owner, bytes32 dataHash, string deedNumber, uint256 timestamp, uint256 propertyIndex);
    event PropertyVerified(address indexed owner, bytes32 dataHash, uint256 timestamp, uint256 propertyIndex);
    event VerificationFailed(address indexed owner, bytes32 dataHash, string reason, uint256 propertyIndex);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this function");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Submit property attestation with encrypted data
     * @param dataHash Hash of the complete property data (for verification)
     * @param deedNumber Legal deed or title number
     * @param propertyName Name of the property
     * @param propertyAddress Physical address of the property
     * @param ownerName Legal owner's name
     * @param taxId Property tax ID
     * @param photoHashes Array of IPFS hashes for property photos
     * @return success Whether the attestation was successful
     * @return propertyIndex The index of the newly attested property
     */
    function attestProperty(
        bytes32 dataHash,
        string memory deedNumber,
        string memory propertyName,
        string memory propertyAddress,
        string memory ownerName,
        string memory taxId,
        string[] memory photoHashes
    ) public returns (bool success, uint256 propertyIndex) {
        // Basic validation
        require(bytes(deedNumber).length > 0, "Deed number cannot be empty");
        require(bytes(propertyName).length > 0, "Property name cannot be empty");
        require(bytes(propertyAddress).length > 0, "Property address cannot be empty");
        require(bytes(ownerName).length > 0, "Owner name cannot be empty");
        require(photoHashes.length > 0, "At least one property photo required");
        
        // Check if the property with this data hash already exists
        for (uint256 i = 0; i < ownerPropertyCount[msg.sender]; i++) {
            if (ownerProperties[msg.sender][i].dataHash == dataHash) {
                revert("Property with this data hash already attested");
            }
        }
        
        // Create property struct
        Property memory newProperty = Property({
            dataHash: dataHash,
            deedNumber: deedNumber,
            propertyName: propertyName,
            propertyAddress: propertyAddress,
            ownerName: ownerName,
            taxId: taxId,
            timestamp: block.timestamp,
            verified: false,
            photoHashes: photoHashes
        });
        
        // Add property to owner's properties
        ownerProperties[msg.sender].push(newProperty);
        propertyIndex = ownerPropertyCount[msg.sender];
        ownerPropertyCount[msg.sender]++;
        
        // Emit event
        emit PropertyAttested(msg.sender, dataHash, deedNumber, block.timestamp, propertyIndex);
        
        return (true, propertyIndex);
    }
    
    /**
     * @dev Verify property attestation by checking if the data hash matches
     * @param propertyOwner Address of the property owner
     * @param propertyIndex Index of the property to verify
     * @param verificationDataHash Hash of the verification data (should match original data hash)
     * @return verified Whether the property was verified
     */
    function verifyAttestation(
        address propertyOwner,
        uint256 propertyIndex,
        bytes32 verificationDataHash
    ) public onlyOwner returns (bool verified) {
        // Check if propertyIndex is valid
        require(propertyIndex < ownerPropertyCount[propertyOwner], "Invalid property index");
        
        Property storage property = ownerProperties[propertyOwner][propertyIndex];
        
        // Check if already verified
        if (property.verified) {
            return true;
        }
        
        // Verify data hash matches
        if (property.dataHash == verificationDataHash) {
            property.verified = true;
            verifiedPropertyHashes[verificationDataHash] = true;
            emit PropertyVerified(propertyOwner, verificationDataHash, block.timestamp, propertyIndex);
            return true;
        } else {
            emit VerificationFailed(propertyOwner, verificationDataHash, "Data hash mismatch", propertyIndex);
            return false;
        }
    }
    
    /**
     * @dev Get property data (decrypted) - only for property owner or contract owner
     * @param propertyOwner Address of the property owner
     * @param propertyIndex Index of the property to fetch
     * @return dataHash Hash of property data
     * @return deedNumber Legal deed number
     * @return propertyName Name of the property
     * @return propertyAddress Physical address of the property
     * @return ownerName Legal owner's name
     * @return taxId Property tax ID
     * @return timestamp Attestation timestamp
     * @return verified Verification status
     * @return photoHashes Array of photo hashes
     */
    function getPropertyData(
        address propertyOwner,
        uint256 propertyIndex
    ) public view returns (
        bytes32 dataHash,
        string memory deedNumber,
        string memory propertyName,
        string memory propertyAddress,
        string memory ownerName,
        string memory taxId,
        uint256 timestamp,
        bool verified,
        string[] memory photoHashes
    ) {
        // Only the property owner or contract owner can view the complete data
        require(
            msg.sender == propertyOwner || msg.sender == owner,
            "Only property owner or contract owner can access this data"
        );
        
        // Check if propertyIndex is valid
        require(propertyIndex < ownerPropertyCount[propertyOwner], "Invalid property index");
        
        Property memory property = ownerProperties[propertyOwner][propertyIndex];
        
        return (
            property.dataHash,
            property.deedNumber,
            property.propertyName,
            property.propertyAddress,
            property.ownerName,
            property.taxId,
            property.timestamp,
            property.verified,
            property.photoHashes
        );
    }
    
    /**
     * @dev Get all properties for an owner
     * @param propertyOwner Address of the property owner
     * @return count Number of properties owned
     */
    function getPropertyCount(address propertyOwner) public view returns (uint256 count) {
        return ownerPropertyCount[propertyOwner];
    }
    
    /**
     * @dev Check if a property attestation exists and is verified
     * @param propertyOwner Address of the property owner
     * @param propertyIndex Index of the property to check
     * @return exists Whether the property attestation exists
     * @return attestationVerified Whether the property attestation is verified
     */
    function checkAttestationStatus(
        address propertyOwner, 
        uint256 propertyIndex
    ) public view returns (bool exists, bool attestationVerified) {
        exists = propertyIndex < ownerPropertyCount[propertyOwner];
        
        if (exists) {
            attestationVerified = ownerProperties[propertyOwner][propertyIndex].verified;
        }
        
        return (exists, attestationVerified);
    }
    
    /**
     * @dev Get property attestation timestamp
     * @param propertyOwner Address of the property owner
     * @param propertyIndex Index of the property to check
     * @return timestamp Timestamp when attestation was completed (0 if not attested)
     */
    function getAttestationTimestamp(
        address propertyOwner,
        uint256 propertyIndex
    ) public view returns (uint256 timestamp) {
        if (propertyIndex < ownerPropertyCount[propertyOwner]) {
            return ownerProperties[propertyOwner][propertyIndex].timestamp;
        }
        
        return 0;
    }
    
    /**
     * @dev Check if a specific data hash has been verified
     * @param dataHash The hash to check
     * @return isVerified Whether the hash is verified
     */
    function isHashVerified(bytes32 dataHash) public view returns (bool isVerified) {
        return verifiedPropertyHashes[dataHash];
    }
    
    /**
     * @dev Transfer contract ownership
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
} 