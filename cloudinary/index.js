const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

// Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'SCU',
        allowedFormats: ['jpeg', 'png', 'jpg', 'pdf', 'docx', 'txt', 'pptx'], // Allowed file formats (add any other types you need)
        maxFileSize: 10 * 1024 * 1024, // Max file size 10MB
    }
    
});

// Multer upload configuration
const upload = multer({ storage });

module.exports = {
    cloudinary,
    storage,
    upload
};
