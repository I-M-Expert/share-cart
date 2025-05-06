import Coupon from "../models/Coupon.js";
import Subscription from "../models/Subscription.js";
import UserSubscription from "../models/UserSubscription.js";
import Widget from "../models/Widget.js";
import shopify from "../../shopify.js"; // Adjust import as needed

/**
 * Get all coupons for the current shop
 */
export const getCoupons = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session)
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    const shop = req.query.shop || session.shop;
    if (!shop)
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier not found" });

    const coupons = await Coupon.find({ shop }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      coupons: coupons.map((coupon) => ({
        id: coupon._id,
        name: coupon.name,
        code: coupon.code,
        createdAt: coupon.createdAt,
        endDate: coupon.endDate,
        sentCount: coupon.sentCount,
        convertedCount: coupon.convertedCount,
        usedBy: coupon.usedBy.map((user) => user.customerName).join(", "),
        isActive: coupon.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching coupons",
      error: error.message,
    });
  }
};

/**
 * Create a new coupon (Standard Shopify Discount)
 */
export const createCoupon = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session)
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    const shop = req.query.shop || session.shop;
    if (!shop)
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier not found" });

    const activeCouponsCount = await Coupon.countDocuments({
      shop,
      isActive: true,
    });
    const userSubscription = await UserSubscription.findOne({ shop })
      .sort({ createdAt: -1 })
      .populate("subscription");
    if (!userSubscription) {
      return res
        .status(403)
        .json({ success: false, message: "Subscription details not found" });
    }
    if (
      userSubscription?.subscription.permissions.liveCoupons !== "unlimited" &&
      activeCouponsCount >=
        userSubscription?.subscription.permissions.liveCoupons
    ) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum limit of ${userSubscription.subscription.permissions.liveCoupons} live coupons for your ${userSubscription?.subscription.name} plan. Please upgrade to create more coupons.`,
      });
    }

    const {
      name,
      discountType,
      percentageValue,
      fixedAmount,
      endDate,
      productIds = [],
      collectionIds = [],
      senderRequireMinPurchase,
      senderMinPurchaseAmount,
      senderTimesPerUser,
      senderTimesValue,
      senderNewCustomersOnly,
      recipientRequireMinPurchase,
      recipientMinPurchaseAmount,
      recipientTimesPerUser,
      recipientTimesValue,
      recipientNewCustomersOnly,
      shareWhatsapp,
      shareMessenger,
      shareEmail,
      selectedProduct,
      customMessage,
    } = req.body;

    const code = `${name.substring(0, 3).toUpperCase()}${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    if (
      (!productIds || productIds.length === 0) &&
      (!collectionIds || collectionIds.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You must select at least one product or collection for the discount to apply.",
      });
    }

    const newCoupon = new Coupon({
      shop,
      name,
      code,
      discountType,
      percentageValue:
        discountType === "percentage" ? percentageValue : undefined,
      fixedAmount: discountType === "fixed" ? fixedAmount : undefined,
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      productIds,
      collectionIds,
      senderRequireMinPurchase,
      senderMinPurchaseAmount,
      senderTimesPerUser,
      senderTimesValue,
      senderNewCustomersOnly,
      recipientRequireMinPurchase,
      recipientMinPurchaseAmount,
      recipientTimesPerUser,
      recipientTimesValue,
      recipientNewCustomersOnly,
      shareWhatsapp,
      shareMessenger,
      shareEmail,
      productId: selectedProduct,
      customMessage,
    });

    await newCoupon.save();

    // --- Create Standard Discount in Shopify ---
    try {
      const client = new shopify.api.clients.Graphql({ session });

      // Build customerGets based on discountType
      let customerGets;
      if (discountType === "percentage") {
        customerGets = {
          value: { percentage: Number(percentageValue) },
          items: {
            all: false,
            ...(productIds.length ? { products: { productReferences: productIds } } : {}),
            ...(collectionIds.length ? { collections: { collectionReferences: collectionIds } } : {}),
          },
        };
      } else if (discountType === "fixed") {
        customerGets = {
          value: { fixedAmount: { amount: Number(fixedAmount), appliesOnEachItem: false } },
          items: {
            all: false,
            ...(productIds.length ? { products: { productReferences: productIds } } : {}),
            ...(collectionIds.length ? { collections: { collectionReferences: collectionIds } } : {}),
          },
        };
      }

      // Build minimumRequirement if provided
      let minimumRequirement;
      if (senderRequireMinPurchase && senderMinPurchaseAmount) {
        minimumRequirement = {
          subtotal: {
            greaterThanOrEqualToSubtotal: String(senderMinPurchaseAmount),
          },
        };
      }

      // Build the variables object
      const variables = {
        basicCodeDiscount: {
          title: name,
          code,
          startsAt: new Date().toISOString(),
          endsAt: endDate ? new Date(endDate).toISOString() : undefined,
          customerGets,
          customerSelection: { all: true },
          appliesOncePerCustomer: true,
          usageLimit: 1,
          ...(minimumRequirement ? { minimumRequirement } : {}),
        },
      };

      const mutation = `
  mutation CreateDiscountCode($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            startsAt
            endsAt
            customerSelection {
              ... on DiscountCustomers {
                customers {
                  id
                }
              }
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
              }
            }
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

      const data = await client.query({
        data: {
          query: mutation,
          variables,
        },
      });

      const resp = data.body.data.discountCodeBasicCreate;
      if (resp.userErrors && resp.userErrors.length > 0) {
        console.error("Shopify discount creation errors:", resp.userErrors);
        return res.status(400).json({
          success: false,
          message: "Shopify API error",
          userErrors: resp.userErrors,
        });
      } else {
        newCoupon.shopifyDiscountId = resp.codeDiscountNode.id;
        await newCoupon.save();
      }
    } catch (e) {
      console.error("Failed to create Shopify Discount:", e);
      return res.status(500).json({
        success: false,
        message: "Failed to create Shopify Discount",
        error: e.message,
      });
    }
    // --- End Shopify Discount creation ---

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating coupon",
      error: error.message,
    });
  }
};

/**
 * Edit an existing coupon (Standard Shopify Discount)
 */
export const editCoupon = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session)
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    const shop = req.query.shop || session.shop;
    if (!shop)
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier not found" });

    const couponId = req.params.id;
    if (!couponId)
      return res
        .status(400)
        .json({ success: false, message: "Coupon ID is required" });

    const {
      name,
      discountType,
      percentageValue,
      fixedAmount,
      endDate,
      productIds = [],
      collectionIds = [],
      senderRequireMinPurchase,
      senderMinPurchaseAmount,
      senderTimesPerUser,
      senderTimesValue,
      senderNewCustomersOnly,
      recipientRequireMinPurchase,
      recipientMinPurchaseAmount,
      recipientTimesPerUser,
      recipientTimesValue,
      recipientNewCustomersOnly,
      shareWhatsapp,
      shareMessenger,
      shareEmail,
      selectedProduct,
      customMessage,
      isActive,
    } = req.body;

    const coupon = await Coupon.findOne({ _id: couponId, shop });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or does not belong to this shop",
      });
    }

    // Update coupon fields
    if (name) coupon.name = name;
    if (discountType) {
      coupon.discountType = discountType;
      if (discountType === "percentage") {
        coupon.percentageValue = percentageValue;
        coupon.fixedAmount = undefined;
      } else if (discountType === "fixed") {
        coupon.fixedAmount = fixedAmount;
        coupon.percentageValue = undefined;
      }
    }
    if (endDate) coupon.endDate = endDate;
    if (productIds) coupon.productIds = productIds;
    if (collectionIds) coupon.collectionIds = collectionIds;
    if (senderRequireMinPurchase !== undefined)
      coupon.senderRequireMinPurchase = senderRequireMinPurchase;
    if (senderMinPurchaseAmount !== undefined)
      coupon.senderMinPurchaseAmount = senderMinPurchaseAmount;
    if (senderTimesPerUser !== undefined)
      coupon.senderTimesPerUser = senderTimesPerUser;
    if (senderTimesValue !== undefined)
      coupon.senderTimesValue = senderTimesValue;
    if (senderNewCustomersOnly !== undefined)
      coupon.senderNewCustomersOnly = senderNewCustomersOnly;
    if (recipientRequireMinPurchase !== undefined)
      coupon.recipientRequireMinPurchase = recipientRequireMinPurchase;
    if (recipientMinPurchaseAmount !== undefined)
      coupon.recipientMinPurchaseAmount = recipientMinPurchaseAmount;
    if (recipientTimesPerUser !== undefined)
      coupon.recipientTimesPerUser = recipientTimesPerUser;
    if (recipientTimesValue !== undefined)
      coupon.recipientTimesValue = recipientTimesValue;
    if (recipientNewCustomersOnly !== undefined)
      coupon.recipientNewCustomersOnly = recipientNewCustomersOnly;
    if (shareWhatsapp !== undefined) coupon.shareWhatsapp = shareWhatsapp;
    if (shareMessenger !== undefined) coupon.shareMessenger = shareMessenger;
    if (shareEmail !== undefined) coupon.shareEmail = shareEmail;
    if (selectedProduct) coupon.productId = selectedProduct;
    if (customMessage !== undefined) coupon.customMessage = customMessage;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    if (coupon.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });

        let customerGets;
        if (discountType === "percentage") {
          customerGets = {
            value: { percentage: Number(percentageValue) },
            items: {
              all: false,
              ...(productIds.length ? { products: { productReferences: productIds } } : {}),
              ...(collectionIds.length ? { collections: { collectionReferences: collectionIds } } : {}),
            },
          };
        } else if (discountType === "fixed") {
          customerGets = {
            value: { fixedAmount: { amount: Number(fixedAmount), appliesOnEachItem: false } },
            items: {
              all: false,
              ...(productIds.length ? { products: { productReferences: productIds } } : {}),
              ...(collectionIds.length ? { collections: { collectionReferences: collectionIds } } : {}),
            },
          };
        }

        // Build minimumRequirement if provided
        let minimumRequirement;
        if (senderRequireMinPurchase && senderMinPurchaseAmount) {
          minimumRequirement = {
            subtotal: {
              greaterThanOrEqualToSubtotal: String(senderMinPurchaseAmount),
            },
          };
        }

        const mutation = `
          mutation discountCodeBasicUpdate($basicCodeDiscount: DiscountCodeBasicInput!, $id: ID!) {
            discountCodeBasicUpdate(basicCodeDiscount: $basicCodeDiscount, id: $id) {
              codeDiscountNode {
                id
                codeDiscount {
                  ... on DiscountCodeBasic {
                    title
                    code
                    status
                  }
                }
              }
              userErrors { field message }
            }
          }
        `;

        const variables = {
          id: coupon.shopifyDiscountId,
          basicCodeDiscount: {
            title: coupon.name,
            code: coupon.code,
            startsAt: coupon.createdAt.toISOString(),
            endsAt: coupon.endDate
              ? new Date(coupon.endDate).toISOString()
              : undefined,
            customerGets,
            customerSelection: { all: true },
            appliesOncePerCustomer: true,
            usageLimit: 1,
            ...(minimumRequirement ? { minimumRequirement } : {}),
          },
        };

        const data = await client.query({
          data: {
            query: mutation,
            variables,
          },
        });

        const resp = data.body.data.discountCodeBasicUpdate;
        if (resp.userErrors && resp.userErrors.length > 0) {
          console.error("Shopify discount update errors:", resp.userErrors);
          return res.status(400).json({
            success: false,
            message: "Shopify API error",
            userErrors: resp.userErrors,
          });
        }
      } catch (e) {
        console.error("Failed to update Shopify Discount:", e);
        return res.status(500).json({
          success: false,
          message: "Failed to update Shopify Discount",
          error: e.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon: {
        id: coupon._id,
        name: coupon.name,
        code: coupon.code,
        discountType: coupon.discountType,
        percentageValue: coupon.percentageValue,
        fixedAmount: coupon.fixedAmount,
        endDate: coupon.endDate,
        isActive: coupon.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating coupon",
      error: error.message,
    });
  }
};

export const getCoupon = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session)
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    const shop = req.query.shop || session.shop;
    if (!shop)
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier not found" });

    const couponId = req.params.id;
    if (!couponId)
      return res
        .status(400)
        .json({ success: false, message: "Coupon ID is required" });

    const coupon = await Coupon.findOne({ _id: couponId, shop });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or does not belong to this shop",
      });
    }

    return res.status(200).json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching coupon",
      error: error.message,
    });
  }
};

/**
 * Delete a coupon (Standard Shopify Discount)
 */
export const deleteCoupon = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session)
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    const shop = req.query.shop || session.shop;
    if (!shop)
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier not found" });

    const couponId = req.params.id;
    if (!couponId)
      return res
        .status(400)
        .json({ success: false, message: "Coupon ID is required" });

    const deletedCoupon = await Coupon.findOneAndDelete({
      _id: couponId,
      shop,
    });
    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or does not belong to this shop",
      });
    }

    if (deletedCoupon && deletedCoupon.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });
        const mutation = `
          mutation discountCodeBasicDelete($id: ID!) {
            discountCodeBasicDelete(id: $id) {
              deletedCodeDiscountId
              userErrors { field message }
            }
          }
        `;
        const variables = { id: deletedCoupon.shopifyDiscountId };
        const data = await client.query({
          data: { query: mutation, variables },
        });
        const userErrors = data.body.data.discountCodeBasicDelete.userErrors;
        if (userErrors && userErrors.length > 0) {
          console.error("Shopify discount delete errors:", userErrors);
        }
      } catch (e) {
        console.error("Failed to delete Shopify Discount:", e);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting coupon",
      error: error.message,
    });
  }
};

/**
 * Activate a coupon and deactivate all others for the shop (Standard Shopify Discount)
 */
export const activateCoupon = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session)
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    const shop = req.query.shop || session.shop;
    if (!shop)
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier not found" });
    const couponId = req.params.id;
    if (!couponId)
      return res
        .status(400)
        .json({ success: false, message: "Coupon ID is required" });

    await Coupon.updateMany({ shop }, { isActive: false });
    const updated = await Coupon.findOneAndUpdate(
      { _id: couponId, shop },
      { isActive: true },
      { new: true }
    );
    if (!updated) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Coupon not found or does not belong to this shop",
        });
    }

    if (updated) {
      await Widget.findOneAndUpdate(
        { shop },
        { coupon: updated._id },
        { new: true }
      );
    }

    // Optionally activate in Shopify (usually not needed, code is active by default)
    if (updated && updated.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });
        const mutation = `
          mutation discountCodeBasicActivate($id: ID!) {
            discountCodeBasicActivate(id: $id) {
              codeDiscountNode { id }
              userErrors { field message }
            }
          }
        `;
        const variables = { id: updated.shopifyDiscountId };
        const data = await client.query({
          data: { query: mutation, variables },
        });
        const userErrors = data.body.data.discountCodeBasicActivate.userErrors;
        if (userErrors && userErrors.length > 0) {
          console.error("Shopify discount activation errors:", userErrors);
        }
      } catch (e) {
        console.error("Failed to activate Shopify Discount:", e);
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Coupon activated", coupon: updated });
  } catch (error) {
    console.error("Error activating coupon:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while activating coupon",
        error: error.message,
      });
  }
};

