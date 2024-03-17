import { createClient } from 'redis';

const client = createClient({
    url: process.env.REDIS_PRIVATE_URL
});

client.on('error', (error) => console.error(`Redis Client Error: ${error}`));

const connectRedis = async () => {
    try {
        await client.connect();
        console.log('Connected to Redis successfully');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
};

export { client, connectRedis };
