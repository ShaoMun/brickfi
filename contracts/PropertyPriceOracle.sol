// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

/**
 * @title PropertyPriceOracle
 * @dev Smart contract for real estate tokenization platform that stores property prices
 * and integrates with Chainlink oracles for off-chain data.
 */
contract PropertyPriceOracle is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    // Chainlink variables
    uint256 private fee;
    bytes32 private jobId;
    
    // Property price mapping: locationHash => price
    mapping(bytes32 => uint256) private propertyPrices;
    
    // Price update events
    event PriceUpdated(bytes32 indexed locationHash, string location, uint256 price);
    event ChainlinkRequested(bytes32 indexed requestId);
    event ChainlinkFulfilled(bytes32 indexed requestId, uint256 price);
    
    /**
     * @dev Constructor initializes Chainlink settings for Polygon Amoy testnet
     */
    constructor() ConfirmedOwner(msg.sender) {
        // For Polygon Amoy Testnet
        setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB); // LINK token on Polygon Amoy
        setChainlinkOracle(0x40193c8518BB267228Fc409a613bDbD8eC5a97b3); // Oracle address
        
        jobId = "ca98366cc7314957b8c012c72f05aeeb"; // Example jobId for HTTP GET
        fee = 0.01 * 10 ** 18; // 0.01 LINK
    }
    
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
     * @dev Requests property price data from Chainlink oracle
     * @param location String representing the property location
     */
    function requestPropertyPriceData(string memory location) external onlyOwner returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillPropertyPrice.selector
        );
        
        // Set the URL to perform the GET request on
        // In production, this would be your backend API that scrapes Zillow data
        req.add("get", string(abi.encodePacked("https://api.yourbackend.com/property-price?location=", location)));
        
        // Set the path to find the desired data in the API response
        req.add("path", "price");
        
        // Multiply by 100 to handle 2 decimals
        req.addInt("times", 100);
        
        // Send the request
        bytes32 _requestId = sendChainlinkRequest(req, fee);
        emit ChainlinkRequested(_requestId);
        return _requestId;
    }
    
    /**
     * @dev Callback function used by Chainlink oracle to return the price
     * @param _requestId The requestId returned by requestPropertyPriceData
     * @param _price The property price retrieved from the API
     */
    function fulfillPropertyPrice(bytes32 _requestId, uint256 _price) external recordChainlinkFulfillment(_requestId) {
        emit ChainlinkFulfilled(_requestId, _price);
        // In production, you would store this price with location data
        // This is a simplified version for the POC
    }
    
    /**
     * @dev Allows the owner to withdraw LINK tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }
    
    /**
     * @dev Allows the owner to cancel a Chainlink request
     * @param _requestId The requestId to cancel
     */
    function cancelRequest(bytes32 _requestId, uint256 _payment, bytes4 _callbackFunc, uint256 _expiration) 
        public
        onlyOwner
    {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunc, _expiration);
    }
}