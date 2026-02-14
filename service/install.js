const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'GeminiPhotoSync',
  description: 'Background service for Gemini Smart Photo Sync App.',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function(){
  console.log('Service installed successfully!');
  svc.start();
});

svc.install();
