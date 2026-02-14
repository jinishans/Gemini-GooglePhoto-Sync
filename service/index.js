const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React dist folder
const buildPath = path.join(__dirname, '../dist');
app.use(express.static(buildPath));

// API Endpoint Placeholder for Service Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'running', mode: 'windows-service' });
});

// Catch-all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Gemini Photo Sync Service running on port ${PORT}`);
});