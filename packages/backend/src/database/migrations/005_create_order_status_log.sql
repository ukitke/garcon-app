-- Create order_status_log table for tracking order status changes
CREATE TABLE IF NOT EXISTS order_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_status_log_order_id ON order_status_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_log_status ON order_status_log(status);
CREATE INDEX IF NOT EXISTS idx_order_status_log_created_at ON order_status_log(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_log_changed_by ON order_status_log(changed_by);

-- Create function to automatically log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_log (order_id, status, changed_by, notes)
        VALUES (NEW.id, NEW.status, NEW.updated_by, 'Automatic status change');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_by column to orders table for tracking who made changes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create trigger to automatically log order status changes
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();