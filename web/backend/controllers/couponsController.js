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

    // Validate percentageValue if discountType is percentage
    if (discountType === "percentage") {
      let percent = Number(percentageValue);
      // If value is > 1, assume it's a whole number and convert to decimal
      if (percent > 1) percent = percent / 100;

      If you have recipientPercentageValue, validate their sum
      let recipientPercent = Number(recipientPercentageValue || 0);
      if (recipientPercent > 1) recipientPercent = recipientPercent / 100;
      if (percent + recipientPercent > 1) {
        return res.status(400).json({
          success: false,
          message: "Combined percentage value for sender and recipient must not exceed 1.0 (100%)",
        });
      }

      if (percent <= 0.0 || percent > 1.0) {
        return res.status(400).json({
          success: false,
          message: "Percentage value must be between 0.0 and 1.0 (0% - 100%)",
        });
      }
      // Use the normalized percent value for Shopify
      req.body.percentageValue = percent;
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
          value: { percentage: Number(req.body.percentageValue) }, // Already normalized
          items: {
            all: false,
            ...(productIds.length ? { products: { productsToAdd: productIds } } : {}),
            ...(collectionIds.length ? { collections: { collectionsToAdd: collectionIds } } : {}),
          },
        };
      } else if (discountType === "fixed") {
        customerGets = {
          value: { fixedAmount: { amount: Number(fixedAmount), appliesOnEachItem: false } },
          items: {
            all: false,
            ...(productIds.length ? { products: { productsToAdd: productIds } } : {}),
            ...(collectionIds.length ? { collections: { collectionsToAdd: collectionIds } } : {}),
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

    // If the new coupon is active, update the widget
    if (newCoupon.isActive) {
      await Widget.findOneAndUpdate(
        { shop },
        { coupon: newCoupon._id },
        { new: true }
      );
      
      // Update Shopify metafields
      await updateWidgetMetafields(shop, session);
    }

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

    // If coupon is set to active, update the widget
    if (coupon.isActive) {
      await Widget.findOneAndUpdate(
        { shop },
        { coupon: coupon._id },
        { new: true }
      );
      
      // Update Shopify metafields
      await updateWidgetMetafields(shop, session);
    }

    if (coupon.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });

        let customerGets;
        if (discountType === "percentage") {
          customerGets = {
            value: { percentage: Number(percentageValue) },
            items: {
              all: false,
              ...(productIds.length ? { products: { productsToAdd: productIds } } : {}),
              ...(collectionIds.length ? { collections: { collectionsToAdd: collectionIds } } : {}),
            },
          };
        } else if (discountType === "fixed") {
          customerGets = {
            value: { fixedAmount: { amount: Number(fixedAmount), appliesOnEachItem: false } },
            items: {
              all: false,
              ...(productIds.length ? { products: { productsToAdd: productIds } } : {}),
              ...(collectionIds.length ? { collections: { collectionsToAdd: collectionIds } } : {}),
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
        const data = await client.query({
          data: {
            query: `mutation discountCodeDelete($id: ID!) {
              discountCodeDelete(id: $id) {
                deletedCodeDiscountId
                userErrors {
                  field
                  code
                  message
                }
              }
            }`,
            variables: {
              id: deletedCoupon.shopifyDiscountId,
            },
          },
        });

        const response = data.body.data.discountCodeDelete;
        if (response.userErrors && response.userErrors.length > 0) {
          console.error(
            "Shopify discount deletion errors:",
            response.userErrors
          );
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

    // Get all currently active coupons before deactivating them
    const activeCoupons = await Coupon.find({ 
      shop, 
      isActive: true,
      _id: { $ne: couponId } // Exclude the coupon we're activating
    });
    
    // Deactivate all coupons in our database
    await Coupon.updateMany({ shop }, { isActive: false });
    
    // Activate the specified coupon
    const updated = await Coupon.findOneAndUpdate(
      { _id: couponId, shop },
      { isActive: true },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or does not belong to this shop",
      });
    }

    // Update widget to use the activated coupon
    if (updated) {
      await Widget.findOneAndUpdate(
        { shop },
        { coupon: updated._id },
        { new: true }
      );
      
      // Update Shopify metafields
      await updateWidgetMetafields(shop, session);
    }

    // Deactivate previously active coupons in Shopify
    const client = new shopify.api.clients.Graphql({ session });
    
    for (const coupon of activeCoupons) {
      if (coupon.shopifyDiscountId) {
        try {
          await client.query({
            data: {
              query: `mutation discountCodeDeactivate($id: ID!) {
                discountCodeDeactivate(id: $id) {
                  codeDiscountNode {
                    codeDiscount {
                      ... on DiscountCodeBasic {
                        title
                        status
                      }
                    }
                  }
                  userErrors {
                    field
                    code
                    message
                  }
                }
              }`,
              variables: {
                id: coupon.shopifyDiscountId,
              },
            },
          });
        } catch (e) {
          console.error(`Failed to deactivate Shopify Discount ${coupon._id}:`, e);
          // Continue with other deactivations even if one fails
        }
      }
    }

    // Activate the selected coupon in Shopify
    if (updated && updated.shopifyDiscountId) {
      try {
        const data = await client.query({
          data: {
            query: `mutation discountCodeActivate($id: ID!) {
              discountCodeActivate(id: $id) {
                codeDiscountNode {
                  codeDiscount {
                    ... on DiscountCodeBasic {
                      title
                      status
                      startsAt
                      endsAt
                    }
                  }
                }
                userErrors {
                  field
                  code
                  message
                }
              }
            }`,
            variables: {
              id: updated.shopifyDiscountId,
            },
          },
        });

        const response = data.body.data.discountCodeActivate;
        if (response.userErrors && response.userErrors.length > 0) {
          console.error(
            "Shopify discount activation errors:",
            response.userErrors
          );
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

// Function to update Shopify metafields after widget update
const updateWidgetMetafields = async (shop, session) => {
  try {
    const client = new shopify.api.clients.Graphql({ session });
    const shopResponse = await client.request(`
      query {
        shop {
          id
        }
      }
    `);

    if (!shopResponse?.data?.shop?.id) {
      throw new Error("Failed to get shop ID");
    }

    const shopGid = shopResponse.data.shop.id;
    
    // Get updated widget with populated coupon
    const widget = await Widget.findOne({ shop }).populate('coupon').lean();
    if (!widget) return;

    const setMetaFields = new shopify.api.clients.Graphql({ session });
    const mutation = `
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;
    
    const variables = {
      metafields: [
        {
          key: "widget_settings",
          namespace: "share_cart",
          ownerId: shopGid,
          type: "json",
          value: JSON.stringify({
            display: widget.display,
            button_style: widget.buttonStyle,
            text: widget.text,
            colors: widget.colors,
            coupon: widget.coupon,
          }),
        },
      ],
    };

    await setMetaFields.query({
      data: {
        query: mutation,
        variables,
      },
    });
    
  } catch (error) {
    // Log error but don't block execution
    console.error("Failed to update widget metafields:", error);
  }
};

export const deactivateCoupon = async (req, res) => {
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

    // Update our local database
    coupon.isActive = false;
    await coupon.save();

    // Deactivate in Shopify
    if (coupon.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });
        const data = await client.query({
          data: {
            query: `mutation discountCodeDeactivate($id: ID!) {
              discountCodeDeactivate(id: $id) {
                codeDiscountNode {
                  codeDiscount {
                    ... on DiscountCodeBasic {
                      title
                      status
                      startsAt
                      endsAt
                    }
                  }
                }
                userErrors {
                  field
                  code
                  message
                }
              }
            }`,
            variables: {
              id: coupon.shopifyDiscountId,
            },
          },
        });

        const response = data.body.data.discountCodeDeactivate;
        if (response.userErrors && response.userErrors.length > 0) {
          console.error(
            "Shopify discount deactivation errors:",
            response.userErrors
          );
        }
      } catch (e) {
        console.error("Failed to deactivate Shopify Discount:", e);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deactivated successfully",
      coupon: coupon,
    });
  } catch (error) {
    console.error("Error deactivating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deactivating coupon",
      error: error.message,
    });
  }
};