<?php
/**
 * BAS Recruitment — Lightweight Web Push Sender (VAPID + AES128GCM / no-payload fallback)
 * Compatible with PHP 7.4+, no Composer dependencies.
 *
 * Supports two modes:
 *   1. Encrypted payload (when p256dh + auth are available)
 *   2. Signal-only (Content-Length: 0, SW fetches content from API)
 */
class WebPushSender {
    private $publicKey;
    private $privateKeyPem;
    private $subject;

    public function __construct($publicKey, $privateKeyPem, $subject) {
        $this->publicKey      = $publicKey;
        $this->privateKeyPem  = $privateKeyPem;
        $this->subject        = $subject;
    }

    /**
     * Send a push notification, optionally with a JSON payload.
     *
     * @param string $endpoint   The subscription endpoint URL
     * @param string $p256dh     The client's public key (base64url)
     * @param string $authKey    The client's auth secret (base64url)
     * @param array|null $payload Optional JSON-serializable data to send
     * @return array ['success' => bool, 'status' => int, 'reason' => string]
     */
    public function send($endpoint, $p256dh = '', $authKey = '', $payload = null) {
        $parsed   = parse_url($endpoint);
        $audience = $parsed['scheme'] . '://' . $parsed['host'];
        $jwt      = $this->createVapidJwt($audience);

        $headers = [
            'Authorization: vapid t=' . $jwt . ', k=' . $this->publicKey,
            'TTL: 86400',
            'Urgency: high',
        ];

        $body = '';

        if ($payload !== null && $p256dh && $authKey) {
            // Attempt encrypted payload
            $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $encrypted = $this->encrypt($payloadJson, $p256dh, $authKey);
            if ($encrypted !== false) {
                $body = $encrypted;
                $headers[] = 'Content-Type: application/octet-stream';
                $headers[] = 'Content-Encoding: aes128gcm';
                $headers[] = 'Content-Length: ' . strlen($body);
            } else {
                // Encryption failed — fallback to signal-only
                $headers[] = 'Content-Length: 0';
            }
        } else {
            // No payload or no keys — signal-only
            $headers[] = 'Content-Length: 0';
        }

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $respBody = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err      = curl_error($ch);
        unset($ch);

        if ($err) return ['success' => false, 'status' => 0, 'reason' => $err];

        return [
            'success' => ($status >= 200 && $status < 300),
            'status'  => $status,
            'reason'  => $respBody ?: ($status == 410 ? 'subscription expired' : 'ok')
        ];
    }

