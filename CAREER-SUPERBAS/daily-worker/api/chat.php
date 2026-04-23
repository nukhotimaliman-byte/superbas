<?php
/**
 * BAS Recruitment — Chat API
 *
 * Actions:
 *   POST ?action=send              → send text message
 *   POST ?action=upload            → upload file/image + message
 *   GET  ?action=poll&after_id=N   → long poll for new messages
 *   GET  ?action=history           → chat history (paginated)
 *   POST ?action=mark_read         → mark messages as read
 *   GET  ?action=unread            → unread count
 *   GET  ?action=conversations     → admin: list all active chats
 *   GET  ?action=templates         → get chat templates
 *   POST ?action=save_template     → create/update template
 *   POST ?action=delete_template   → delete template
 *   POST ?action=blast             → send message to multiple dw_candidates
 */
require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? '';

// ═══════════════════════════════════════════════════
// SEND TEXT MESSAGE
// ═══════════════════════════════════════════════════
if ($action === 'send' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $candidateId = (int)($data['candidate_id'] ?? 0);
    $message = trim($data['message'] ?? '');
    $lat = $data['latitude'] ?? null;
    $lng = $data['longitude'] ?? null;
    $replyToId = (int)($data['reply_to_id'] ?? 0);
    $msgType = ($lat && $lng) ? 'location' : 'text';

    if (!$candidateId || (!$message && $msgType !== 'location'))
        jsonResponse(['error' => 'candidate_id dan message wajib'], 400);

    // Determine sender
    $sender = getSender();
    if (!$sender) jsonResponse(['error' => 'Unauthorized'], 401);

    // Get reply preview if replying
    $replyPreview = null;
    if ($replyToId > 0) {
        $db = getDB();
        $rp = $db->prepare("SELECT sender_name, message, message_type FROM dw_chat_messages WHERE id = ? AND candidate_id = ?");
        $rp->execute([$replyToId, $candidateId]);
        $replyRow = $rp->fetch();
        if ($replyRow) {
            $replyPreview = json_encode([
                'id' => $replyToId,
                'sender_name' => $replyRow['sender_name'],
                'message' => mb_substr($replyRow['message'] ?? '', 0, 100),
                'message_type' => $replyRow['message_type']
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    $db = $db ?? getDB();
    try {
        $stmt = $db->prepare("INSERT INTO dw_chat_messages 
            (candidate_id, sender_type, sender_id, sender_name, message_type, message, latitude, longitude, reply_to_id, reply_preview) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$candidateId, $sender['type'], $sender['id'], $sender['name'], $msgType, $message, $lat, $lng, $replyToId ?: null, $replyPreview]);
    } catch (PDOException $e) {
        // Fallback: columns might not exist yet
        $stmt = $db->prepare("INSERT INTO dw_chat_messages 
            (candidate_id, sender_type, sender_id, sender_name, message_type, message, latitude, longitude) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$candidateId, $sender['type'], $sender['id'], $sender['name'], $msgType, $message, $lat, $lng]);
    }
    $msgId = $db->lastInsertId();

    // Clear typing status
    try { $db->prepare("DELETE FROM chat_typing WHERE candidate_id = ? AND sender_type = ?")->execute([$candidateId, $sender['type']]); } catch(Exception $e) {}

    // Trigger push notification
    triggerChatPush($candidateId, $sender, $message ?: 'Mengirim lokasi');

    jsonResponse(['ok' => true, 'id' => (int)$msgId, 'created_at' => date('Y-m-d H:i:s')]);
}

// ═══════════════════════════════════════════════════
// UPLOAD FILE/IMAGE
// ═══════════════════════════════════════════════════
if ($action === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $candidateId = (int)($_POST['candidate_id'] ?? 0);
    $message = trim($_POST['message'] ?? '');

    if (!$candidateId) jsonResponse(['error' => 'candidate_id wajib'], 400);
    if (empty($_FILES['file'])) jsonResponse(['error' => 'No file'], 400);

    $sender = getSender();
    if (!$sender) jsonResponse(['error' => 'Unauthorized'], 401);

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK)
        jsonResponse(['error' => 'Upload error: ' . $file['error']], 400);

    if ($file['size'] > 10 * 1024 * 1024)
        jsonResponse(['error' => 'File terlalu besar (max 10MB)'], 400);

    // Security: whitelist allowed extensions
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExts = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','zip','mp4','mp3'];
    if (!in_array($ext, $allowedExts))
        jsonResponse(['error' => 'Tipe file tidak diizinkan'], 400);

    $mime = mime_content_type($file['tmp_name']) ?: $file['type'];
    $isImage = in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    $msgType = $isImage ? 'image' : 'file';

    // Create upload dir
    $uploadDir = __DIR__ . '/../uploads/chat/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    // Generate unique filename
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $safeName = 'chat_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $savePath = $uploadDir . $safeName;
    $savedSize = $file['size'];

    if ($isImage && $mime !== 'image/gif') {
        // Auto-compress image
        $compressed = compressImage($file['tmp_name'], $savePath, $mime, 1200, 75);
        if ($compressed) {
            $savedSize = filesize($savePath);
        } else {
            move_uploaded_file($file['tmp_name'], $savePath);
        }
    } else {
        move_uploaded_file($file['tmp_name'], $savePath);
    }

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO dw_chat_messages 
        (candidate_id, sender_type, sender_id, sender_name, message_type, message, file_path, file_name, file_size, file_mime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $candidateId, $sender['type'], $sender['id'], $sender['name'],
        $msgType, $message, 'uploads/chat/' . $safeName, $file['name'], $savedSize, $mime
    ]);
    $msgId = $db->lastInsertId();

    $label = $isImage ? 'Mengirim foto' : 'Mengirim file: ' . $file['name'];
    triggerChatPush($candidateId, $sender, $message ?: $label);

    jsonResponse([
        'ok' => true,
        'id' => (int)$msgId,
        'file_path' => 'uploads/chat/' . $safeName,
        'file_size' => $savedSize,
        'compressed' => $isImage && $savedSize < $file['size']
    ]);
}

