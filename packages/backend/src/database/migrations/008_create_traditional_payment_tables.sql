-- Create bill_requests table
CREATE TABLE IF NOT EXISTS bill_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES session_participants(id) ON DELETE SET NULL,
    waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('individual', 'group', 'split')),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'mixed')),
    actual_payment_method VARCHAR(20),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'preparing', 'ready', 'delivered', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Create digital_receipts table
CREATE TABLE IF NOT EXISTS digital_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_request_id UUID NOT NULL REFERENCES bill_requests(id) ON DELETE CASCADE,
    receipt_data JSONB NOT NULL,
    delivery_method VARCHAR(10) NOT NULL CHECK (delivery_method IN ('email', 'sms', 'app')),
    delivery_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create pos_integrations table
CREATE TABLE IF NOT EXISTS pos_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    pos_system VARCHAR(20) NOT NULL CHECK (pos_system IN ('square', 'toast', 'lightspeed', 'generic')),
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_requests_session_id ON bill_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_bill_requests_participant_id ON bill_requests(participant_id);
CREATE INDEX IF NOT EXISTS idx_bill_requests_waiter_id ON bill_requests(waiter_id);
CREATE INDEX IF NOT EXISTS idx_bill_requests_status ON bill_requests(status);
CREATE INDEX IF NOT EXISTS idx_bill_requests_created_at ON bill_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_digital_receipts_bill_request ON digital_receipts(bill_request_id);
CREATE INDEX IF NOT EXISTS idx_digital_receipts_status ON digital_receipts(status);
CREATE INDEX IF NOT EXISTS idx_digital_receipts_delivery_method ON digital_receipts(delivery_method);

CREATE INDEX IF NOT EXISTS idx_pos_integrations_location ON pos_integrations(location_id);
CREATE INDEX IF NOT EXISTS idx_pos_integrations_active ON pos_integrations(is_active);

-- Create trigger for pos_integrations updated_at
CREATE TRIGGER update_pos_integrations_updated_at 
    BEFORE UPDATE ON pos_integrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();