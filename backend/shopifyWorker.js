import { connectRedis, client } from './redis.js';
import { processShopifyWebhook } from './processShopifyWebhook.js';
import connectDB from './database.js';

// Functions for TTL-based Processed Webhook ID Management
async function markWebhookAsProcessed(webhookId) {
    const processedKey = `processedWebhook:${webhookId}`;
    console.log(`Marking webhook as processed: ${processedKey}, value: true, with TTL: 3600`);
    await client.set(processedKey, 'true', {
        EX: 3600, // Set the TTL for this key to 1 hour
    });
}

async function hasWebhookBeenProcessed(webhookId) {
    const processedKey = `processedWebhook:${webhookId}`;
    const result = await client.get(processedKey);
    return result !== null;
}

async function processQueue() {
    await connectRedis();
    await connectDB();
    console.log('Listening for queue items...');

    while (true) {
        try {
            const data = await client.brPop('shopifyUpdatesQueue', 5);
            if (data && data.element) {
                const webhookData = JSON.parse(data.element);
                console.log('Parsed webhookData:', webhookData);

                if (await hasWebhookBeenProcessed(webhookData.shopifyWebhookId)) {
                    console.log(`Webhook ${webhookData.shopifyWebhookId} already processed. Skipping.`);
                    continue;
                }

                try {
                    await processShopifyWebhook(webhookData);
                    await markWebhookAsProcessed(webhookData.shopifyWebhookId);
                    console.log('Webhook processed successfully');
                } catch (error) {
                    console.error('Error processing webhook:', error);
                    // Here you might implement additional error handling, such as retry logic or moving to a dead-letter queue.
                }
            }
        } catch (error) {
            console.error('Error during queue processing:', error);
        }
    }
}

processQueue().catch(console.error);