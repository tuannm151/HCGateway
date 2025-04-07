import sqlite3
import os
from argon2 import PasswordHasher
import datetime
import secrets
from dotenv import load_dotenv

load_dotenv()

# Initialize password hasher
ph = PasswordHasher()

# SQLite database path
DB_PATH = os.getenv('SQLITE_DB_PATH', 'hcgateway.db')

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        token TEXT,
        refresh TEXT,
        expiry TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

# User authentication functions
def find_user_by_username(username):
    """Find a user by username"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def find_user_by_token(token):
    """Find a user by token"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE token = ?', (token,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def find_user_by_refresh(refresh):
    """Find a user by refresh token"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE refresh = ?', (refresh,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def find_user_by_id(user_id):
    """Find a user by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def create_user(username, password):
    """Create a new user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    user_id = secrets.token_hex(16)
    hashed_password = ph.hash(password)
    token = secrets.token_urlsafe(32)
    refresh = secrets.token_urlsafe(32)
    expiry = (datetime.datetime.now() + datetime.timedelta(hours=12)).isoformat()
    
    cursor.execute(
        'INSERT INTO users (id, username, password, token, refresh, expiry) VALUES (?, ?, ?, ?, ?, ?)',
        (user_id, username, hashed_password, token, refresh, expiry)
    )
    
    conn.commit()
    conn.close()
    
    return {
        'id': user_id,
        'username': username,
        'token': token,
        'refresh': refresh,
        'expiry': expiry
    }

def update_user_tokens(user_id):
    """Update user tokens and expiry"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    token = secrets.token_urlsafe(32)
    refresh = secrets.token_urlsafe(32)
    expiry = (datetime.datetime.now() + datetime.timedelta(hours=12)).isoformat()
    
    cursor.execute(
        'UPDATE users SET token = ?, refresh = ?, expiry = ? WHERE id = ?',
        (token, refresh, expiry, user_id)
    )
    
    conn.commit()
    conn.close()
    
    return {
        'token': token,
        'refresh': refresh,
        'expiry': expiry
    }

# Initialize the database when this module is imported
init_db()