// ═══════════════════════════════════════════════════
// LONG POLL — Wait for new messages
// ═══════════════════════════════════════════════════
if ($action === 'poll') {
    $candidateId = (int)($_GET['candidate_id'] ?? 0);
    $afterId = (int)($_GET['after_id'] ?? 0);

    if (!$candidateId) jsonResponse(['error' => 'candidate_id wajib'], 400);

    $sender = getSender();
    if (!$sender) jsonResponse(['error' => 'Unauthorized'], 401);

    $db = getDB();
    $maxWait = 10; // seconds (safe for shared hosting)
    $interval = 500000; // 500ms in microseconds
    $iterations = $maxWait * 2; // 10s / 0.5s = 20 checks

    for ($i = 0; $i < $iterations; $i++) {
        $stmt = $db->prepare(
            "SELECT * FROM dw_chat_messages 
             WHERE candidate_id = ? AND id > ? 
             ORDER BY id ASC LIMIT 50"
        );
        $stmt->execute([$candidateId, $afterId]);
        $msgs = $stmt->fetchAll();

        if (!empty($msgs)) {
            // Check typing status of other party
            $otherType = $sender['type'] === 'user' ? 'admin' : 'user';
            $typing = false;
            try {
                $ts = $db->prepare("SELECT updated_at FROM chat_typing WHERE candidate_id = ? AND sender_type = ?");
                $ts->execute([$candidateId, $otherType]);
                $tRow = $ts->fetch();
                if ($tRow && (time() - strtotime($tRow['updated_at'])) < 5) $typing = true;
            } catch(Exception $e) {}
            jsonResponse(['messages' => $msgs, 'typing' => $typing]);
        }

        if ($i < $iterations - 1) {
            usleep($interval);
        }

        // Check if client disconnected
        if (connection_aborted()) exit;
    }

    // Timeout — check typing one last time
    $otherType = $sender['type'] === 'user' ? 'admin' : 'user';
    $typing = false;
    try {
        $ts = $db->prepare("SELECT updated_at FROM chat_typing WHERE candidate_id = ? AND sender_type = ?");
        $ts->execute([$candidateId, $otherType]);
        $tRow = $ts->fetch();
        if ($tRow && (time() - strtotime($tRow['updated_at'])) < 5) $typing = true;
    } catch(Exception $e) {}
    jsonResponse(['messages' => [], 'timeout' => true, 'typing' => $typing]);
}

