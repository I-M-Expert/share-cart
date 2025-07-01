import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import UserSubscription from "../models/UserSubscription.js";
import shopify from "../../shopify.js";

export const createSubscription = async (req, res) => {
  const session = res.locals.shopify.session;
  const { subscriptionId } = req.body;
  const host = process.env.HOST || process.env.APP_URL;
  if (!session) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  if (!host) {
    return res.status(400).send({ error: "Missing host parameter" });
  }

  const shop = session.shop;
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).send({ error: "Subscription not found" });
    }


    // If free plan, skip Shopify billing and confirm directly
    if (subscription.amount === 0) {
      // Directly create UserSubscription and User
      const startDate = new Date();
      let endDate;
      if (subscription.duration === "monthly") {
        endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (subscription.duration === "yearly") {
        endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      } else {
        throw new Error("Invalid subscription duration");
      }

      await UserSubscription.create({
        shop,
        subscription: subscription._id,
        status: "ACTIVE",
        startDate,
        endDate,
        chargeId: null,
      });

      const user = await User.create({ shop });

      return res.status(200).json({
        url: `/?shop=${shop}&host=${host}&subscriptionActive=true`,
        user,
        freePlan: true,
      });
    }

    const mutation = `
      mutation createAppSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean!) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          test: $test
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      name: subscription.name,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: subscription.amount, currencyCode: "USD" },
              interval:
                subscription.duration.toUpperCase() === "MONTHLY"
                  ? "EVERY_30_DAYS"
                  : subscription.duration.toUpperCase(),
            },
          },
        },
      ],
      returnUrl: `https://${shop}/admin/apps/${process.env.APP_NAME}/confirmation?shop=${shop}&host=${host}&subscriptionId=${subscriptionId}`,
      test: false,
    };

    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.request(mutation, { variables });

    const { appSubscriptionCreate } = response.data;

    if (
      appSubscriptionCreate.userErrors &&
      appSubscriptionCreate.userErrors.length > 0
    ) {
      return res.status(400).send({
        success: false,
        errors: appSubscriptionCreate.userErrors,
      });
    }

    if (!appSubscriptionCreate.confirmationUrl) {
      throw new Error("No confirmation URL received");
    }

    res.status(200).send({
      success: true,
      confirmationUrl: appSubscriptionCreate.confirmationUrl,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).send({
      success: false,
      message: error.message,
      errorUrl: `https://${shop}/admin/apps/${
        process.env.APP_NAME
      }/error?shop=${shop}&host=${host}&error=${encodeURIComponent(
        error.message
      )}`,
    });
  }
};

export const confirmSubscription = async (req, res) => {
  const { shop, subscriptionId, charge_id } = req.query;
  const host = process.env.HOST;

  if (!shop || !subscriptionId) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    const session = res.locals.shopify.session;

    if (!session) {
      return res.redirect(
        `/api/auth?shop=${shop}&redirect_uri=${encodeURIComponent(
          `/api/billing/confirmation?${req.url.split("?")[1]}`
        )}`
      );
    }

    // Fetch subscription details
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const startDate = new Date();
    let endDate;
    if (subscription.duration === "monthly") {
      endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (subscription.duration === "yearly") {
      endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      throw new Error("Invalid subscription duration");
    }

    await UserSubscription.create({
      shop,
      subscription: subscription._id,
      status: "ACTIVE",
      startDate,
      endDate,
      chargeId: subscription.amount === 0 ? null : charge_id,
    });

    const user = await User.create({ shop });

    return res.status(200).json({
      url: `/?shop=${shop}&host=${host}&subscriptionActive=true`,
      user,
    });
  } catch (error) {
    console.error("Detailed error:", error);
    return res.status(500).json({ error: error });
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().sort({ createdAt: -1 });
    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).send({ success: false, message: error.message });
  }
};

export const checkSubscriptions = async (req, res) => {
  const session = res.locals.shopify.session;
  const shop = session.shop;
  console.log('my shop', shop);

  try {
    const subscription = await UserSubscription.findOne({ shop }).sort({ createdAt: -1 }).populate("subscription");
    const user = await User.findOne({ shop });

    if (!subscription) {
      return res.status(404).json({ success: false, message: "No subscription found" });
    }

    const currentDate = new Date();

    if (currentDate > subscription.endDate) {
      return res.status(403).json({ 
        success: false, 
        message: "Subscription has expired" 
      });
    }


    res.status(200).json({ subscription, user, trialActive: false });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).send({ success: false, message: error.message });
  }
};
