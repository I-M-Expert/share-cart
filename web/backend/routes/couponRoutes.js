import express from 'express';
import {
  createCoupon,
  editCoupon,
  getCoupons,
  getCoupon,
  deleteCoupon,
  activateCoupon,
} from "../controllers/couponsController.js";

const router = express.Router();

router.get('/', getCoupons)
router.get('/:id', getCoupon)
router.post('/', createCoupon)
router.put("/:id", editCoupon);
router.delete('/:id', deleteCoupon)
router.post('/:id/activate', activateCoupon)

export default router;