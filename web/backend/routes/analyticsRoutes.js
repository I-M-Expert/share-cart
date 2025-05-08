import express from 'express';
import { recordShareEvent, recordCouponUsage, getDashboardAnalytics, recordPublicCouponUsage } from '../controllers/analyticsController.js';
import shopify from '../../shopify.js';

const router = express.Router();

router.post('/share', recordShareEvent);
router.post('/coupon-usage', recordCouponUsage);
router.post('/public-coupon-usage', recordPublicCouponUsage); // New public endpoint
router.get('/dashboard', shopify.validateAuthenticatedSession(), getDashboardAnalytics);

export default router;