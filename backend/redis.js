import { createClient } from 'redis';

const client = createClient({
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
