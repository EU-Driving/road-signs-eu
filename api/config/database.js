const { MongoClient } = require('mongodb');

let db = null;

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️  MONGODB_URI non défini - mode développement sans base de données');
    return;
  }
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    db = client.db();
    console.log('✅ MongoDB connecté avec succès');
  } catch (error) {
    console.error('⚠️  Erreur de connexion à MongoDB:', error.message);
    console.log('   Fonctionnalités de base disponibles sans base de données');
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = { connectDB, getDB };

