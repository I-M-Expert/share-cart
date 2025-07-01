import shopify from '../shopify.js';

export async function registerWebhooks(session, shopify) {
  try {
    const variables = [
      {
        topic: "ORDERS_CREATE",
        webhookSubscription: {
          callbackUrl: process.env.HOST + "/api/webhooks",
          format: "JSON",
        },
      },
      {
        topic: "ORDERS_FULFILLED",
        webhookSubscription: {
          callbackUrl: process.env.HOST + "/api/webhooks",
          format: "JSON",
        },
      },
      {
        topic: "SHOP_REDACT",
        webhookSubscription: {
          callbackUrl: process.env.HOST + "/api/webhooks",
          format: "JSON",
        },
      },
      {
        topic: "CUSTOMERS_REDACT",
        webhookSubscription: {
          callbackUrl: process.env.HOST + "/api/webhooks",
          format: "JSON",
        },
      },
      {
        topic: "CUSTOMERS_DATA_REQUEST",
        webhookSubscription: {
          callbackUrl: process.env.HOST + "/api/webhooks",
          format: "JSON",
        },
      },
    ];

    for (const { topic, webhookSubscription } of variables) {
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
      const client = new shopify.api.clients.Graphql({ session });
      const response = await client.query({ data: { query: mutation, variables: { topic, webhookSubscription } } });

      if (response.body.data.webhookSubscriptionCreate.userErrors.length) {
        console.error('Webhook registration errors:', response.body.data.webhookSubscriptionCreate.userErrors);
        // Do not throw, just log and continue
        return;
      }

      console.log(`Registered ${topic} webhook:`, response.body.data.webhookSubscriptionCreate.webhookSubscription);
    }
  } catch (error) {
    console.error('Failed to register webhooks:', error);
    // Do not re-throw, just log and continue
  }
}