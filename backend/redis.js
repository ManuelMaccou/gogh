import { createClient } from 'redis';

console.log('REDIS_URL:', process.env.REDIS_URL);

const client = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Retry count exceeded');
            return Math.min(retries * 100, 3000);
        }
    }
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
