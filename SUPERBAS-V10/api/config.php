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
define('DB_NAME', 'supy7197_bas');        // Ganti sesuai nama database
define('DB_USER', 'supy7197_basuser');     // Ganti sesuai user database
define('DB_PASS', 'PASSWORD_ANDA');        // Ganti sesuai password

define('UPLOAD_DIR', __DIR__ . '/uploads/absen/');
define('UPLOAD_URL', 'https://super-bas.com/api/uploads/absen/');

// Max photo size (base64 → ~2MB raw = ~2.7MB base64)
define('MAX_PHOTO_SIZE', 3 * 1024 * 1024);

// Allowed origins for CORS
define('ALLOWED_ORIGINS', [
    'https://super-bas.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
]);
