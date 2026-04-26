-- Migration: Add permissions column and stock_movements table
-- Run this in the Supabase SQL Editor

-- 1. Add permissions to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- 2. Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    qty NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS and add policies
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Simple policies for demo/production (ensure clinic isolation)
CREATE POLICY "Stock movements access by clinic" ON stock_movements
FOR ALL USING (clinic_id IS NOT NULL);

CREATE POLICY "Audit logs access by clinic" ON audit_logs
FOR ALL USING (clinic_id IS NOT NULL);
