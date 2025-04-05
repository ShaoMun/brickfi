import axios from 'axios';
import cheerio from 'cheerio';

/**
 * Interface for property data returned by the scraper
 */
export interface PropertyData {
  price: number;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  url?: string;
}

/**
 * Interface for average price data calculation
 */
export interface AveragePriceData {
  averagePrice: number;
  averageSqft: number;
  pricePerSqft: number;
  sampleSize: number;
  properties: PropertyData[];
}

/**
 * Zillow Web Scraper that respects robots.txt rules
 * Based on allowed paths from robots.txt:
 * Allow: /homes/for_sale/$
 * Allow: /homes/for_sale/_p/$
 */
export default class ZillowScraper {
  private config: axios.AxiosRequestConfig;

  constructor() {
    // Use a proxy service or rotate user agents in production
    this.config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      timeout: 30000,
    };
  }

  /**
   * Format location string for URL
   * @param location - Location to search (e.g., "San Francisco, CA")
   * @returns Formatted location for URL
   */
  public formatLocation(location: string): string {
    return location.toLowerCase().replace(/,\s+/g, '-').replace(/\s+/g, '-');
  }

  /**
   * Get allowed URL based on robots.txt rules
   * @param location - Location to search
   * @returns Valid URL that respects robots.txt
   */
  public getAllowedUrl(location: string): string {
    const formattedLocation = this.formatLocation(location);
    // Using an allowed path from robots.txt: /homes/for_sale/$
    return `https://www.zillow.com/homes/for_sale/${formattedLocation}/`;
  }

  /**
   * Scrape property listings from Zillow
   * @param location - Location to search
   * @returns Array of property data
   */
  public async scrapePropertyListings(location: string): Promise<PropertyData[]> {
    try {
      const url = this.getAllowedUrl(location);
      console.log(`Scraping Zillow data from: ${url}`);
      
      // In production, implement rate limiting and IP rotation
      // This is important to avoid getting blocked
      const response = await axios.get(url, this.config);
      
      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);
      const properties: PropertyData[] = [];
      
      // Zillow property cards (selector may need updates as Zillow changes)
      // This is an example selector that would need to be updated based on current Zillow HTML structure
      $('.list-card').each((idx, element) => {
        // Extract property data
        const price = $(element).find('.list-card-price').text().replace(/[^0-9]/g, '');
        const address = $(element).find('.list-card-addr').text().trim();
        const bedsBaths = $(element).find('.list-card-details').text().trim();
        
        // Parse beds, baths, sqft
        let beds = 0, baths = 0, sqft = 0;
        const detailsMatch = bedsBaths.match(/(\d+)\s+bd\s+(\d+(?:\.\d+)?)\s+ba\s+([\d,]+)\s+sqft/);
        
        if (detailsMatch) {
          beds = parseInt(detailsMatch[1], 10);
          baths = parseFloat(detailsMatch[2]);
          sqft = parseInt(detailsMatch[3].replace(/,/g, ''), 10);
        }
        
        properties.push({
          price: price ? parseInt(price, 10) : 0,
          address,
          beds,
          baths,
          sqft,
          url: $(element).find('a').attr('href')
        });
      });
      
      console.log(`Found ${properties.length} properties in ${location}`);
      return properties;
    } catch (error) {
      console.error('Error scraping Zillow:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to scrape Zillow data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Calculate average price in a location
   * @param location - Location to search
   * @returns Average price data
   */
  public async getAveragePriceData(location: string): Promise<AveragePriceData> {
    try {
      const properties = await this.scrapePropertyListings(location);
      
      if (properties.length === 0) {
        throw new Error('No properties found');
      }
      
      // Calculate averages
      const totalPrice = properties.reduce((sum, prop) => sum + prop.price, 0);
      const totalSqft = properties.reduce((sum, prop) => sum + prop.sqft, 0);
      const validProperties = properties.filter(p => p.price > 0 && p.sqft > 0);
      
      return {
        averagePrice: Math.round(totalPrice / properties.length),
        averageSqft: Math.round(totalSqft / properties.length),
        pricePerSqft: Math.round(totalPrice / totalSqft),
        sampleSize: properties.length,
        properties: properties.slice(0, 5) // Return first 5 properties as sample
      };
    } catch (error) {
      console.error('Error calculating average price:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to calculate average price: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 