// frontend/my-group-order-app-ui/set-env.js

const fs = require('fs');
require('dotenv').config(); // Untuk bisa membaca variabel dari .env di lokal jika perlu

// Path ke file environment produksi
const targetPath = './src/environments/environment.prod.ts';

// Konten file yang akan ditulis
// Perhatikan: process.env.SUPABASE_URL akan dibaca dari environment variables di Render
const envConfigFile = `export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL}',
    key: '${process.env.SUPABASE_KEY}'
  }
};
`;

// Tulis file tersebut
fs.writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.error(err);
    throw err;
  } else {
    console.log(`Angular environment.prod.ts file generated successfully at ${targetPath}`);
  }
});
