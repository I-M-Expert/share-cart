import mongoose from 'mongoose';

const ShareEventSchema = new mongoose.Schema({
  shop: { type: String, required: true, index: true },
  platform: { type: String, enum: ['whatsapp', 'messenger', 'email'], required: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: { type: String },
  timestamp: { type: Date, default: Date.now },
  cartValue: { type: Number },
  deviceType: { type: String },
  customerId: { type: String },
});

const CouponUsageSchema = new mongoose.Schema({
  shop: { type: String, required: true, index: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: { type: String },
  timestamp: { type: Date, default: Date.now },
  userType: { type: String, enum: ['sender', 'recipient'] },
  orderValue: { type: Number },
  discountAmount: { type: Number },
  customerId: { type: String },
  customerName: { type: String },
});

export const ShareEvent = mongoose.model('ShareEvent', ShareEventSchema);
export const CouponUsage = mongoose.model('CouponUsage', CouponUsageSchema);