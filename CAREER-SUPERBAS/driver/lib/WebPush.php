<?php
/**
 * Lightweight Web Push sender using VAPID (no Composer dependencies).
 * Compatible with PHP 7.4+
 * Sends push signals (Content-Length: 0) — the Service Worker fetches
 * notification content from the API on its own.
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
     * Send a push signal to a subscription endpoint.
     * @return array ['success' => bool, 'status' => int, 'reason' => string]
     */
    public function send($endpoint) {
        $parsed = parse_url($endpoint);
        $audience = $parsed['scheme'] . '://' . $parsed['host'];

        $jwt = $this->createVapidJwt($audience);
        $headers = [
            'Authorization: vapid t=' . $jwt . ', k=' . $this->publicKey,
            'TTL: 86400',
            'Content-Length: 0',
            'Urgency: high',
        ];

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => '',
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($err) return ['success' => false, 'status' => 0, 'reason' => $err];
        // 201 = created (success), 410 = gone (expired subscription)
        return [
            'success' => ($status >= 200 && $status < 300),
            'status'  => $status,
            'reason'  => $body ?: ($status == 410 ? 'subscription expired' : 'ok')
        ];
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
        $pos = 2; // skip 0x30 <len>

        // Read r
        $rLen = ord($der[$pos + 1]);
        $r = substr($der, $pos + 2, $rLen);
        $pos += 2 + $rLen;

        // Read s
        $sLen = ord($der[$pos + 1]);
        $s = substr($der, $pos + 2, $sLen);

        // Pad/trim to 32 bytes each
        $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }

    private function base64url($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
