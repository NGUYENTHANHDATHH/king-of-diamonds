// Configuration for different environments
export const config = {
  // Server URLs for different environments
  serverUrl: {
    development: 'http://localhost:4000',
    production: 'https://king-of-diamonds-6dix.onrender.com'
  },
  
  // Get the appropriate server URL based on environment
  getServerUrl: () => {
    return process.env.NODE_ENV === 'production' 
      ? config.serverUrl.production 
      : config.serverUrl.development;
  }
};
