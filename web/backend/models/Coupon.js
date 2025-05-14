import mongoose from "mongoose";

const couponSchema = mongoose.Schema({
  shop: { type: String, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  
  // Discount details
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  percentageValue: { type: Number, min: 0, max: 100 },
  fixedAmount: { type: Number, min: 0 },
  
  // Sender Eligibility
  senderRequireMinPurchase: { type: Boolean, default: false },
  senderMinPurchaseAmount: { type: Number, min: 0 },
  senderTimesPerUser: { type: Boolean, default: false },
  senderTimesValue: { type: Number, min: 0 },
  senderNewCustomersOnly: { type: Boolean, default: false },
  
  // Recipient Eligibility
  recipientRequireMinPurchase: { type: Boolean, default: false },
  recipientMinPurchaseAmount: { type: Number, min: 0 },
  recipientTimesPerUser: { type: Boolean, default: false },
  recipientTimesValue: { type: Number, min: 0 },
  recipientNewCustomersOnly: { type: Boolean, default: false },
  
  // Sharing platforms
  shareWhatsapp: { type: Boolean, default: true },
  shareMessenger: { type: Boolean, default: true },
  shareEmail: { type: Boolean, default: true },
  
  // Product assignment
  productId: { type: String },
  productType: { type: String },
  
  // Product and collection assignment
  productIds: [{ type: String }],
  collectionIds: [{ type: String }],
  
  // Shopify Discount ID
  shopifyDiscountId: { type: String },
  
  // Message customization
  customMessage: { type: String },
  
  // Statistics
  sentCount: { type: Number, default: 0 },
  convertedCount: { type: Number, default: 0 },
  usedBy: [{ 
    customerId: String,
    customerName: String,
    usedAt: Date
  }],
  
  // Validity
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Coupon", couponSchema);