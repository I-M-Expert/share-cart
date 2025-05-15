// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import crypto from "crypto";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import OrderWebhookHandlers from "./orders-webhooks.js"; // Add this line
import billingRoutes from "./backend/routes/billingRoutes.js";
import couponRoutes from "./backend/routes/couponRoutes.js";
import productRoutes from "./backend/routes/productRoutes.js";
import collectionRoutes from "./backend/routes/collectionRoutes.js";
import widgetRoutes from "./backend/routes/widgetRoutes.js";
import analyticsRoutes from './backend/routes/analyticsRoutes.js';
import { registerWebhooks } from "./helpers/webhookRegistration.js";
import cors from "cors"; 

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.use(
  cors({
    origin: [
      /\.myshopify\.com$/, // Allow all myshopify.com domains
      /cloudfront\.net$/, // For Shopify CDN
      /shopifycdn\.com$/, // For Shopify CDN
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);



// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    const session = res.locals.shopify.session;
    await registerWebhooks(session, shopify);

    // --- Add this block ---
    try {
      // Replace with actual GetResponse API endpoint and API key
      const getResponseApiKey = process.env.GETRESPONSE_API_KEY;
      const shop = session.shop;
      const accessToken = session.accessToken;

      let email = shop; // fallback
      try {
        const response = await fetch(
          `https://${shop}/admin/api/2025-04/shop.json`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        email = data.shop?.email || shop;
        console.log("Ferched Shop ", data);
      } catch (e) {
        console.error("Failed to fetch shop email:", e);
      }

      await fetch("https://api.getresponse.com/v3/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": `api-key ${getResponseApiKey}`,
        },
        body: JSON.stringify({
          email: email || shop,
          name: shop,
          campaign: { campaignId: process.env.GETRESPONSE_LIST_ID }, // List ID for "installed"
        }),
      });
    } catch (e) {
      console.error("Failed to add user to GetResponse list:", e);
    }
    // --- End block ---

    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);

// Merge webhook handlers
const webhookHandlers = {
  ...PrivacyWebhookHandlers,
  ...OrderWebhookHandlers
};

// Then update your webhook processing:
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use(
  "/api/*",
  async (req, res, next) => {
    try {
      const sessionId = await shopify.api.session.getCurrentId({
        isOnline: shopify.config.useOnlineTokens,
        rawRequest: req,
        rawResponse: res,
      });
      const session = await shopify.config.sessionStorage.loadSession(
        sessionId ?? ""
      );
      console.log(sessionId);
      const shop = req.query.shop || session?.shop;

      if (!shop) {
        return undefined;
      }
    } catch (e) {
      console.error(e);
    }

    next();
  },
  shopify.validateAuthenticatedSession()
);

app.use(express.json());

app.use("/analytics", analyticsRoutes);
app.use("/coupons", couponRoutes);

// Global middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  next();
});

app.use("/api/billing", shopify.validateAuthenticatedSession(), billingRoutes);
app.use("/api/coupons", shopify.validateAuthenticatedSession(), couponRoutes);
app.use("/api/products", shopify.validateAuthenticatedSession(), productRoutes);
app.use(
  "/api/collections",
  shopify.validateAuthenticatedSession(),
  collectionRoutes
);
app.use("/api/widgets", shopify.validateAuthenticatedSession(), widgetRoutes);


// --- Proxy endpoint for Shopify App Proxy: /tools/share-cart ---
app.use("/tools/share-cart", async (req, res) => {

   console.log("Proxy hit:", req.url, req.headers);

  // 1. Extract query parameters
  const query = req.query;
  const { signature, ...params } = query;

  // 2. Verify Shopify proxy signature
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) =>
      `${key}=${Array.isArray(params[key]) ? params[key].join(",") : params[key]}`
    )
    .join("");

  const calculatedSignature = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(sortedParams)
    .digest("hex");

  if (calculatedSignature !== signature) {
    return res.status(403).send("Invalid signature");
  }

  // 3. Serve a minimal HTML page that loads the cart restoration script
  res.status(200).set("Content-Type", "text/html").send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shared Cart</title>
        </head>
        <body>
          <div id="share-cart-app">Restoring your cart...</div>
          <script src="https://share-cart.onrender.com/share-cart-landing.js"></script>
        </body>
      </html>
    `);
});

// Serve the cart restoration script
app.get("/share-cart-landing.js", (req, res) => {
  res.set("Content-Type", "application/javascript");
  res.sendFile(join(STATIC_PATH, "share-cart-landing.js"));
});

// --- API endpoint to decode cart data (optional, for validation/debugging) ---
app.post("/api/share-cart/decode", express.json(), (req, res) => {
  try {
    const { cart } = req.body;
    const decoded = JSON.parse(Buffer.from(cart, "base64").toString("utf-8"));
    res.json({ success: true, cart: decoded });
  } catch (e) {
    res.status(400).json({ success: false, message: "Invalid cart data" });
  }
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
