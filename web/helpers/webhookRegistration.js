import shopify from '../shopify.js';

export async function registerWebhooks(session, shopify) {
  try {
    const mutation = `
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
            topic
            format
            includeFields
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      topic: "ORDERS_CREATE", // or "orders/create" if required by your API version
      webhookSubscription: {
        callbackUrl: process.env.HOST + "/api/webhooks",
        format: "JSON",
      },
    };

    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.query({ data: { query: mutation, variables } });

    if (response.body.data.webhookSubscriptionCreate.userErrors.length) {
      console.error('Webhook registration errors:', response.body.data.webhookSubscriptionCreate.userErrors);
      // Do not throw, just log and continue
      return;
    }

    console.log('Registered ORDERS_CREATE webhook:', response.body.data.webhookSubscriptionCreate.webhookSubscription);
  } catch (error) {
    console.error('Failed to register webhooks:', error);
    // Do not re-throw, just log and continue
  }
}