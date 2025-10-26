-- Create split_payment_sessions table
CREATE TABLE IF NOT EXISTS split_payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('equal', 'custom', 'by_order')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create split_contributions table
CREATE TABLE IF NOT EXISTS split_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    split_session_id UUID NOT NULL REFERENCES split_payment_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    participant_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_split_sessions_session_id ON split_payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_split_sessions_status ON split_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_split_contributions_session_id ON split_contributions(split_session_id);
CREATE INDEX IF NOT EXISTS idx_split_contributions_participant ON split_contributions(participant_id);
CREATE INDEX IF NOT EXISTS idx_split_contributions_status ON split_contributions(status);
CREATE INDEX IF NOT EXISTS idx_split_contributions_payment_intent ON split_contributions(payment_intent_id);