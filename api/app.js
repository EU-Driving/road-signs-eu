const path = require('path');
const express = require('express');
const cors = require('cors');

const itemsRoutes = require('./routes/items.routes');
const signsRoutes = require('./routes/signs.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/countries', express.static(path.join(__dirname, '..', 'countries')));

app.use('/api/items', itemsRoutes);
app.use('/api/signs', signsRoutes);

app.get('/favicon.ico', (req, res) => res.status(204).end());

const websiteDir = path.join(__dirname, '..', 'website');
app.get('/', (req, res) => res.sendFile(path.join(websiteDir, 'index.html')));
app.use(express.static(websiteDir));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;
