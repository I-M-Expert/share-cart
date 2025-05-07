import express from 'express';
import { recordShareEvent, recordCouponUsage, getDashboardAnalytics } from '../controllers/analyticsController.js';
import shopify from '../../shopify.js';

const router = express.Router();

router.post('/share', recordShareEvent);
router.post('/coupon-usage', shopify.validateAuthenticatedSession(), recordCouponUsage);
router.get('/dashboard', shopify.validateAuthenticatedSession(), getDashboardAnalytics);

export default router;