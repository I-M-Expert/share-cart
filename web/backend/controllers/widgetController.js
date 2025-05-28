import Widget from "../models/Widget.js";
import shopify from '../../shopify.js';

export const fetchWidget = async (req, res) => {
    const session = res.locals.shopify.session;
    if (!session) {
        return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    if (!shop) {
        return res.status(400).json({ success: false, message: 'Shop identifier not found' });
    }
    const widget = await Widget.findOne({ shop }).sort({ createdAt: -1 }).populate('coupon').lean();

    
    res.status(200).json({
        success: true,
        widget: widget || null,
        shop,
    });
};

export const createOrUpdateWidget = async (req, res) => {
    const session = res.locals.shopify.session;
    if (!session) {
        return res.status(401).json({ error: "Unauthorized - Missing Session" });
    }
    const shop = req.body.shop || session.shop;
    if (!shop) {
        return res.status(400).json({ success: false, message: 'Shop identifier not found' });
    }

    const { display, buttonStyle, text, colors } = req.body;

    let widget = await Widget.findOne({ shop }).populate('coupon');
    if (widget) {
        widget.display = display; // now array
        widget.buttonStyle = buttonStyle;
        widget.text = text;
        widget.colors = colors;
        await widget.save();
    } else {
        widget = await Widget.create({
            shop,
            display, // now array
            buttonStyle,
            text,
            colors,
        });
    }

    // Save to Shopify metafields using GraphQL API
    try {
      const client = new shopify.api.clients.Graphql({ session });
      const shopResponse = await client.request(`
          query {
            shop {
              id
            }
          }
        `);

      // Await population before sending response
      const populatedWidget = await widget.populate("coupon");

      if (!shopResponse?.data?.shop?.id) {
        throw new Error("Failed to get shop ID");
      }

      const shopGid = shopResponse.data.shop.id;

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
              display,
              button_style: buttonStyle,
              text,
              colors,
              coupon: populatedWidget.coupon,
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
        // Optionally log error, but don't block saving
        console.error("Failed to save metafield:", error);
    }

    // Re-fetch and populate after save
    const populatedWidget = await Widget.findById(widget._id).populate('coupon').lean();

    console.log("Populated Widget:", populatedWidget);

    res.status(200).json({
        success: true,
        widget: populatedWidget,
    });
};