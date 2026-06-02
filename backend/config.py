import os
from datetime import timedelta

class Config:
    SECRET_KEY = 'your-secret-key-change-this'
    
    # 确保这行代码是这样的
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'accounting.db')
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'jwt-secret-key-change-this'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    JWT_TOKEN_LOCATION = ['headers']
    BCRYPT_LOG_ROUNDS = 12