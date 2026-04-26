#!/usr/bin/env python3
"""Check users in the database and create demo users if needed."""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'aztec_interiors', 'backend'))

from app import create_app
from backend.db import SessionLocal, engine, Base
from backend.models import User
from werkzeug.security import generate_password_hash, check_password_hash

def main():
    app = create_app()
    
    with app.app_context():
        session = SessionLocal()
        
        # Check existing users
        users = session.query(User).all()
        print(f"\n📊 Found {len(users)} users in database:")
        print("-" * 50)
        for user in users:
            print(f"  ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Name: {user.first_name} {user.last_name}")
            print(f"  Role: {user.role}")
            print(f"  Active: {user.is_active}")
            print(f"  Has password: {bool(user.password_hash)}")
            print()
        
        # Demo users to create
        demo_users = [
            {
                "email": "admin@aztecinteriors.com",
                "password": "Admin123!",
                "first_name": "Admin",
                "last_name": "User",
                "role": "admin",
                "department": "management"
            },
            {
                "email": "demo@aztecinteriors.com",
                "password": "Demo123!",
                "first_name": "Demo",
                "last_name": "User",
                "role": "user",
                "department": "sales"
            }
        ]
        
        print("=" * 50)
        print("Creating demo users if they don't exist...")
        print("=" * 50)
        
        for user_data in demo_users:
            existing = session.query(User).filter_by(email=user_data["email"]).first()
            
            if existing:
                print(f"\n✅ User already exists: {user_data['email']}")
                # Test if password matches
                if existing.password_hash:
                    matches = check_password_hash(existing.password_hash, user_data["password"])
                    print(f"   Password matches: {matches}")
                else:
                    print(f"   ⚠️ No password hash found!")
            else:
                print(f"\n➕ Creating user: {user_data['email']}")
                user = User(
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=user_data["role"],
                    department=user_data["department"],
                    is_active=True,
                    is_verified=True
                )
                user.set_password(user_data["password"])
                session.add(user)
                print(f"   ✅ Created with password: {user_data['password']}")
        
        session.commit()
        
        # Verify
        print("\n" + "=" * 50)
        print("Final user list:")
        print("=" * 50)
        users = session.query(User).all()
        for user in users:
            print(f"  {user.email} ({user.role}) - {'✅' if user.is_active else '❌'}")
        
        session.close()

if __name__ == "__main__":
    main()