// ═══════════════════════════════════════════════════
// HISTORY — Paginated chat history
// ═══════════════════════════════════════════════════
if ($action === 'history') {
    $candidateId = (int)($_GET['candidate_id'] ?? 0);
    $beforeId = (int)($_GET['before_id'] ?? 0);
    $limit = min((int)($_GET['limit'] ?? 50), 100);

    if (!$candidateId) jsonResponse(['error' => 'candidate_id wajib'], 400);

    $sender = getSender();
    if (!$sender) jsonResponse(['error' => 'Unauthorized'], 401);

    $db = getDB();

    if ($beforeId > 0) {
        $stmt = $db->prepare(
            "SELECT * FROM dw_chat_messages WHERE candidate_id = ? AND id < ? ORDER BY id DESC LIMIT ?"
        );
        $stmt->execute([$candidateId, $beforeId, $limit]);
    } else {
        $stmt = $db->prepare(
            "SELECT * FROM dw_chat_messages WHERE candidate_id = ? ORDER BY id DESC LIMIT ?"
        );
        $stmt->execute([$candidateId, $limit]);
    }

    $msgs = array_reverse($stmt->fetchAll());
    $hasMore = count($msgs) === $limit;

    jsonResponse(['messages' => $msgs, 'has_more' => $hasMore]);
}

// ═══════════════════════════════════════════════════
// MARK READ
// ═══════════════════════════════════════════════════
if ($action === 'mark_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $candidateId = (int)($data['candidate_id'] ?? 0);

    $sender = getSender();
    if (!$sender) jsonResponse(['error' => 'Unauthorized'], 401);

    $db = getDB();
    // Mark messages FROM the other side as read
    $otherType = $sender['type'] === 'user' ? 'admin' : 'user';
    $db->prepare(
        "UPDATE dw_chat_messages SET is_read = 1 WHERE candidate_id = ? AND sender_type = ? AND is_read = 0"
    )->execute([$candidateId, $otherType]);

    jsonResponse(['ok' => true]);
}



// ═══════════════════════════════════════════════════
// CONVERSATIONS (Admin only)
// ═══════════════════════════════════════════════════
if ($action === 'conversations') {
    $admin = requireAuth();

    $db = getDB();
    $search = trim($_GET['search'] ?? '');

    $sql = "SELECT 
                cm.candidate_id,
                c.name as candidate_name,
                c.whatsapp,
                c.status,
                c.sim_type,
                c.provinsi,
                c.kabupaten,
                c.kecamatan,
                c.armada_type,
                COALESCE(l.name, '') as location_name,
                MAX(cm.id) as last_msg_id,
                MAX(cm.created_at) as last_msg_time,
                (SELECT message FROM dw_chat_messages WHERE id = MAX(cm.id)) as last_message,
                (SELECT sender_type FROM dw_chat_messages WHERE id = MAX(cm.id)) as last_sender_type,
                (SELECT message_type FROM dw_chat_messages WHERE id = MAX(cm.id)) as last_msg_type,
                SUM(CASE WHEN cm.sender_type = 'user' AND cm.is_read = 0 THEN 1 ELSE 0 END) as unread_count
            FROM dw_chat_messages cm
            JOIN dw_candidates c ON c.id = cm.candidate_id
            LEFT JOIN dw_locations l ON l.id = c.location_id";

    $params = [];
    if ($search) {
        $sql .= " WHERE c.name LIKE ?";
        $params[] = "%$search%";
    }

    // Korlap: only their location
    if ($admin['role'] === 'korlap' && $admin['location_id']) {
        $sql .= ($search ? " AND" : " WHERE") . " c.location_id = ?";
        $params[] = $admin['location_id'];
    }

    $sql .= " GROUP BY cm.candidate_id ORDER BY last_msg_id DESC LIMIT 100";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['conversations' => $stmt->fetchAll()]);
}

