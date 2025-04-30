import mongoose from "mongoose";

const UserSubscriptionSchema = new mongoose.Schema({
  shop: String,
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
  status: String,
  startDate: Date,
  endDate: Date,
  chargeId: String,
  trialEndDate : Date,
}, {timestamps: true});

export default mongoose.model("UserSubscription", UserSubscriptionSchema);
