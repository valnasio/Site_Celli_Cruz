const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Otimizar imagens para WebP e diferentes tamanhos
async function optimizeImages() {
  const assetsDir = path.join(__dirname, 'assets');
  const uploadsDir = path.join(assetsDir, 'uploads');

  // Otimizar logo
  const logoPath = path.join(assetsDir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    await sharp(logoPath)
      .webp({ quality: 85 })
      .toFile(path.join(assetsDir, 'logo.webp'));

    console.log('✅ Logo otimizado para WebP');
  }

  // Otimizar uploads
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const ext = path.extname(file).toLowerCase();

      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const webpPath = path.join(uploadsDir, path.basename(file, ext) + '.webp');

        await sharp(filePath)
          .webp({ quality: 80 })
          .toFile(webpPath);

        console.log(`✅ ${file} otimizado para WebP`);
      }
    }
  }
}

optimizeImages().catch(console.error);