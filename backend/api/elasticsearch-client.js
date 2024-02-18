import 'dotenv/config.js'
import { Client } from '@elastic/elasticsearch';

console.log(process.env.ES_CLOUD_ID);
const ES_CLOUD_ID = process.env.ES_CLOUD_ID;
const ES_USERNAME = process.env.ES_USERNAME;
const ES_PASSWORD = process.env.ES_PASSWORD;

// Validate required environment variables
if (!ES_CLOUD_ID || !ES_USERNAME || !ES_PASSWORD) {
    console.error("Missing required environment variables for Elasticsearch client configuration.");
    process.exit(1); // Exit the application if any environment variable is missing
  }

const client = new Client({
  cloud: {
    id: ES_CLOUD_ID,
  },
  auth: {
    username: ES_USERNAME,
    password: ES_PASSWORD
  }
});

export default client;