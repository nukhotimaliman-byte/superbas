<?php
/**
 * Database Configuration — BAS SUPERBAS V10
 * 
 * INSTRUKSI:
 * 1. Login ke cPanel → MySQL Databases
 * 2. Buat database baru, misal: supy7197_bas
 * 3. Buat user baru, misal: supy7197_basuser 
 * 4. Assign user ke database dengan ALL PRIVILEGES
 * 5. Update nilai di bawah ini
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'dailyworker_db'); // Database khusus Daily Worker
define('DB_USER', 'owner');
define('DB_PASS', 'Asik123asik');

define('UPLOAD_DIR', __DIR__ . '/uploads/absen/');
// Upload tuning for mobile photo attendance.
define('MAX_PHOTO_SIZE', 2500 * 1024);
define('PHOTO_MAX_DIMENSION', 960);
define('PHOTO_JPEG_QUALITY', 82);
define('PHOTO_MIN_JPEG_QUALITY', 68);
define('PHOTO_TARGET_BYTES', 350 * 1024);
define('PHOTO_LIST_DEFAULT_LIMIT', 24);
define('PHOTO_LIST_MAX_LIMIT', 60);

// Allowed origins for CORS
define('ALLOWED_ORIGINS', [
    'https://super-bas.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
]);
