CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., Pro, Enterprise
    stripe_product_id TEXT UNIQUE NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL,
    stripe_price_id_monthly TEXT UNIQUE NOT NULL,
    price_yearly NUMERIC(10, 2) NOT NULL,
    stripe_price_id_yearly TEXT UNIQUE NOT NULL,
    features JSONB NOT NULL -- Store features as a JSON array
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- e.g., active, canceled, past_due
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a stripe_customer_id to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add a subscription_id to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);