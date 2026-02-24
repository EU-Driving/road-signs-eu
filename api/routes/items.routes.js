const express = require('express');
const router = express.Router();
const { getItems, createItem } = require('../controllers/items.controller');

// GET /api/items - Récupérer tous les items
router.get('/', getItems);

// POST /api/items - Créer un nouvel item
router.post('/', createItem);
// TODO: Ajouter les routes pour les autres endpoints

module.exports = router;

