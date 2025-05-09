import express from 'express';
import { recordShareEvent, recordCouponUsage, getDashboardAnalytics, recordPublicCouponUsage, getCouponActivities } from '../controllers/analyticsController.js';
import shopify from '../../shopify.js';

const router = express.Router();

router.post('/share', recordShareEvent);
router.post('/coupon-usage', recordCouponUsage);
router.post('/public-coupon-usage', recordPublicCouponUsage); // New public endpoint
router.get('/dashboard', shopify.validateAuthenticatedSession(), getDashboardAnalytics);
router.get(
  "/coupon-activities",
  shopify.validateAuthenticatedSession(),
  getCouponActivities
);

export default router;