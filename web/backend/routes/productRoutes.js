import express from 'express';
import { fetchProducts } from '../controllers/productsController.js';


const router = express.Router();


router.get('/', fetchProducts);

export default router