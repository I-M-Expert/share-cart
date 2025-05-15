import { DeliveryMethod } from "@shopify/shopify-api";

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  /**
   * Customers can request their data from a store owner. When this happens,
   * Shopify invokes this privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
   */
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "orders_requested": [
      //     299938,
      //     280263,
      //     220458
      //   ],
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "data_request": {
      //     "id": 9999
      //   }
      // }
    },
  },

  /**
   * Store owners can request that data is deleted on behalf of a customer. When
   * this happens, Shopify invokes this privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-redact
   */
  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "orders_to_redact": [
      //     299938,
      //     280263,
      //     220458
      //   ]
      // }
    },
  },

  /**
   * 48 hours after a store owner uninstalls your app, Shopify invokes this
   * privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#shop-redact
   */
  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      try {
        console.log("Shop uninstalled:", JSON.stringify(payload));
        const getResponseApiKey = process.env.GETRESPONSE_API_KEY;

        // Fetch the shop's email using Shopify API
        const session = await shopify.config.sessionStorage.loadSessionByShop(shop);
        let email = shop; // fallback

        if (session && session.accessToken) {
          const response = await fetch(
            `https://${shop}/admin/api/2023-10/shop.json`,
            {
              method: "GET",
              headers: {
                "X-Shopify-Access-Token": session.accessToken,
                "Content-Type": "application/json",
              },
            }
          );
          const data = await response.json();
          email = data.shop?.email || shop;
        }

        // 1. Remove from main GetResponse list if present
        const searchRes = await fetch(
          `https://api.getresponse.com/v3/contacts?query[email]=${encodeURIComponent(email)}&query[campaignId]=${process.env.GETRESPONSE_LIST_ID}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Auth-Token": `api-key ${getResponseApiKey}`,
            },
          }
        );
        const searchData = await searchRes.json();

        if (Array.isArray(searchData) && searchData.length > 0) {
          for (const contact of searchData) {
            await fetch(`https://api.getresponse.com/v3/contacts/${contact.contactId}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "X-Auth-Token": `api-key ${getResponseApiKey}`,
              },
            });
            console.log(`Removed ${email} from main GetResponse list`);
          }
        }

        // 2. Add to "uninstalled" list in GetResponse
        await fetch("https://api.getresponse.com/v3/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": `api-key ${getResponseApiKey}`,
          },
          body: JSON.stringify({
            email: email,
            name: email,
            campaign: { campaignId: process.env.GETRESPONSE_UNINSTALLED_LIST_ID },
          }),
        });
        console.log(`Added ${email} to uninstalled list`);
      } catch (e) {
        console.error("Failed to update GetResponse list on uninstall:", e);
      }
    },
  },
};
