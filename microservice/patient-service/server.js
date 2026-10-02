
const express = require('express');
const cors = require('cors');
const patientRoutes = require('./patients');
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'patient-service' });
});

// Routes
app.use('/api/patients', patientRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Patient service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
