import { CouponUsage } from '../models/Analytics.js';
import Coupon from '../models/Coupon.js';

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
        
        if (coupon) {
          console.log(`Found matching coupon in our database: ${coupon.code}`);
          
          // Determine if this is a sender or recipient
          const userType = order.customer && 
                          order.customer.orders_count <= 1 ? 
                          'recipient' : 'sender';
          
          console.log(`Recording usage for ${userType} with order value: ${order.total_price/100}`);
          
          // Record the coupon usage
          await CouponUsage.create({
            shop,
            couponId: coupon._id,
            couponCode: coupon.code,
            userType,
            orderValue: order.total_price / 100, // Convert cents to dollars
            discountAmount: order.total_discounts / 100,
            customerId: order.customer ? order.customer.id : null,
            customerName: order.customer ? 
                         `${order.customer.first_name} ${order.customer.last_name}`.trim() : 
                         'Guest'
          });
          
          // Update coupon usage statistics
          await Coupon.findByIdAndUpdate(coupon._id, {
            $inc: { convertedCount: 1 },
            $push: { 
              usedBy: {
                customerId: order.customer ? order.customer.id : null,
                customerName: order.customer ? 
                            `${order.customer.first_name} ${order.customer.last_name}`.trim() : 
                            'Guest',
                usedAt: new Date()
              }
            }
          });
          
          console.log(`Successfully recorded coupon usage for ${coupon.code}`);
        } else {
          console.log(`No matching coupon found for code: ${discountCode.code}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing order webhook:', error);
  }
};