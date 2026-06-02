from app import db
from datetime import datetime

class IPItem(db.Model):
    __tablename__ = 'ip_items'
    
    id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(db.Integer, db.ForeignKey('ip_collections.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)  # 藏品名称
    amount = db.Column(db.Float, nullable=False)  # 购入金额
    purchase_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    image_url = db.Column(db.String(300), nullable=True)  # 图片URL（可为空，显示默认图）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<IPItem {self.name}>'