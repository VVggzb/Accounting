from app import db

class IPCollection(db.Model):
    __tablename__ = 'ip_collections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)  # IP名称，如"迪士尼"
    total_amount = db.Column(db.Float, default=0.0)  # 累计购入总金额
    
    # 关联关系
    items = db.relationship('IPItem', backref='collection', lazy=True, cascade='all, delete-orphan')
    
    # 联合约束：同一个用户下IP名称不能重复
    __table_args__ = (db.UniqueConstraint('user_id', 'name', name='unique_user_ip'),)
    
    def __repr__(self):
        return f'<IPCollection {self.name}>'