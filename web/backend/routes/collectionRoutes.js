import express from 'express';
import { fetchCollections } from "../controllers/collectionsController.js";


const router = express.Router();


router.get('/', fetchCollections);

export default router