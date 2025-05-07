import { DeliveryMethod } from "@shopify/shopify-api";
import { orderCreatedHandler } from "./backend/webhooks/orderWebhooks.js";

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  ORDERS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: orderCreatedHandler
  }
};