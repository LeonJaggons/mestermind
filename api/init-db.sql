-- Initialize Mestermind Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'service_provider', 'admin');
CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Create indexes for better performance
-- These will be created after tables are created by SQLAlchemy migrations
