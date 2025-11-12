import { OracleDataMarketplace } from '../src/marketplace.js';
import { CustomFeedRequest } from '../src/types.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const marketplace = new OracleDataMarketplace(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    process.env.SWITCHBOARD_QUEUE_KEY || 'A43DyUGA7s8eXPxqEjJY5CfCZaKdYxCmCKe5wGMuYiCe',
    process.env.PAYMENT_RECIPIENT!,
    process.env.X402_REGISTRY_URL || 'http://localhost:3001',
    'devnet'
  );

  await marketplace.initialize();

  const customBTCEURFeed: CustomFeedRequest = {
    name: 'BTC/EUR Multi-Exchange',
    description: 'Bitcoin to Euro price aggregated from Kraken, Bitstamp, and Coinbase',
    dataSources: [
      {
        name: 'KRAKEN',
        url: 'https://api.kraken.com/0/public/Ticker?pair=XBTEUR',
        jsonPath: '$.result.XXBTZEUR.c[0]',
      },
      {
        name: 'BITSTAMP',
        url: 'https://www.bitstamp.net/api/v2/ticker/btceur/',
        jsonPath: '$.last',
      },
      {
        name: 'COINBASE',
        url: 'https://api.coinbase.com/v2/exchange-rates?currency=EUR',
        jsonPath: '$.data.rates.BTC',
      },
    ],
    aggregation: 'median',
    transformations: [
      {
        type: 'divide',
        value: 1,
      },
    ],
    updateFrequency: 'high',
    pricePerUpdate: 0.0002,
  };

  console.log('Creating custom BTC/EUR feed...');
  const btcEurFeed = await marketplace.createCustomFeed(
    customBTCEURFeed,
    'custom-feed-owner'
  );

  console.log('\nCustom Feed Created:');
  console.log(`  Name: ${btcEurFeed.name}`);
  console.log(`  Feed ID: ${btcEurFeed.feedId}`);
  console.log(`  Feed Hash: ${btcEurFeed.feedHash}`);
  console.log(`  Price per Update: ${btcEurFeed.pricePerUpdate} ${btcEurFeed.currency}`);
  console.log(`  Update Frequency: ${btcEurFeed.updateFrequency}`);
  console.log(`  Data Sources: ${customBTCEURFeed.dataSources.length}`);

  console.log('\nTesting feed simulation...');
  const result = await marketplace.simulateFeed(btcEurFeed.feedId);

  console.log(`\nSimulation Result:`);
  console.log(`  BTC/EUR Price: €${result.value.toLocaleString()}`);
  console.log(`  Timestamp: ${new Date(result.timestamp).toISOString()}`);

  const customWeatherFeed: CustomFeedRequest = {
    name: 'San Francisco Weather',
    description: 'Current temperature in San Francisco from multiple weather APIs',
    dataSources: [
      {
        name: 'OPENWEATHER',
        url: 'https://api.openweathermap.org/data/2.5/weather?q=San%20Francisco&units=metric&appid=${OPENWEATHER_API_KEY}',
        jsonPath: '$.main.temp',
      },
      {
        name: 'WEATHERAPI',
        url: 'https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=San%20Francisco',
        jsonPath: '$.current.temp_c',
      },
    ],
    aggregation: 'mean',
    updateFrequency: 'medium',
    pricePerUpdate: 0.00005,
  };

  console.log('\n\nCreating custom weather feed...');
  const weatherFeed = await marketplace.createCustomFeed(
    customWeatherFeed,
    'weather-feed-owner'
  );

  console.log('\nWeather Feed Created:');
  console.log(`  Name: ${weatherFeed.name}`);
  console.log(`  Feed ID: ${weatherFeed.feedId}`);
  console.log(`  Price per Update: ${weatherFeed.pricePerUpdate} ${weatherFeed.currency}`);
  console.log(`  Update Frequency: ${weatherFeed.updateFrequency}`);

  const customStockFeed: CustomFeedRequest = {
    name: 'AAPL Stock Price',
    description: 'Apple Inc. stock price with real-time updates',
    dataSources: [
      {
        name: 'ALPHAVANTAGE',
        url: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${ALPHAVANTAGE_KEY}',
        jsonPath: '$["Global Quote"]["05. price"]',
      },
      {
        name: 'FINNHUB',
        url: 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=${FINNHUB_KEY}',
        jsonPath: '$.c',
      },
    ],
    aggregation: 'median',
    updateFrequency: 'realtime',
    pricePerUpdate: 0.0003,
  };

  console.log('\n\nCreating custom stock price feed...');
  const stockFeed = await marketplace.createCustomFeed(
    customStockFeed,
    'stock-feed-owner'
  );

  console.log('\nStock Feed Created:');
  console.log(`  Name: ${stockFeed.name}`);
  console.log(`  Feed ID: ${stockFeed.feedId}`);
  console.log(`  Price per Update: ${stockFeed.pricePerUpdate} ${stockFeed.currency}`);
  console.log(`  Update Frequency: ${stockFeed.updateFrequency}`);

  console.log('\n\n--- All Custom Feeds Summary ---');
  const allFeeds = marketplace.listFeeds('custom');
  console.log(`Total custom feeds: ${allFeeds.length}`);

  for (const feed of allFeeds) {
    console.log(`\n  ${feed.name}`);
    console.log(`    Feed ID: ${feed.feedId.slice(0, 20)}...`);
    console.log(`    Price: ${feed.pricePerUpdate} ${feed.currency}/update`);
  }
}

main().catch(console.error);
