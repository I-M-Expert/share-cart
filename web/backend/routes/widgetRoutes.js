import express from 'express';
import { fetchWidget, createOrUpdateWidget } from '../controllers/widgetController.js';

const router = express.Router();

router.get('/', fetchWidget);
router.post('/', createOrUpdateWidget);

export default router;