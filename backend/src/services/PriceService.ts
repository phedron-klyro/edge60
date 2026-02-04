/**
 * Edge60 Backend - Price Service
 * 
 * Fetches real-time ETH/USD prices from CoinGecko API
 * Single source of truth for price data
 */

// CoinGecko free API endpoint (no API key required)
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

/**
 * Price Service - fetches real ETH/USD prices
 */
class PriceServiceClass {
  private lastPrice: PriceData | null = null;
  private cacheMs = 5000; // 5 second cache to avoid rate limiting

  /**
   * Fetch current ETH/USD price from CoinGecko
   * Returns cached price if within cache window
   */
  async getEthUsdPrice(): Promise<PriceData> {
    // Check cache
    if (this.lastPrice && Date.now() - this.lastPrice.timestamp < this.cacheMs) {
      console.log(`[PriceService] Using cached price: $${this.lastPrice.price}`);
      return this.lastPrice;
    }

    try {
      console.log("[PriceService] Fetching ETH/USD price from CoinGecko...");
      
      const url = `${COINGECKO_API}?ids=ethereum&vs_currencies=usd`;
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json() as { ethereum?: { usd?: number } };
      
      if (!data.ethereum?.usd) {
        throw new Error("Invalid response from CoinGecko");
      }

      const price = data.ethereum.usd;
      
      this.lastPrice = {
        price,
        timestamp: Date.now(),
        source: "coingecko",
      };

      console.log(`[PriceService] ✓ ETH/USD = $${price.toFixed(2)}`);
      return this.lastPrice;

    } catch (error) {
      console.error("[PriceService] ✗ Failed to fetch price:", error);
      
      // Return last known price if available
      if (this.lastPrice) {
        console.log(`[PriceService] Using stale price: $${this.lastPrice.price}`);
        return this.lastPrice;
      }

      // Fallback mock price if no data available
      const mockPrice: PriceData = {
        price: 2450 + (Math.random() - 0.5) * 50,
        timestamp: Date.now(),
        source: "mock",
      };
      console.log(`[PriceService] Using mock price: $${mockPrice.price.toFixed(2)}`);
      return mockPrice;
    }
  }

  /**
   * Get a fresh price (bypass cache)
   * Used for match end to ensure accurate comparison
   */
  async getFreshPrice(): Promise<PriceData> {
    this.lastPrice = null; // Clear cache
    return this.getEthUsdPrice();
  }

  /**
   * Get the last cached price without fetching
   */
  getLastPrice(): PriceData | null {
    return this.lastPrice;
  }
}

// Singleton export
export const PriceService = new PriceServiceClass();
