import express from 'express';
import { recordShareEvent, recordCouponUsage, getDashboardAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

router.post('/share', recordShareEvent);
router.post('/coupon-usage', recordCouponUsage);
router.get('/dashboard', getDashboardAnalytics);

export default router;