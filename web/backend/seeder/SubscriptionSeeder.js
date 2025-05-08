import mongoose from "mongoose";
import Subscription from "../models/Subscription.js";
import * as dotenv from 'dotenv'

dotenv.config()

mongoose.connect(
  process.env.MONGO_URI ||
    "mongodb+srv://emmy:C9AeE7ZGMtpD5gCo@cluster0.w6gzijt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

const subscriptions = [
  {
    id: 0,
    name: "Free",
    amount: 0,
    duration: "monthly",
    description:
      "Everything unlocked. Perfect for high-traffic stores that want maximum reach, unlimited sharing and full power of our software",

    features: [
      "Unlimited Cart Shares",
      "4 Widget locations",
      "Unlimited Live Coupons",
      "Full Widget Customization",
      "24/7 Live Chat Support",
    ],

    permissions: {
      widget: 4,
      cartShares: "unlimited",
      liveCoupons: "unlimited",
      liveChat: true,
    },
  },
  // {
  //   id: 1,
  //   name: "Starter",
  //   amount: 9.99,
  //   duration: "monthly",
  //   description:
  //     "A simle and affordable plan to start sharing carts and boosting conversions - Ideal for new or smaller stores",

  //   features: [
  //     "50 Cart Shares",
  //     "2 Widget locations",
  //     "5 Live Coupons",
  //     "Full Widget Customization",
  //     "24/7 Live Chat Support",
  //   ],

  //   permissions: { widget: 2, cartShares: 50, liveCoupons: 5, liveChat: true },
  // },
  // {
  //   id: 2,
  //   name: "Starter",
  //   amount: 9.99,
  //   duration: "yearly",
  //   description:
  //     "A simle and affordable plan to start sharing carts and boosting conversions - Ideal for new or smaller stores",

  //   features: [
  //     "50 Cart Shares",
  //     "2 Widget locations",
  //     "5 Live Coupons",
  //     "Full Widget Customization",
  //     "24/7 Live Chat Support",
  //   ],

  //   permissions: { widget: 2, cartShares: 50, liveCoupons: 5, liveChat: true },
  // },
  // {
  //   id: 3,
  //   name: "Growth",
  //   amount: 19.99,
  //   duration: "monthly",
  //   description:
  //     "A solid upgrade for stores ready to scale. More flexiblity, more placements and more ways to grow your revenue through social sharing",

  //   features: [
  //     "150 Cart Shares",
  //     "4 Widget locations",
  //     "15 Live Coupons",
  //     "Full Widget Customization",
  //     "24/7 Live Chat Support",
  //   ],

  //   permissions: {
  //     widget: 4,
  //     cartShares: 150,
  //     liveCoupons: 15,
  //     liveChat: true,
  //   },
  // },
  // {
  //   id: 4,
  //   name: "Growth",
  //   amount: 19.99,
  //   duration: "yearly",
  //   description:
  //     "A solid upgrade for stores ready to scale. More flexiblity, more placements and more ways to grow your revenue through social sharing",

  //   features: [
  //     "150 Cart Shares",
  //     "4 Widget locations",
  //     "15 Live Coupons",
  //     "Full Widget Customization",
  //     "24/7 Live Chat Support",
  //   ],

  //   permissions: { widget: 4, cartShares: 150, liveCoupons: 15, liveChat: true },
  // },
  // {
  //   id: 5,
  //   name: "Premium",
  //   amount: 49.99,
  //   duration: "monthly",
  //   description:
  //     "Everything unlocked. Perfect for high-traffic stores that want maximum reach, unlimited sharing and full power of our software",

  //   features: [
  //     "Unlimited Cart Shares",
  //     "4 Widget locations",
  //     "Unlimited Live Coupons",
  //     "Full Widget Customization",
  //     "24/7 Live Chat Support",
  //   ],

  //   permissions: {
  //     widget: 4,
  //     cartShares: "unlimited",
  //     liveCoupons: "unlimited",
  //     liveChat: true,
  //   },
  // },
  // {
  //   id: 6,
  //   name: "Premium",
  //   amount: 49.99,
  //   duration: "yearly",
  //   description:
  //     "Everything unlocked. Perfect for high-traffic stores that want maximum reach, unlimited sharing and full power of our software",

  //   features: [
  //     "Unlimited Cart Shares",
  //     "4 Widget locations",
  //     "Unlimited Live Coupons",
  //     "Full Widget Customization",
  //     "24/7 Live Chat Support",
  //   ],

  //   permissions: {
  //     widget: 4,
  //     cartShares: "unlimited",
  //     liveCoupons: "unlimited",
  //     liveChat: true,
  //   },
  // },
];

const seedDB = async () => {
  await Subscription.deleteMany({});
  await Subscription.insertMany(subscriptions);
  console.log("Database seeded!");
  mongoose.connection.close();
};

seedDB();
