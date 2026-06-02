from app import db
from datetime import datetime

class Bill(db.Model):
    __tablename__ = 'bills'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' 或 'expense'
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.String(200), nullable=True)  # 备注
    account = db.Column(db.String(50), nullable=True)  # 账户（微信/支付宝/现金）
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Bill {self.type} {self.amount}>'