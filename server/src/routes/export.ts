import { Router } from 'express';
import { getRestaurantProducts, getRetailProducts } from '../services/dataStore';
import { getRestaurantCsvRows, getRetailCsvRows } from '../utils/deterministic';

const router = Router();

router.get('/restaurant.csv', (_req, res) => {
  const products = getRestaurantProducts();
  if (products.length === 0) {
    return res.status(404).json({ error: 'No restaurant products to export' });
  }
  const rows = getRestaurantCsvRows(products);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="restaurant_catalog.csv"');
  return res.send(rows.join('\n'));
});

router.get('/restaurant.json', (_req, res) => {
  const products = getRestaurantProducts();
  if (products.length === 0) {
    return res.status(404).json({ error: 'No restaurant products to export' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="restaurant_catalog.json"');
  return res.json(products);
});

router.get('/retail.csv', (_req, res) => {
  const products = getRetailProducts();
  if (products.length === 0) {
    return res.status(404).json({ error: 'No retail products to export' });
  }
  const rows = getRetailCsvRows(products);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="retail_catalog.csv"');
  return res.send(rows.join('\n'));
});

router.get('/retail.json', (_req, res) => {
  const products = getRetailProducts();
  if (products.length === 0) {
    return res.status(404).json({ error: 'No retail products to export' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="retail_catalog.json"');
  return res.json(products);
});

export default router;
