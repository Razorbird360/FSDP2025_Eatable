import express from 'express';
import { getTables, getTableData } from '../controllers/data.controller.js';

const router = express.Router();

router.get('/tables', getTables);
router.get('/tables/:tableName', getTableData);

export default router;
