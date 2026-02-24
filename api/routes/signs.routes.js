const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getByCategory,
  getByReference,
  getCategories,
  patchDeclinationName
} = require('../controllers/signs.controller');
const {
  getComposite,
  getAllComposites,
  putComposite,
  deleteComposite,
  getCountryImages,
  uploadImage
} = require('../controllers/composite.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/signs/categories - Liste des catégories
router.get('/categories', getCategories);

// GET /api/signs/composite/all - Tous les composites (pour le tableau)
router.get('/composite/all', getAllComposites);

// GET /api/signs/composite?country=de&reference=DE-103-10
router.get('/composite', getComposite);

// PUT /api/signs/composite - Créer ou mettre à jour un composite
router.put('/composite', putComposite);

// DELETE /api/signs/composite?country=de&reference=DE-103-10
router.delete('/composite', deleteComposite);

// GET /api/signs/country-images?country=de - Liste des images du pays
router.get('/country-images', getCountryImages);

// POST /api/signs/upload-image - Upload image (multipart: country, reference, file)
router.post('/upload-image', upload.single('file'), uploadImage);

// PATCH /api/signs/declination-name - Modifier le nom d'affichage d'une déclinaison
router.patch('/declination-name', patchDeclinationName);

// GET /api/signs?category=VIENNA-A - Contenu d'une catégorie
router.get('/', (req, res) => {
  if (req.query.category) {
    return getByCategory(req, res);
  }
  if (req.query.reference) {
    return getByReference(req, res);
  }
  return res.status(400).json({
    success: false,
    message: 'Specify "category" or "reference" (e.g. ?category=VIENNA-A or ?reference=OTHER-S1)'
  });
});

module.exports = router;
