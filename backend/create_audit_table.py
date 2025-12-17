"""
Script to create audit_logs table if it doesn't exist
"""
from sqlalchemy import text
from database import engine

def create_audit_table():
    """Create audit_logs table if it doesn't exist"""
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'audit_logs'
            );
        """))
        table_exists = result.scalar()
        
        if not table_exists:
            print("Creating audit_logs table...")
            conn.execute(text("""
                CREATE TABLE audit_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    username VARCHAR NOT NULL,
                    action VARCHAR NOT NULL,
                    resource_type VARCHAR NOT NULL,
                    resource_id VARCHAR,
                    description TEXT,
                    ip_address VARCHAR,
                    user_agent VARCHAR,
                    changes JSONB,
                    status VARCHAR DEFAULT 'success',
                    error_message TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            # Create indexes for better performance
            conn.execute(text("""
                CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
                CREATE INDEX idx_audit_logs_username ON audit_logs(username);
                CREATE INDEX idx_audit_logs_action ON audit_logs(action);
                CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
                CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
                CREATE INDEX idx_audit_logs_status ON audit_logs(status);
            """))
            
            conn.commit()
            print("✅ audit_logs table created successfully!")
        else:
            print("✅ audit_logs table already exists")

if __name__ == "__main__":
    create_audit_table()

