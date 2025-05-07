export async function registerWebhooks(session, shopify) {
  try {
    const webhooks = [
      {
        path: "/api/webhooks",
        topic: "ORDERS_CREATE",
      }
    ];
    
    for (const webhook of webhooks) {
      await shopify.api.webhooks.register({
        session,
        path: webhook.path,
        topic: webhook.topic,
      });
      console.log(`Registered ${webhook.topic} webhook`);
    }
  } catch (error) {
    console.error('Failed to register webhooks:', error);
    throw error;
  }
}