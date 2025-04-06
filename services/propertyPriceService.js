import { ethers, Contract, formatEther, parseEther } from 'ethers';
import PropertyPriceOracleABI from '../contracts/abis/PropertyPriceOracle.json';

const PROPERTY_PRICE_ORACLE_ADDRESS = "0x5E93dDD7250a1d954618fab590831445Bae69458";

class PropertyPriceService {
  constructor(provider) {
    this.provider = provider;
    this.contract = null;
    this.initialize();
  }

  initialize() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.contract = new ethers.Contract(
        PROPERTY_PRICE_ORACLE_ADDRESS,
        PropertyPriceOracleABI,
        this.provider
      );
    }
  }

  async connectWallet() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  }

  async getPropertyPrice(location) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      const price = await this.contract.getPropertyPrice(location);
      return formatEther(price);
    } catch (error) {
      console.error('Error getting property price:', error);
      throw error;
    }
  }

  async setPropertyPrice(location, price, signer) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const connectedContract = this.contract.connect(signer);
      const priceInWei = parseEther(price.toString());
      
      const tx = await connectedContract.setPropertyPrice(location, priceInWei);
      return await tx.wait();
    } catch (error) {
      console.error('Error setting property price:', error);
      throw error;
    }
  }

  async setBatchPropertyPrices(locations, prices, signer) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const connectedContract = this.contract.connect(signer);
      const pricesInWei = prices.map(price => parseEther(price.toString()));
      
      const tx = await connectedContract.setBatchPropertyPrices(locations, pricesInWei);
      return await tx.wait();
    } catch (error) {
      console.error('Error setting batch property prices:', error);
      throw error;
    }
  }
}

export default PropertyPriceService; 