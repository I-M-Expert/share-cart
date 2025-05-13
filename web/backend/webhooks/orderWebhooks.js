import { CouponUsage } from '../models/Analytics.js';
import Coupon from '../models/Coupon.js';
import Share from '../models/Share.js'; // Add this import

export const orderCreatedHandler = async (topic, shop, webhookRequestBody) => {
  try {
    const order = JSON.parse(webhookRequestBody);
    console.log(`Processing order ${order.id} for shop ${shop}`);
    
    // Check if the order used one of our discount codes
    if (order.discount_codes && order.discount_codes.length > 0) {
      console.log(`Order has ${order.discount_codes.length} discount codes`);
      
      for (const discountCode of order.discount_codes) {
        console.log(`Looking up discount code: ${discountCode.code}`);
        
        const coupon = await Coupon.findOne({ 
          shop, 
          code: discountCode.code.toUpperCase() 
        });
        
        console.log("Received order webhook:", order.id, order.discount_codes);

        if (coupon) {
          console.log(`Found matching coupon in our database: ${coupon.code}`);
          console.log("Matched coupon:", coupon.code, "for shop:", shop);
          
          // Get customer email for better tracking
          const customerEmail = order.customer ? order.customer.email : null;
          
          // First, calculate the values
          const orderValue = parseFloat(order.total_price) / 100;
          const discountAmount = parseFloat(order.total_discounts) / 100;

          console.log("Order value:", orderValue, "Discount amount:", discountAmount);

          // Then determine user type and update the share record
          let userType = 'unknown';
          
          if (customerEmail) {
            const shareRecord = await Share.findOne({
              couponCode: coupon.code,
              $or: [
                { senderEmail: customerEmail },
                { recipientEmail: customerEmail }
              ]
            });
            
            if (shareRecord) {
              userType = shareRecord.senderEmail === customerEmail ? 'sender' : 'recipient';
              
              // Now update the Share record with the correctly defined orderValue
              await Share.findByIdAndUpdate(shareRecord._id, {
                $set: {
                  converted: true,
                  conversionDate: new Date(),
                  orderId: order.id,
                  orderValue: orderValue
                }
              });
              
              console.log(`Updated Share record ${shareRecord._id} with conversion data`);
            } else {
              // Fallback to the existing logic based on order count
              userType = order.customer && order.customer.orders_count <= 1 ? 'recipient' : 'sender';
            }
          } else {
            // Fallback if no email is available
            userType = order.customer && order.customer.orders_count <= 1 ? 'recipient' : 'sender';
          }
          
          console.log(`Recording usage for ${userType} with order value: ${orderValue}`);
          
          // Record the coupon usage with revenue data
          await CouponUsage.create({
            shop,
            couponId: coupon._id,
            couponCode: coupon.code,
            userType,
            orderValue: orderValue,
            discountAmount: discountAmount,
            customerId: order.customer ? order.customer.id : null,
            customerName: order.customer ? 
                         `${order.customer.first_name} ${order.customer.last_name}`.trim() : 
                         'Guest',
            timestamp: new Date() // Make sure timestamp is explicitly set
          });

          console.log("CouponUsage created for order:", order.id);
          
          // Update coupon usage statistics including revenue information
          await Coupon.findByIdAndUpdate(coupon._id, {
            $inc: { convertedCount: 1, totalRevenue: orderValue },
            $push: { 
              usedBy: {
                customerId: order.customer ? order.customer.id : null,
                customerEmail: customerEmail,
                customerName: order.customer ? 
                            `${order.customer.first_name} ${order.customer.last_name}`.trim() : 
                            'Guest',
                orderValue: orderValue,
                usedAt: new Date()
              }
            }
          });
          
          console.log(`Successfully recorded coupon usage with revenue: $${orderValue}`);
        } else {
          console.warn("No matching coupon found for code:", discountCode.code, "in shop:", shop);
        }
      }
    }
  } catch (error) {
    console.error('Error processing order webhook:', error);
  }
};

export const orderFulfilledHandler = async (topic, shop, webhookRequestBody) => {
  try {
    const order = JSON.parse(webhookRequestBody);
    console.log(`Processing fulfillment for order ${order.id} for shop ${shop}`);

    if (order.discount_codes && order.discount_codes.length > 0) {
      for (const discountCode of order.discount_codes) {
        const coupon = await Coupon.findOne({
          shop,
          code: discountCode.code.toUpperCase(),
        });

        if (coupon) {
          // Only increment on fulfillment
          await Coupon.findByIdAndUpdate(coupon._id, {
            $inc: { convertedCount: 1 },
            $push: {
              usedBy: {
                customerId: order.customer ? order.customer.id : null,
                customerEmail: order.customer ? order.customer.email : null,
                customerName: order.customer
                  ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
                  : "Guest",
                orderValue: order.total_price,
                usedAt: new Date(),
                fulfilled: true,
              },
            },
          });
          console.log(`Incremented convertedCount for coupon ${coupon.code} on fulfillment`);
        }
      }
    }
  } catch (error) {
    console.error("Error processing order fulfillment webhook:", error);
  }
};