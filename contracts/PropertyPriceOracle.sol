// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PropertyPriceOracle
 * @dev Smart contract for real estate tokenization platform that stores property prices
 * Modified to remove Chainlink dependency for easier deployment
 */
contract PropertyPriceOracle is Ownable {
    // Property price mapping: locationHash => price
    mapping(bytes32 => uint256) private propertyPrices;
    
    // Price update events
    event PriceUpdated(bytes32 indexed locationHash, string location, uint256 price);
    
    /**
     * @dev Constructor initializes the contract with the deployer as owner
     */
    constructor() Ownable() {}
    
    /**
     * @dev Allows owner to set a property price directly on-chain
     * @param location String representing the property location
     * @param price The property price value
     */
    function setPropertyPrice(string memory location, uint256 price) external onlyOwner {
        bytes32 locationHash = keccak256(abi.encodePacked(location));
        propertyPrices[locationHash] = price;
        emit PriceUpdated(locationHash, location, price);
    }
    
    /**
     * @dev Retrieves a property price stored on-chain
     * @param location String representing the property location
     * @return price The property price value
     */
    function getPropertyPrice(string memory location) external view returns (uint256) {
        bytes32 locationHash = keccak256(abi.encodePacked(location));
        return propertyPrices[locationHash];
    }
    
    /**
     * @dev Set property prices in batch to save gas
     * @param locations Array of property locations
     * @param prices Array of property prices
     */
    function setBatchPropertyPrices(string[] memory locations, uint256[] memory prices) external onlyOwner {
        require(locations.length == prices.length, "Arrays must have same length");
        
        for (uint256 i = 0; i < locations.length; i++) {
            bytes32 locationHash = keccak256(abi.encodePacked(locations[i]));
            propertyPrices[locationHash] = prices[i];
            emit PriceUpdated(locationHash, locations[i], prices[i]);
        }
    }
}