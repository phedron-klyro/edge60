/**
 * Edge60 Backend - Price Service
 *
 * Fetches real-time prices (ETH, BTC, SOL) from CoinGecko API
 */

// CoinGecko free API endpoint
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

const ASSET_ID_MAP: Record<string, string> = {
  "ETH/USD": "ethereum",
  "BTC/USD": "bitcoin",
  "SOL/USD": "solana",
};

/**
 * Price Service - fetches real asset prices
 */
class PriceServiceClass {
  // Cache per asset: asset -> PriceData
  private cache: Map<string, PriceData> = new Map();
  private cacheMs = 5000; // 5 second cache

  /**
   * Fetch current price for an asset
   */
  async getPrice(asset: string): Promise<PriceData> {
    const assetId = ASSET_ID_MAP[asset];
    if (!assetId) {
      console.error(
        `[PriceService] Unknown asset: ${asset}, defaulting to ETH`,
      );
      return this.getEthUsdPrice();
    }

    // Check cache
    const cached = this.cache.get(asset);
    if (cached && Date.now() - cached.timestamp < this.cacheMs) {
      console.log(`[PriceService] Using cached ${asset}: $${cached.price}`);
      return cached;
    }

    return this.fetchFromApi(asset, assetId);
  }

  /**
   * Legacy method support
   */
  async getEthUsdPrice(): Promise<PriceData> {
    return this.getPrice("ETH/USD");
  }

  private async fetchFromApi(
    asset: string,
    assetId: string,
  ): Promise<PriceData> {
    try {
      console.log(`[PriceService] Fetching ${asset} price from CoinGecko...`);

      const url = `${COINGECKO_API}?ids=${assetId}&vs_currencies=usd`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok)
        throw new Error(`CoinGecko API error: ${response.status}`);

      const data = (await response.json()) as any;
      const price = data[assetId]?.usd;

      if (!price) throw new Error("Invalid response from CoinGecko");

      const priceData = {
        price,
        timestamp: Date.now(),
        source: "coingecko",
      };

      this.cache.set(asset, priceData);
      console.log(`[PriceService] ✓ ${asset} = $${price.toFixed(2)}`);

      return priceData;
    } catch (error) {
      console.error(`[PriceService] ✗ Failed to fetch ${asset}:`, error);

      // Fallback to cache if available even if stale
      const cached = this.cache.get(asset);
      if (cached) {
        console.log(`[PriceService] Using stale ${asset}: $${cached.price}`);
        return cached;
      }

      // Mock fallback
      const mockPrice = {
        price:
          (asset === "BTC/USD" ? 65000 : asset === "SOL/USD" ? 140 : 2500) +
          (Math.random() - 0.5) * 50,
        timestamp: Date.now(),
        source: "mock",
      };
      return mockPrice;
    }
  }

  /**
   * Get a fresh price (bypass cache)
   */
  async getFreshPrice(asset: string = "ETH/USD"): Promise<PriceData> {
    this.cache.delete(asset); // Clear cache
    return this.getPrice(asset);
  }

  /**
   * Get the last cached price without fetching
   */
  getLastPrice(asset: string = "ETH/USD"): PriceData | null {
    return this.cache.get(asset) || null;
  }
}

// Singleton export
export const PriceService = new PriceServiceClass();
