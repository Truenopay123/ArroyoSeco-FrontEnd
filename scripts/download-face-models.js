/**
 * Script para descargar los modelos de face-api.js necesarios para
 * reconocimiento facial (2FA). Ejecutar con: node scripts/download-face-models.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'assets', 'face-models');

// Modelos necesarios: detección de rostro (SSD) + landmarks + reconocimiento
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

(async () => {
  for (const file of FILES) {
    const dest = path.join(MODELS_DIR, file);
    if (fs.existsSync(dest)) {
      console.log(`✓ Ya existe: ${file}`);
      continue;
    }
    console.log(`⬇ Descargando: ${file}...`);
    try {
      await download(`${BASE_URL}/${file}`, dest);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ Error descargando ${file}:`, err.message);
    }
  }
  console.log('\n✅ Modelos listos en public/assets/face-models/');
})();
