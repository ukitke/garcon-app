-- Create waiter_calls table
CREATE TABLE IF NOT EXISTS waiter_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES session_participants(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('assistance', 'bill', 'complaint', 'order_ready')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'cancelled')),
    assigned_waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create notification_events table
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('waiter_call', 'order_update', 'payment_request', 'system_alert')),
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('waiter', 'customer', 'kitchen', 'admin')),
    target_id UUID, -- can be null for broadcast notifications
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create waiter_status table
CREATE TABLE IF NOT EXISTS waiter_status (
    waiter_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'break', 'offline')),
    current_calls UUID[] DEFAULT '{}', -- array of call IDs
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    waiter_calls BOOLEAN DEFAULT TRUE,
    order_updates BOOLEAN DEFAULT TRUE,
    payment_requests BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    vibration_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_responses table for tracking response times
CREATE TABLE IF NOT EXISTS call_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES waiter_calls(id) ON DELETE CASCADE,
    waiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_time_seconds INTEGER NOT NULL,
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_waiter_calls_location_status ON waiter_calls(location_id, status);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_session_id ON waiter_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_assigned_waiter ON waiter_calls(assigned_waiter_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_created_at ON waiter_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_priority ON waiter_calls(priority, status);

CREATE INDEX IF NOT EXISTS idx_notification_events_target ON notification_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_location ON notification_events(location_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON notification_events(type);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_events_expires_at ON notification_events(expires_at);

CREATE INDEX IF NOT EXISTS idx_waiter_status_location ON waiter_status(location_id);
CREATE INDEX IF NOT EXISTS idx_waiter_status_status ON waiter_status(status);
CREATE INDEX IF NOT EXISTS idx_waiter_status_last_seen ON waiter_status(last_seen);

CREATE INDEX IF NOT EXISTS idx_call_responses_call_id ON call_responses(call_id);
CREATE INDEX IF NOT EXISTS idx_call_responses_waiter_id ON call_responses(waiter_id);

-- Create triggers for updated_at
CREATE TRIGGER update_waiter_status_updated_at 
    BEFORE UPDATE ON waiter_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically expire old notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_events 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to update waiter last_seen timestamp
CREATE OR REPLACE FUNCTION update_waiter_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waiter_last_seen_trigger
    BEFORE UPDATE ON waiter_status
    FOR EACH ROW
    EXECUTE FUNCTION update_waiter_last_seen();