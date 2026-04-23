-- ═══════════════════════════════════════════════════════
-- Linktree V2 Migration — Grouping + SVG Icons
-- Run AFTER db_linktree.sql
-- Safe: only adds new columns, no data loss
-- ═══════════════════════════════════════════════════════

-- Driver
ALTER TABLE drv_linktree 
  ADD COLUMN IF NOT EXISTS icon_key VARCHAR(30) DEFAULT 'link' AFTER icon,
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(50) DEFAULT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS group_order INT DEFAULT 0 AFTER group_name;

-- Kurir
ALTER TABLE krr_linktree 
  ADD COLUMN IF NOT EXISTS icon_key VARCHAR(30) DEFAULT 'link' AFTER icon,
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(50) DEFAULT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS group_order INT DEFAULT 0 AFTER group_name;

-- Daily Worker
ALTER TABLE dw_linktree 
  ADD COLUMN IF NOT EXISTS icon_key VARCHAR(30) DEFAULT 'link' AFTER icon,
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(50) DEFAULT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS group_order INT DEFAULT 0 AFTER group_name;
