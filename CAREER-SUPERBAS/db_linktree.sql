-- ═══════════════════════════════════════════════════════
-- Super-BAS Linktree Tables
-- Run this migration on super-bas.com database
-- ═══════════════════════════════════════════════════════

-- Driver Linktree
CREATE TABLE IF NOT EXISTS drv_linktree (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    icon        VARCHAR(10)  DEFAULT '🔗',
    description VARCHAR(200) DEFAULT NULL,
    is_active   TINYINT(1)   DEFAULT 1,
    sort_order  INT          DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kurir Linktree
CREATE TABLE IF NOT EXISTS krr_linktree (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    icon        VARCHAR(10)  DEFAULT '🔗',
    description VARCHAR(200) DEFAULT NULL,
    is_active   TINYINT(1)   DEFAULT 1,
    sort_order  INT          DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily Worker Linktree
CREATE TABLE IF NOT EXISTS dw_linktree (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    icon        VARCHAR(10)  DEFAULT '🔗',
    description VARCHAR(200) DEFAULT NULL,
    is_active   TINYINT(1)   DEFAULT 1,
    sort_order  INT          DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