// ═══════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════
if ($action === 'templates') {
    $admin = requireAuth();
    $db = getDB();
    $stmt = $db->prepare(
        "SELECT * FROM dw_chat_templates WHERE admin_id = 0 OR admin_id = ? ORDER BY sort_order, id"
    );
    $stmt->execute([$admin['id']]);
    jsonResponse(['templates' => $stmt->fetchAll()]);
}

if ($action === 'save_template' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    $id = (int)($data['id'] ?? 0);
    $title = trim($data['title'] ?? '');
    $message = trim($data['message'] ?? '');

    if (!$title || !$message) jsonResponse(['error' => 'title dan message wajib'], 400);

    $db = getDB();
    if ($id > 0) {
        $db->prepare("UPDATE dw_chat_templates SET title = ?, message = ? WHERE id = ? AND (admin_id = ? OR admin_id = 0)")
           ->execute([$title, $message, $id, $admin['id']]);
    } else {
        $db->prepare("INSERT INTO dw_chat_templates (admin_id, title, message) VALUES (?, ?, ?)")
           ->execute([$admin['id'], $title, $message]);
        $id = $db->lastInsertId();
    }
    jsonResponse(['ok' => true, 'id' => $id]);
}

if ($action === 'delete_template' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    $id = (int)($data['id'] ?? 0);
    if ($id) {
        getDB()->prepare("DELETE FROM dw_chat_templates WHERE id = ? AND admin_id = ?")->execute([$id, $admin['id']]);
    }
    jsonResponse(['ok' => true]);
}

// ═══════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════
if ($action === 'unread') {
    $sender = getSender();
    if (!$sender) jsonResponse(['error' => 'Auth required'], 401);

    $db = getDB();
    $candidateId = (int)($_GET['candidate_id'] ?? 0);

    if ($sender['type'] === 'user') {
        // User: count unread messages from admin for their candidate
        if (!$candidateId) {
            // Auto-detect from user
            $stmt = $db->prepare("SELECT id FROM dw_candidates WHERE user_id = ? LIMIT 1");
            $stmt->execute([$sender['id']]);
            $candidateId = (int)$stmt->fetchColumn();
        }
        if (!$candidateId) jsonResponse(['count' => 0]);

        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM dw_chat_messages WHERE candidate_id = ? AND sender_type = 'admin' AND is_read = 0"
        );
        $stmt->execute([$candidateId]);
        jsonResponse(['count' => (int)$stmt->fetchColumn()]);

    } else {
        // Admin: count total unread across all conversations (from dw_users)
        if ($candidateId) {
            $stmt = $db->prepare(
                "SELECT COUNT(*) FROM dw_chat_messages WHERE candidate_id = ? AND sender_type = 'user' AND is_read = 0"
            );
            $stmt->execute([$candidateId]);
        } else {
            $stmt = $db->prepare(
                "SELECT COUNT(*) FROM dw_chat_messages WHERE sender_type = 'user' AND is_read = 0"
            );
            $stmt->execute();
        }
        jsonResponse(['count' => (int)$stmt->fetchColumn()]);
    }
}

// ═══════════════════════════════════════════════════
// BLAST — Send to multiple dw_candidates
// ═══════════════════════════════════════════════════
if ($action === 'blast' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    $candidateIds = $data['candidate_ids'] ?? [];
    $message = trim($data['message'] ?? '');

    if (empty($candidateIds) || !$message) jsonResponse(['error' => 'candidate_ids dan message wajib'], 400);

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO dw_chat_messages 
        (candidate_id, sender_type, sender_id, sender_name, message_type, message) 
        VALUES (?, 'admin', ?, ?, 'text', ?)");

    $sender = ['type' => 'admin', 'id' => $admin['id'], 'name' => $admin['name']];
    $preview = mb_substr($message, 0, 80);
    $sent = 0;
    foreach ($candidateIds as $cid) {
        $stmt->execute([(int)$cid, $admin['id'], $admin['name'], $message]);
        triggerChatPush((int)$cid, $sender, $preview);
        $sent++;
    }

    jsonResponse(['ok' => true, 'sent' => $sent]);
}

