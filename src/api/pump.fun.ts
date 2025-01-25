class PumpFunConnection {
  private apiKey: string;
  private secretKey: string;
  private apiClient: AxiosInstance;
  private wsClient?: WebSocket;
  private readonly baseUrl: string = 'https://api.pump.fun'; // Replace with actual base URL
  private readonly wsUrl: string = 'wss://ws.pump.fun'; // Replace with actual WebSocket URL

  constructor() {
    this.apiKey = process.env.API_KEY || '';
    this.secretKey = process.env.SECRET_KEY || '';

    if (!this.apiKey || !this.secretKey) {
      throw new Error('API Key and Secret Key are required');
    }

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get account details
   */
  async getAccountDetails(): Promise<any> {
    try {
      const response = await this.apiClient.get('/account');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching account details:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Place a trade order
   * @param symbol - Trading pair (e.g., BTC/USD)
   * @param side - Buy or Sell
   * @param quantity - Amount to trade
   * @param price - Price to trade at (optional for market orders)
   */
  async placeOrder(symbol: string, side: 'buy' | 'sell', quantity: number, price?: number): Promise<any> {
    try {
      const orderData = {
        symbol,
        side,
        quantity,
        ...(price ? { price } : { type: 'market' }),
      };
      const response = await this.apiClient.post('/orders', orderData);
      return response.data;
    } catch (error: any) {
      console.error('Error placing order:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Establish WebSocket connection for live updates
   */
  connectToWebSocket(): void {
    this.wsClient = new WebSocket(this.wsUrl);

    this.wsClient.on('open', () => {
      console.log('WebSocket connection established');
      this.wsClient?.send(
        JSON.stringify({
          type: 'subscribe',
          apiKey: this.apiKey,
        })
      );
    });

    this.wsClient.on('message', (data) => {
      console.log('WebSocket message received:', data.toString());
    });

    this.wsClient.on('close', () => {
      console.log('WebSocket connection closed');
    });

    this.wsClient.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.close();
      console.log('WebSocket connection closed manually');
    }
  }
}