    /**
     * Encrypt payload using aes128gcm content encoding (RFC 8291 / RFC 8188).
     */
    private function encrypt($payload, $userPublicKeyB64, $userAuthB64) {
        // Decode client keys
        $userPublicKey = $this->base64urlDecode($userPublicKeyB64);
        $userAuth      = $this->base64urlDecode($userAuthB64);

        if (strlen($userPublicKey) !== 65 || strlen($userAuth) !== 16) {
            return false;
        }

        // Generate server ECDH key pair
        $serverKey = openssl_pkey_new([
            'curve_name'       => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        if (!$serverKey) return false;

        $serverKeyDetails = openssl_pkey_get_details($serverKey);
        $serverPublicKey  = $this->exportUncompressedPoint($serverKeyDetails);

        // Compute shared secret via ECDH
        $sharedSecret = $this->computeECDH($serverKey, $userPublicKey);
        if ($sharedSecret === false) return false;

        // Generate 16-byte salt
        $salt = random_bytes(16);

        // Derive keys using HKDF (RFC 8291)
        // IKM = HKDF(auth_secret, shared_secret, "WebPush: info\0" || client_pub || server_pub, 32)
        $infoContext = "WebPush: info\0" . $userPublicKey . $serverPublicKey;
        $ikm = $this->hkdf($userAuth, $sharedSecret, $infoContext, 32);

        // PRK = HKDF-Extract(salt, IKM)
        $prk = hash_hmac('sha256', $ikm, $salt, true);

        // Content Encryption Key: HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
        $cekInfo = "Content-Encoding: aes128gcm\0";
        $cek = $this->hkdfExpand($prk, $cekInfo, 16);

        // Nonce: HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
        $nonceInfo = "Content-Encoding: nonce\0";
        $nonce = $this->hkdfExpand($prk, $nonceInfo, 12);

        // Pad payload (add delimiter \x02 for last record)
        $paddedPayload = $payload . "\x02";

        // Encrypt with AES-128-GCM
        $tag = '';
        $encrypted = openssl_encrypt($paddedPayload, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
        if ($encrypted === false) return false;

        // Build aes128gcm header:
        // salt (16) || rs (4 bytes, big-endian) || idlen (1) || keyid (65 = server public key)
        $rs = pack('N', 4096);
        $idlen = chr(65);
        $header = $salt . $rs . $idlen . $serverPublicKey;

        return $header . $encrypted . $tag;
    }

    /**
     * Export the uncompressed EC public key point (65 bytes: 0x04 || x || y).
     */
    private function exportUncompressedPoint($keyDetails) {
        $x = str_pad($keyDetails['ec']['x'], 32, "\0", STR_PAD_LEFT);
        $y = str_pad($keyDetails['ec']['y'], 32, "\0", STR_PAD_LEFT);
        return "\x04" . $x . $y;
    }

    /**
     * Compute ECDH shared secret.
     */
    private function computeECDH($serverPrivateKey, $clientPublicKeyRaw) {
        // Build a PEM public key from the raw point for openssl
        $derPrefix = hex2bin(
            '3059301306072a8648ce3d020106082a8648ce3d030107034200'
        );
        $der = $derPrefix . $clientPublicKeyRaw;
        $pem = "-----BEGIN PUBLIC KEY-----\n" . base64_encode($der) . "\n-----END PUBLIC KEY-----";

        $clientKey = openssl_pkey_get_public($pem);
        if (!$clientKey) return false;

        $shared = '';
        $ok = openssl_pkey_derive($serverPrivateKey, $clientKey, $shared);
        return $ok ? $shared : false;
    }

    /**
     * HKDF (extract + expand) — simplified for Web Push.
     */
    private function hkdf($salt, $ikm, $info, $length) {
        $prk = hash_hmac('sha256', $ikm, $salt, true);
        return $this->hkdfExpand($prk, $info, $length);
    }

    private function hkdfExpand($prk, $info, $length) {
        $t = '';
        $output = '';
        for ($i = 1; strlen($output) < $length; $i++) {
            $t = hash_hmac('sha256', $t . $info . chr($i), $prk, true);
            $output .= $t;
        }
        return substr($output, 0, $length);
    }

    /**
     * Create a VAPID JWT token signed with ES256.
     */
    private function createVapidJwt($audience) {
        $header  = $this->base64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $payload = $this->base64url(json_encode([
            'aud' => $audience,
            'exp' => time() + 86400,
            'sub' => $this->subject,
        ]));

        $input = $header . '.' . $payload;

        $key = openssl_pkey_get_private($this->privateKeyPem);
        if (!$key) throw new RuntimeException('Invalid VAPID private key');

        openssl_sign($input, $derSig, $key, OPENSSL_ALGO_SHA256);
        $rawSig = $this->derToRaw($derSig);

        return $input . '.' . $this->base64url($rawSig);
    }

    /**
     * Convert DER-encoded ECDSA signature to raw r||s (64 bytes).
     */
    private function derToRaw($der) {
        $pos = 2;
        $rLen = ord($der[$pos + 1]);
        $r = substr($der, $pos + 2, $rLen);
        $pos += 2 + $rLen;
        $sLen = ord($der[$pos + 1]);
        $s = substr($der, $pos + 2, $sLen);
        $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
        return $r . $s;
    }

    private function base64url($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64urlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
