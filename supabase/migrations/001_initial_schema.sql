-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.settings.jwt_secret" = '';

-- ============================================================================
-- PLAID ITEMS TABLE
-- ============================================================================
-- Stores Plaid API credentials and sync cursors for each linked item

CREATE TABLE plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  cursor TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_plaid_items_plaid_item_id ON plaid_items(plaid_item_id);

-- RLS Policies
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON plaid_items
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- INSTITUTIONS TABLE
-- ============================================================================
-- Stores information about financial institutions linked via Plaid

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id TEXT UNIQUE NOT NULL,
  institution_name TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'login_required')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (plaid_item_id) REFERENCES plaid_items(plaid_item_id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_institutions_plaid_item_id ON institutions(plaid_item_id);
CREATE INDEX idx_institutions_status ON institutions(status);

-- RLS Policies
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON institutions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- ACCOUNTS TABLE
-- ============================================================================
-- Stores individual bank/credit accounts

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_account_id TEXT UNIQUE NOT NULL,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT,
  official_name TEXT,
  type TEXT NOT NULL,
  subtype TEXT,
  mask TEXT,
  balance_available NUMERIC(15, 2),
  balance_current NUMERIC(15, 2),
  balance_limit NUMERIC(15, 2),
  balance_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_accounts_plaid_account_id ON accounts(plaid_account_id);
CREATE INDEX idx_accounts_institution_id ON accounts(institution_id);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_subtype ON accounts(subtype);

-- RLS Policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON accounts
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Stores transaction records from linked accounts

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_transaction_id TEXT UNIQUE NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  date DATE NOT NULL,
  datetime TIMESTAMPTZ,
  name TEXT,
  merchant_name TEXT,
  merchant_entity_id TEXT,
  category_primary TEXT,
  category_detailed TEXT,
  payment_channel TEXT,
  is_pending BOOLEAN DEFAULT false,
  pending_transaction_id TEXT,
  iso_currency_code TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_transactions_plaid_transaction_id ON transactions(plaid_transaction_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_primary ON transactions(category_primary);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_is_pending ON transactions(is_pending);
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- CREDIT LIABILITIES TABLE
-- ============================================================================
-- Stores credit account liability information

CREATE TABLE credit_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_overdue BOOLEAN,
  last_payment_amount NUMERIC(15, 2),
  last_payment_date DATE,
  last_statement_issue_date DATE,
  last_statement_balance NUMERIC(15, 2),
  minimum_payment_amount NUMERIC(15, 2),
  next_payment_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_credit_liabilities_account_id ON credit_liabilities(account_id);
CREATE INDEX idx_credit_liabilities_is_overdue ON credit_liabilities(is_overdue);
CREATE INDEX idx_credit_liabilities_next_payment_due_date ON credit_liabilities(next_payment_due_date);

-- RLS Policies
ALTER TABLE credit_liabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON credit_liabilities
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- CREDIT LIABILITY APRs TABLE
-- ============================================================================
-- Stores APR information for credit accounts

CREATE TABLE credit_liability_aprs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_liability_id UUID NOT NULL REFERENCES credit_liabilities(id) ON DELETE CASCADE,
  apr_percentage NUMERIC(8, 4) NOT NULL,
  apr_type TEXT NOT NULL CHECK (apr_type IN ('balance_transfer_apr', 'cash_apr', 'purchase_apr', 'special')),
  balance_subject_to_apr NUMERIC(15, 2),
  interest_charge_amount NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_credit_liability_aprs_credit_liability_id ON credit_liability_aprs(credit_liability_id);
CREATE INDEX idx_credit_liability_aprs_apr_type ON credit_liability_aprs(apr_type);

-- RLS Policies
ALTER TABLE credit_liability_aprs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON credit_liability_aprs
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Automatic timestamp updates for updated_at columns

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_liabilities_updated_at
  BEFORE UPDATE ON credit_liabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_liability_aprs_updated_at
  BEFORE UPDATE ON credit_liability_aprs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- READONLY QUERY FUNCTION (for AI chat)
-- ============================================================================
-- Allows the AI chat to execute read-only SQL queries

CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow SELECT queries
  IF NOT (UPPER(TRIM(query_text)) LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Block dangerous keywords
  IF UPPER(query_text) ~ '(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)' THEN
    RAISE EXCEPTION 'Query contains disallowed keywords';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t'
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
