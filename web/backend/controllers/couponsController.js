import Coupon from '../models/Coupon.js';
import Subscription from '../models/Subscription.js';
import UserSubscription from '../models/UserSubscription.js';
import Widget from '../models/Widget.js';
import shopify from '../../shopify.js'; // Adjust import as needed

/**
 * Get all coupons for the current shop
 */
export const getCoupons = async (req, res) => {
  try {
    // Get shop from session or query parameter
    const session = res.locals.shopify.session;

    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    
    if (!shop) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop identifier not found' 
      });
    }
    
    // Fetch coupons for this shop
    const coupons = await Coupon.find({ shop }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      coupons: coupons.map(coupon => ({
        id: coupon._id,
        name: coupon.name,
        code: coupon.code,
        createdAt: coupon.createdAt,
        endDate: coupon.endDate,
        sentCount: coupon.sentCount,
        convertedCount: coupon.convertedCount,
        usedBy: coupon.usedBy.map(user => user.customerName).join(', '),
        isActive: coupon.isActive
      }))
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching coupons',
      error: error.message
    });
  }
};

/**
 * Create a new coupon
 */
export const createCoupon = async (req, res) => {
  try {
    // Get shop from session or query parameter
    const session = res.locals.shopify.session;

    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    
    if (!shop) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop identifier not found' 
      });
    }
    
    // Check subscription limits
    const activeCouponsCount = await Coupon.countDocuments({ shop, isActive: true });
    

    
    const userSubscription = await UserSubscription.findOne({shop}).sort({ createdAt: -1 }).populate("subscription");
    if (!userSubscription) {
      return res.status(403).json({
        success: false,
        message: 'Subscription details not found'
      });
    }
    
    // Check if user has reached their coupon limit
    if (userSubscription?.subscription.permissions.liveCoupons !== 'unlimited' && 
        activeCouponsCount >= userSubscription?.subscription.permissions.liveCoupons) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum limit of ${userSubscription.subscription.permissions.liveCoupons} live coupons for your ${userSubscription?.subscription.name} plan. Please upgrade to create more coupons.`
      });
    }
    
    const {
      name,
      discountType,
      percentageValue,
      fixedAmount,
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
      endDate,
      productIds = [],
      collectionIds = []
    } = req.body;
    
    // Generate a coupon code (simple implementation)
    const code = `${name.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Check for at least one product or collection
    if ((!productIds || productIds.length === 0) && (!collectionIds || collectionIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'You must select at least one product or collection for the discount to apply.'
      });
    }
    
    // Create new coupon
    const newCoupon = new Coupon({
      shop,
      name,
      code,
      discountType,
      percentageValue: discountType === 'percentage' ? percentageValue : undefined,
      fixedAmount: discountType === 'fixed' ? fixedAmount : undefined,
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
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      productIds,
      collectionIds
    });
    
    await newCoupon.save();

    // --- Create App Discount in Shopify ---
    try {
      const client = new shopify.api.clients.Graphql({ session });

      // Build targets array
      let targets = [];
      if (productIds && productIds.length > 0) {
        targets.push({
          productVariant: {
            productVariantIds: productIds.map(id => `gid://shopify/ProductVariant/${id}`)
          }
        });
      }

      // Fetch product variants for selected collections
      if (collectionIds && collectionIds.length > 0) {
        // You need to implement this: fetch all product variant IDs in these collections
        const variantsFromCollections = await getProductVariantIdsFromCollections(collectionIds, session);
        if (variantsFromCollections.length > 0) {
          targets.push({
            productVariant: {
              productVariantIds: variantsFromCollections
            }
          });
        }
      }

      // Build metafields for function configuration
      const metafields = [
        {
          namespace: "default",
          key: "function-configuration",
          type: "json",
          value: JSON.stringify({
            discounts: [
              {
                value: discountType === "percentage"
                  ? { percentage: Number(percentageValue) }
                  : { fixedAmount: { amount: Number(fixedAmount) } },
                targets
              }
            ],
            discountApplicationStrategy: "FIRST"
          })
        }
      ];

      const mutation = `
        mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
          discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
            codeAppDiscount {
              discountId
              title
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        codeAppDiscount: {
          code,
          title: name,
          functionId: process.env.SHOPIFY_FUNCTION_ID, // Set your functionId in env
          appliesOncePerCustomer: true,
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true
          },
          startsAt: new Date().toISOString(),
          endsAt: endDate ? new Date(endDate).toISOString() : undefined,
          usageLimit: 1,
          metafields
        }
      };

      const data = await client.query({
        data: {
          query: mutation,
          variables
        }
      });

      const userErrors = data.body.data.discountCodeAppCreate.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.error("Shopify discount creation errors:", userErrors);
        // Optionally: handle error, rollback, or notify user
      } else {
        // Optionally: store discountId in your coupon for future reference
        newCoupon.shopifyDiscountId = data.body.data.discountCodeAppCreate.codeAppDiscount.discountId;
        await newCoupon.save();
      }
    } catch (e) {
      console.error("Failed to create Shopify App Discount:", e);
      // Optionally: handle error, rollback, or notify user
    }
    // --- End Shopify App Discount creation ---

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon: newCoupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating coupon',
      error: error.message
    });
  }
};

/**
 * Edit an existing coupon
 */
export const editCoupon = async (req, res) => {
  try {
    // Get shop from session or query parameter
    const session = res.locals.shopify.session;

    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    
    if (!shop) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop identifier not found' 
      });
    }
    
    const couponId = req.params.id;
    
    if (!couponId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coupon ID is required' 
      });
    }
    
    const {
      name,
      discountType,
      percentageValue,
      fixedAmount,
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
      endDate,
      isActive,
      productIds,
      collectionIds
    } = req.body;
    
    // Find the coupon by ID and ensure it belongs to this shop
    const coupon = await Coupon.findOne({ _id: couponId, shop });
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found or does not belong to this shop'
      });
    }
    
    // Update coupon fields
    if (name) coupon.name = name;
    
    if (discountType) {
      coupon.discountType = discountType;
      if (discountType === 'percentage') {
        coupon.percentageValue = percentageValue;
        coupon.fixedAmount = undefined;
      } else if (discountType === 'fixed') {
        coupon.fixedAmount = fixedAmount;
        coupon.percentageValue = undefined;
      }
    }
    
    // Update sender settings
    if (senderRequireMinPurchase !== undefined) coupon.senderRequireMinPurchase = senderRequireMinPurchase;
    if (senderMinPurchaseAmount !== undefined) coupon.senderMinPurchaseAmount = senderMinPurchaseAmount;
    if (senderTimesPerUser !== undefined) coupon.senderTimesPerUser = senderTimesPerUser;
    if (senderTimesValue !== undefined) coupon.senderTimesValue = senderTimesValue;
    if (senderNewCustomersOnly !== undefined) coupon.senderNewCustomersOnly = senderNewCustomersOnly;
    
    // Update recipient settings
    if (recipientRequireMinPurchase !== undefined) coupon.recipientRequireMinPurchase = recipientRequireMinPurchase;
    if (recipientMinPurchaseAmount !== undefined) coupon.recipientMinPurchaseAmount = recipientMinPurchaseAmount;
    if (recipientTimesPerUser !== undefined) coupon.recipientTimesPerUser = recipientTimesPerUser;
    if (recipientTimesValue !== undefined) coupon.recipientTimesValue = recipientTimesValue;
    if (recipientNewCustomersOnly !== undefined) coupon.recipientNewCustomersOnly = recipientNewCustomersOnly;
    
    // Update sharing options
    if (shareWhatsapp !== undefined) coupon.shareWhatsapp = shareWhatsapp;
    if (shareMessenger !== undefined) coupon.shareMessenger = shareMessenger;
    if (shareEmail !== undefined) coupon.shareEmail = shareEmail;
    
    // Update other fields
    if (selectedProduct) coupon.productId = selectedProduct;
    if (customMessage !== undefined) coupon.customMessage = customMessage;
    if (endDate) coupon.endDate = endDate;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (productIds) coupon.productIds = productIds;
    if (collectionIds) coupon.collectionIds = collectionIds;
    
    // Save the updated coupon
    await coupon.save();
    
    if (coupon.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });
    
        // Build targets array
        let targets = [];
        if (productIds && productIds.length > 0) {
          targets.push({
            productVariant: {
              productVariantIds: productIds.map(id => `gid://shopify/ProductVariant/${id}`)
            }
          });
        }

        // Fetch product variants for selected collections
        if (collectionIds && collectionIds.length > 0) {
          // You need to implement this: fetch all product variant IDs in these collections
          const variantsFromCollections = await getProductVariantIdsFromCollections(collectionIds, session);
          if (variantsFromCollections.length > 0) {
            targets.push({
              productVariant: {
                productVariantIds: variantsFromCollections
              }
            });
          }
        }

        // Build metafields for function configuration
        const metafields = [
          {
            namespace: "default",
            key: "function-configuration",
            type: "json",
            value: JSON.stringify({
              discounts: [
                {
                  value: coupon.discountType === "percentage"
                    ? { percentage: Number(coupon.percentageValue) }
                    : { fixedAmount: { amount: Number(coupon.fixedAmount) } },
                  targets
                }
              ],
              discountApplicationStrategy: "FIRST"
            })
          }
        ];
    
        const mutation = `
          mutation discountCodeAppUpdate($codeAppDiscount: DiscountCodeAppInput!, $id: ID!) {
            discountCodeAppUpdate(codeAppDiscount: $codeAppDiscount, id: $id) {
              codeAppDiscount {
                discountId
                title
                endsAt
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
    
        const variables = {
          id: coupon.shopifyDiscountId,
          codeAppDiscount: {
            code: coupon.code,
            title: coupon.name,
            functionId: process.env.SHOPIFY_FUNCTION_ID,
            appliesOncePerCustomer: true,
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true
            },
            startsAt: coupon.createdAt.toISOString(),
            endsAt: coupon.endDate ? new Date(coupon.endDate).toISOString() : undefined,
            usageLimit: 1,
            metafields
          }
        };
    
        const data = await client.query({
          data: {
            query: mutation,
            variables
          }
        });
    
        const userErrors = data.body.data.discountCodeAppUpdate.userErrors;
        if (userErrors && userErrors.length > 0) {
          console.error("Shopify discount update errors:", userErrors);
        }
      } catch (e) {
        console.error("Failed to update Shopify App Discount:", e);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      coupon: {
        id: coupon._id,
        name: coupon.name,
        code: coupon.code,
        discountType: coupon.discountType,
        percentageValue: coupon.percentageValue,
        fixedAmount: coupon.fixedAmount,
        endDate: coupon.endDate,
        isActive: coupon.isActive,
        // Add other fields you want to return
      }
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating coupon',
      error: error.message
    });
  }
};

export const getCoupon = async (req, res) => {
  try {
    // Get shop from session or query parameter
    const session = res.locals.shopify.session;

    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    
    if (!shop) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop identifier not found' 
      });
    }
    
    const couponId = req.params.id;
    
    if (!couponId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coupon ID is required' 
      });
    }
    
    // Find the coupon by ID and ensure it belongs to this shop
    const coupon = await Coupon.findOne({ _id: couponId, shop });
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found or does not belong to this shop'
      });
    }
    
    return res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching coupon',
      error: error.message
    });
  }
}

/**
 * Delete a coupon
 */
export const deleteCoupon = async (req, res) => {
  try {
    // Get shop from session or query parameter
    const session = res.locals.shopify.session;

    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    
    if (!shop) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop identifier not found' 
      });
    }
    
    const couponId = req.params.id;
    
    if (!couponId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coupon ID is required' 
      });
    }
    
    // Find and delete the coupon, ensuring it belongs to this shop
    const deletedCoupon = await Coupon.findOneAndDelete({ _id: couponId, shop });
    
    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found or does not belong to this shop'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting coupon',
      error: error.message
    });
  }
}

/**
 * Activate a coupon and deactivate all others for the shop
 */
export const activateCoupon = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    if (!shop) {
      return res.status(400).json({ success: false, message: 'Shop identifier not found' });
    }
    const couponId = req.params.id;
    if (!couponId) {
      return res.status(400).json({ success: false, message: 'Coupon ID is required' });
    }

    // Deactivate all coupons for this shop
    await Coupon.updateMany({ shop }, { isActive: false });
    // Activate the selected coupon
    const updated = await Coupon.findOneAndUpdate(
      { _id: couponId, shop },
      { isActive: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Coupon not found or does not belong to this shop' });
    }

    if(updated){
        await Widget.findOneAndUpdate({shop}, {coupon: updated._id}, {new: true});
    }

    // ...after activating the coupon in MongoDB...

    if (updated && updated.shopifyDiscountId) {
      try {
        const client = new shopify.api.clients.Graphql({ session });

        const mutation = `
          mutation discountCodeActivate($id: ID!) {
            discountCodeActivate(id: $id) {
              codeDiscountNode {
                codeDiscount {
                  ... on DiscountCodeApp {
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
          }
        `;

        const variables = {
          id: updated.shopifyDiscountId
        };

        const data = await client.query({
          data: {
            query: mutation,
            variables
          }
        });

        const userErrors = data.body.data.discountCodeActivate.userErrors;
        if (userErrors && userErrors.length > 0) {
          console.error("Shopify discount activation errors:", userErrors);
        }
      } catch (e) {
        console.error("Failed to activate Shopify App Discount:", e);
      }
    }

    return res.status(200).json({ success: true, message: 'Coupon activated', coupon: updated });
  } catch (error) {
    console.error('Error activating coupon:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while activating coupon', error: error.message });
  }
};

// Helper function (pseudo-code)
async function getProductVariantIdsFromCollections(collectionIds, session) {
  // Use Shopify API to fetch products in each collection, then get their variant IDs
  // Return an array of variant GIDs
}