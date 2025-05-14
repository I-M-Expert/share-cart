import express from 'express';
import {
  createCoupon,
  editCoupon,
  getCoupons,
  getCoupon,
  deleteCoupon,
  activateCoupon,
  recordCouponClick,
} from "../controllers/couponsController.js";
import shopify from '../../shopify.js';

const router = express.Router();

router.get('/', shopify.validateAuthenticatedSession(), getCoupons)
router.get('/:id', shopify.validateAuthenticatedSession(), getCoupon)
router.post('/', shopify.validateAuthenticatedSession(), createCoupon)
router.put("/:id", shopify.validateAuthenticatedSession(), editCoupon);
router.delete('/:id', shopify.validateAuthenticatedSession(), deleteCoupon)
router.post('/:id/activate', shopify.validateAuthenticatedSession(), activateCoupon)
router.post('/:code/click', recordCouponClick);

export default router;