// ═══════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════
if ($action === 'typing' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $candidateId = (int)($data['candidate_id'] ?? 0);
    if (!$candidateId) jsonResponse(['ok' => true]);

    $sender = getSender();
    if (!$sender) jsonResponse(['ok' => true]);

    $db = getDB();
    try {
        $db->prepare("INSERT INTO chat_typing (candidate_id, sender_type, updated_at) 
            VALUES (?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE updated_at = NOW()")
            ->execute([$candidateId, $sender['type']]);
    } catch(Exception $e) {}

    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Invalid action'], 400);

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

function getSender() {
    if (!empty($_SESSION['admin_id'])) {
        return [
            'type' => 'admin',
            'id' => $_SESSION['admin_id'],
            'name' => $_SESSION['admin_name']
        ];
    }
    if (!empty($_SESSION['user_id'])) {
        return [
            'type' => 'user',
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name']
        ];
    }
    return null;
}

function compressImage($source, $dest, $mime, $maxDim = 1200, $quality = 75) {
    if (!function_exists('imagecreatefromjpeg')) return false;

    switch ($mime) {
        case 'image/jpeg': $img = @imagecreatefromjpeg($source); break;
        case 'image/png':  $img = @imagecreatefrompng($source); break;
        case 'image/webp': $img = @imagecreatefromwebp($source); break;
        default: return false;
    }
    if (!$img) return false;

    $w = imagesx($img);
    $h = imagesy($img);

    // Resize if larger than maxDim
    if ($w > $maxDim || $h > $maxDim) {
        if ($w > $h) {
            $newW = $maxDim;
            $newH = (int)($h * $maxDim / $w);
        } else {
            $newH = $maxDim;
            $newW = (int)($w * $maxDim / $h);
        }
        $resized = imagecreatetruecolor($newW, $newH);

        // Preserve transparency for PNG
        if ($mime === 'image/png') {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }

        imagecopyresampled($resized, $img, 0, 0, 0, 0, $newW, $newH, $w, $h);
        imagedestroy($img);
        $img = $resized;
    }

    // Save compressed
    switch ($mime) {
        case 'image/jpeg': $ok = imagejpeg($img, $dest, $quality); break;
        case 'image/png':  $ok = imagepng($img, $dest, 6); break;
        case 'image/webp': $ok = imagewebp($img, $dest, $quality); break;
        default: $ok = false;
    }

    imagedestroy($img);
    return $ok;
}

function triggerChatPush($candidateId, $sender, $preview) {
    // Load WebPush if available
    $webpushFile = __DIR__ . '/../lib/WebPush.php';
    if (!file_exists($webpushFile)) return;
    if (!defined('VAPID_PUBLIC_KEY') || !defined('VAPID_PEM')) return;

    require_once $webpushFile;

    $db = getDB();

    if ($sender['type'] === 'admin') {
        // Admin sent → push to user's subscriptions
        $stmt = $db->prepare("SELECT u.id FROM dw_users u JOIN dw_candidates c ON c.user_id = u.id WHERE c.id = ?");
        $stmt->execute([$candidateId]);
        $userId = $stmt->fetchColumn();
        if (!$userId) return;

        $subs = $db->prepare("SELECT * FROM dw_push_subscriptions WHERE user_id = ?");
        $subs->execute([$userId]);
    } else {
        // User sent → push to admin subscriptions (if they exist)
        return; // Admin currently doesn't subscribe to push
    }

    $subscriptions = $subs->fetchAll();
    if (empty($subscriptions)) return;

    $payload = [
        'title' => 'Pesan dari ' . ($sender['name'] ?? 'Admin'),
        'body'  => $preview,
        'url'   => '/Daily Worker/daftar.html',
    ];

    try {
        $pusher = new WebPushSender(VAPID_PUBLIC_KEY, VAPID_PEM, VAPID_SUBJECT);
        foreach ($subscriptions as $sub) {
            $result = $pusher->send(
                $sub['endpoint'],
                $sub['p256dh'] ?? '',
                $sub['auth_key'] ?? '',
                $payload
            );
            if ($result['status'] == 410 || $result['status'] == 404) {
                $db->prepare("DELETE FROM dw_push_subscriptions WHERE id = ?")->execute([$sub['id']]);
            }
        }
    } catch (Exception $e) {
        // Silently fail
    }
}
