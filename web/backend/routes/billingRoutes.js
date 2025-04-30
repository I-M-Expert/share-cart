import express from "express";
import {
  confirmSubscription,
  createSubscription,
  getSubscriptions,
  checkSubscriptions,
} from "../controllers/billingController.js";

const router = express.Router();

// Apply the Shopify middleware to attach session data
router.post("/create", createSubscription);
router.get("/confirmation", confirmSubscription);
router.get("/fetch-subscription", getSubscriptions);
router.get("/check-subscription", checkSubscriptions);


export default router;
