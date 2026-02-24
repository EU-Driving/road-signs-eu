const { getDB } = require('../config/database');

// GET - Récupérer tous les items
exports.getItems = async (req, res) => {
  try {
    const db = getDB();
    const items = await db.collection('items').find().toArray();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des items',
      error: error.message
    });
  }
};

// POST - Créer un nouvel item
exports.createItem = async (req, res) => {
  try {
    const db = getDB();
    const result = await db.collection('items').insertOne(req.body);
    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        ...req.body
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la création de l\'item',
      error: error.message
    });
  }
};

