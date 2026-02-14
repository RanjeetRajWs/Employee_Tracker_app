/**
 * Image Compression Utility
 * Compresses screenshots to reduce storage and bandwidth usage
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Compress an image file
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save compressed image
 * @param {Object} options - Compression options
 * @param {number} options.quality - Quality (1-100, default: 80)
 * @param {number} options.maxWidth - Max width in pixels (default: 1920)
 * @param {number} options.maxHeight - Max height in pixels (default: 1080)
 * @returns {Promise<Object>} Compression results
 */
async function compressImage(inputPath, outputPath, options = {}) {
    const {
        quality = 80,
        maxWidth = 1920,
        maxHeight = 1080
    } = options;

    try {
        const stats = fs.statSync(inputPath);
        const originalSize = stats.size;

        await sharp(inputPath)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .png({ quality, compressionLevel: 9 })
            .toFile(outputPath);

        const newStats = fs.statSync(outputPath);
        const compressedSize = newStats.size;
        const savedBytes = originalSize - compressedSize;
        const savedPercent = ((savedBytes / originalSize) * 100).toFixed(2);

        return {
            success: true,
            originalSize,
            compressedSize,
            savedBytes,
            savedPercent: parseFloat(savedPercent)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Compress image in place (replaces original)
 * @param {string} imagePath - Path to image
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} Compression results
 */
async function compressImageInPlace(imagePath, options = {}) {
    const tempPath = imagePath + '.tmp';

    try {
        const result = await compressImage(imagePath, tempPath, options);

        if (result.success) {
            // Replace original with compressed version
            fs.unlinkSync(imagePath);
            fs.renameSync(tempPath, imagePath);
        }

        return result;
    } catch (error) {
        // Clean up temp file if it exists
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Compress all images in a directory
 * @param {string} dirPath - Directory path
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} Batch compression results
 */
async function compressDirectory(dirPath, options = {}) {
    try {
        const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

        const results = {
            total: files.length,
            compressed: 0,
            failed: 0,
            totalSaved: 0,
            errors: []
        };

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const result = await compressImageInPlace(filePath, options);

            if (result.success) {
                results.compressed++;
                results.totalSaved += result.savedBytes;
            } else {
                results.failed++;
                results.errors.push({ file, error: result.error });
            }
        }

        return results;
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create thumbnail from image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save thumbnail
 * @param {number} size - Thumbnail size (default: 200)
 * @returns {Promise<Object>} Result
 */
async function createThumbnail(inputPath, outputPath, size = 200) {
    try {
        await sharp(inputPath)
            .resize(size, size, {
                fit: 'cover',
                position: 'center'
            })
            .png({ quality: 70 })
            .toFile(outputPath);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    compressImage,
    compressImageInPlace,
    compressDirectory,
    createThumbnail
};
