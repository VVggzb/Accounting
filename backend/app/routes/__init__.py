from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db, bcrypt
from app.models import User
from datetime import datetime
import os
from werkzeug.utils import secure_filename

api_bp = Blueprint('api', __name__)
# ===== 图片上传配置 =====
import os
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
# ===== 图片上传接口 =====
@api_bp.route('/upload/image', methods=['POST'])
@jwt_required()
def upload_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'code': 400, 'message': '没有上传文件'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'success': False, 'code': 400, 'message': '文件名为空'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'code': 400, 'message': '只支持 jpg、png、jpeg 格式'}), 400
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = secure_filename(f"{timestamp}_{file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    file.save(filepath)
    
    image_url = f"/uploads/{filename}"
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '上传成功',
        'data': {'image_url': image_url}
    }), 200

# ===== 用户认证接口 =====

# 注册接口
@api_bp.route('/users', methods=['POST'])
def register():
    data = request.get_json()
    
    # 检查必要字段
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'success': False, 'code': 400, 'message': '用户名和密码不能为空'}), 400
    
    # 检查用户是否已存在
    existing_user = User.query.filter_by(username=data['username']).first()
    if existing_user:
        return jsonify({'success': False, 'code': 400, 'message': '用户名已存在'}), 400
    
    # 加密密码并创建用户
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        username=data['username'],
        password_hash=hashed_password,
        created_at=datetime.utcnow()
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'success': True, 'code': 201, 'message': '注册成功', 'data': {'id': new_user.id, 'username': new_user.username}}), 201

# 登录接口
@api_bp.route('/sessions', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'success': False, 'code': 400, 'message': '用户名和密码不能为空'}), 400
    
    # 查找用户
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({'success': False, 'code': 401, 'message': '用户名或密码错误'}), 401
    
    # 验证密码
    if not bcrypt.check_password_hash(user.password_hash, data['password']):
        return jsonify({'success': False, 'code': 401, 'message': '用户名或密码错误'}), 401
    
    # 生成 JWT token（identity 必须是字符串）
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'success': True, 
        'code': 200, 
        'message': '登录成功',
        'data': {
            'token': access_token,
            'user_id': user.id,
            'username': user.username
        }
    }), 200

# 受保护接口示例（获取当前用户信息）
@api_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'success': False, 'code': 404, 'message': '用户不存在'}), 404
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': {
            'id': user.id,
            'username': user.username,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }
    }), 200


# ===== 账本接口 =====

# 允许的分类（可选校验）
INCOME_CATEGORIES = ['生活费', '红包', '兼职', '副业']
EXPENSE_CATEGORIES = ['餐饮', '购物', '服饰', '日用', '数码', '美妆', '护肤', '应用软件', '交通', '娱乐', '医疗', '学习', '运动', '人情']

# 1. 新增账单
@api_bp.route('/bills', methods=['POST'])
@jwt_required()
def add_bill():
    from app.models import Bill
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    # 校验必要字段
    required = ['type', 'category', 'amount', 'date']
    for field in required:
        if field not in data:
            return jsonify({'success': False, 'code': 400, 'message': f'缺少字段: {field}'}), 400
    
    # 校验金额为正数
    if data['amount'] <= 0:
        return jsonify({'success': False, 'code': 400, 'message': '金额必须大于0'}), 400
    
    # 校验分类
    if data['type'] == 'income' and data['category'] not in INCOME_CATEGORIES:
        return jsonify({'success': False, 'code': 400, 'message': '无效的收入分类'}), 400
    if data['type'] == 'expense' and data['category'] not in EXPENSE_CATEGORIES:
        return jsonify({'success': False, 'code': 400, 'message': '无效的支出分类'}), 400
    
    # 解析日期
    try:
        bill_date = datetime.strptime(data['date'], '%Y-%m-%d')
    except:
        return jsonify({'success': False, 'code': 400, 'message': '日期格式错误，应为YYYY-MM-DD'}), 400
    
    new_bill = Bill(
        user_id=user_id,
        type=data['type'],      # 'income' 或 'expense'
        category=data['category'],
        amount=data['amount'],
        note=data.get('note', ''),
        account=data.get('account', ''),
        date=bill_date
    )
    
    db.session.add(new_bill)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 201,
        'message': '账单添加成功',
        'data': {'id': new_bill.id}
    }), 201

# 2. 获取月度账单列表（按日分组）
@api_bp.route('/bills', methods=['GET'])
@jwt_required()
def get_bills():
    from app.models import Bill
    from collections import defaultdict
    
    user_id = get_jwt_identity()
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        return jsonify({'success': False, 'code': 400, 'message': '请提供year和month参数'}), 400
    
    # 查询该月的账单
    bills = Bill.query.filter(
        Bill.user_id == user_id,
        Bill.date >= datetime(year, month, 1),
        Bill.date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).order_by(Bill.date.desc(), Bill.created_at.desc()).all()
    
    # 按日期分组
    grouped = defaultdict(list)
    for bill in bills:
        date_str = bill.date.strftime('%Y-%m-%d')
        grouped[date_str].append({
            'id': bill.id,
            'type': bill.type,
            'category': bill.category,
            'amount': bill.amount,
            'note': bill.note,
            'account': bill.account,
            'time': bill.date.strftime('%H:%M')
        })
    
    # 转换为列表格式，并计算每日支出
    result = []
    for date_str, items in grouped.items():
        daily_expense = sum(item['amount'] for item in items if item['type'] == 'expense')
        result.append({
            'date': date_str,
            'daily_expense': daily_expense,
            'items': items
        })
    
    # 按日期倒序
    result.sort(key=lambda x: x['date'], reverse=True)
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': result
    }), 200

# 3. 获取月度收支概览
@api_bp.route('/bills/overview', methods=['GET'])
@jwt_required()
def get_overview():
    from app.models import Bill
    
    user_id = get_jwt_identity()
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        return jsonify({'success': False, 'code': 400, 'message': '请提供year和month参数'}), 400
    
    # 查询该月账单
    bills = Bill.query.filter(
        Bill.user_id == user_id,
        Bill.date >= datetime(year, month, 1),
        Bill.date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).all()
    
    total_income = sum(b.amount for b in bills if b.type == 'income')
    total_expense = sum(b.amount for b in bills if b.type == 'expense')
    balance = total_income - total_expense
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': {
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'balance': round(balance, 2)
        }
    }), 200

# 4. 编辑账单
@api_bp.route('/bills/<int:bill_id>', methods=['PUT'])
@jwt_required()
def update_bill(bill_id):
    from app.models import Bill
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    bill = Bill.query.filter_by(id=bill_id, user_id=user_id).first()
    if not bill:
        return jsonify({'success': False, 'code': 404, 'message': '账单不存在'}), 404
    
    # 更新字段
    if 'amount' in data:
        if data['amount'] <= 0:
            return jsonify({'success': False, 'code': 400, 'message': '金额必须大于0'}), 400
        bill.amount = data['amount']
    
    if 'category' in data:
        # 校验分类
        if bill.type == 'income' and data['category'] not in INCOME_CATEGORIES:
            return jsonify({'success': False, 'code': 400, 'message': '无效的收入分类'}), 400
        if bill.type == 'expense' and data['category'] not in EXPENSE_CATEGORIES:
            return jsonify({'success': False, 'code': 400, 'message': '无效的支出分类'}), 400
        bill.category = data['category']
    
    if 'note' in data:
        bill.note = data['note']
    
    if 'account' in data:
        bill.account = data['account']
    
    if 'date' in data:
        try:
            bill.date = datetime.strptime(data['date'], '%Y-%m-%d')
        except:
            return jsonify({'success': False, 'code': 400, 'message': '日期格式错误，应为YYYY-MM-DD'}), 400
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '账单更新成功'
    }), 200

# 5. 删除账单
@api_bp.route('/bills/<int:bill_id>', methods=['DELETE'])
@jwt_required()
def delete_bill(bill_id):
    from app.models import Bill
    
    user_id = get_jwt_identity()
    
    bill = Bill.query.filter_by(id=bill_id, user_id=user_id).first()
    if not bill:
        return jsonify({'success': False, 'code': 404, 'message': '账单不存在'}), 404
    
    db.session.delete(bill)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '账单删除成功'
    }), 200

# ===== IP资产管理接口 =====

# 1. 获取所有IP合集列表 (GET)
@api_bp.route('/collections', methods=['GET'])
@jwt_required()
def get_collections():
    from app.models import IPCollection
    
    user_id = get_jwt_identity()
    collections = IPCollection.query.filter_by(user_id=user_id).all()
    
    result = []
    for col in collections:
        result.append({
            'id': col.id,
            'name': col.name,
            'total_amount': round(col.total_amount, 2)
        })
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': result
    }), 200

# 2. 新增IP合集 (POST)
@api_bp.route('/collections', methods=['POST'])
@jwt_required()
def add_collection():
    from app.models import IPCollection
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    if not data or not data.get('name'):
        return jsonify({'success': False, 'code': 400, 'message': 'IP名称不能为空'}), 400
    
    existing = IPCollection.query.filter_by(user_id=user_id, name=data['name']).first()
    if existing:
        return jsonify({'success': False, 'code': 400, 'message': '该IP合集已存在'}), 400
    
    new_collection = IPCollection(
        user_id=user_id,
        name=data['name'],
        total_amount=0.0
    )
    
    db.session.add(new_collection)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 201,
        'message': 'IP合集添加成功',
        'data': {'id': new_collection.id, 'name': new_collection.name, 'total_amount': 0}
    }), 201
# 删除IP合集
@api_bp.route('/collections/<int:collection_id>', methods=['DELETE'])
@jwt_required()
def delete_collection(collection_id):
    from app.models import IPCollection, IPItem
    
    user_id = get_jwt_identity()
    collection = IPCollection.query.filter_by(id=collection_id, user_id=user_id).first()
    
    if not collection:
        return jsonify({'success': False, 'code': 404, 'message': '合集不存在'}), 404
    
    # 删除合集下的所有藏品
    IPItem.query.filter_by(collection_id=collection_id).delete()
    # 删除合集
    db.session.delete(collection)
    db.session.commit()
    
    return jsonify({'success': True, 'code': 200, 'message': '删除成功'}), 200
# 3. 获取某IP下的所有藏品 (GET)
@api_bp.route('/collections/<int:collection_id>/items', methods=['GET'])
@jwt_required()
def get_items(collection_id):
    from app.models import IPCollection, IPItem
    
    user_id = get_jwt_identity()
    
    collection = IPCollection.query.filter_by(id=collection_id, user_id=user_id).first()
    if not collection:
        return jsonify({'success': False, 'code': 404, 'message': 'IP合集不存在'}), 404
    
    items = IPItem.query.filter_by(collection_id=collection_id, user_id=user_id).all()
    
    result = []
    for item in items:
        result.append({
            'id': item.id,
            'name': item.name,
            'amount': round(item.amount, 2),
            'purchase_date': item.purchase_date.strftime('%Y-%m-%d') if item.purchase_date else '',
            'image_url': item.image_url or '/static/default.jpg'
        })
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': {
            'collection_id': collection.id,
            'collection_name': collection.name,
            'total_amount': round(collection.total_amount, 2),
            'items': result
        }
    }), 200

# 4. 新增藏品 (POST)
@api_bp.route('/collections/<int:collection_id>/items', methods=['POST'])
@jwt_required()
def add_item(collection_id):
    from app.models import IPCollection, IPItem
    
    data = request.get_json()
    user_id = get_jwt_identity()
    
    collection = IPCollection.query.filter_by(id=collection_id, user_id=user_id).first()
    if not collection:
        return jsonify({'success': False, 'code': 404, 'message': 'IP合集不存在'}), 404
    
    if not data or not data.get('name') or not data.get('amount'):
        return jsonify({'success': False, 'code': 400, 'message': '藏品名称和金额不能为空'}), 400
    
    if data['amount'] <= 0:
        return jsonify({'success': False, 'code': 400, 'message': '金额必须大于0'}), 400
    
    purchase_date = datetime.now()
    if data.get('purchase_date'):
        try:
            purchase_date = datetime.strptime(data['purchase_date'], '%Y-%m-%d')
        except:
            return jsonify({'success': False, 'code': 400, 'message': '日期格式错误，应为YYYY-MM-DD'}), 400
    
    new_item = IPItem(
        collection_id=collection_id,
        user_id=user_id,
        name=data['name'],
        amount=data['amount'],
        purchase_date=purchase_date,
        image_url=data.get('image_url', None)
    )
    
    collection.total_amount += data['amount']
    
    db.session.add(new_item)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 201,
        'message': '藏品添加成功',
        'data': {'id': new_item.id}
    }), 201

# 5. 编辑藏品
@api_bp.route('/collections/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    from app.models import IPItem, IPCollection
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    item = IPItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'success': False, 'code': 404, 'message': '藏品不存在'}), 404
    
    # 记录旧金额，用于更新合集总金额
    old_amount = item.amount
    
    # 更新字段
    if 'name' in data:
        item.name = data['name']
    
    if 'amount' in data:
        if data['amount'] <= 0:
            return jsonify({'success': False, 'code': 400, 'message': '金额必须大于0'}), 400
        item.amount = data['amount']
        
        # 更新对应合集的累计金额
        collection = IPCollection.query.get(item.collection_id)
        if collection:
            collection.total_amount = collection.total_amount - old_amount + data['amount']
    
    if 'purchase_date' in data:
        try:
            item.purchase_date = datetime.strptime(data['purchase_date'], '%Y-%m-%d')
        except:
            return jsonify({'success': False, 'code': 400, 'message': '日期格式错误，应为YYYY-MM-DD'}), 400
    
    if 'image_url' in data:
        item.image_url = data['image_url']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '藏品更新成功'
    }), 200

# 6. 删除藏品
@api_bp.route('/collections/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    from app.models import IPItem, IPCollection
    
    user_id = get_jwt_identity()
    
    item = IPItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'success': False, 'code': 404, 'message': '藏品不存在'}), 404
    
    # 更新对应合集的累计金额
    collection = IPCollection.query.get(item.collection_id)
    if collection:
        collection.total_amount -= item.amount
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '藏品删除成功'
    }), 200
# 编辑IP合集
@api_bp.route('/collections/<int:collection_id>', methods=['PUT'])
@jwt_required()
def update_collection(collection_id):
    from app.models import IPCollection
    
    user_id = get_jwt_identity()
    data = request.get_json()
    
    collection = IPCollection.query.filter_by(id=collection_id, user_id=user_id).first()
    if not collection:
        return jsonify({'success': False, 'code': 404, 'message': '合集不存在'}), 404
    
    if 'name' in data:
        # 检查重名
        existing = IPCollection.query.filter_by(user_id=user_id, name=data['name']).first()
        if existing and existing.id != collection_id:
            return jsonify({'success': False, 'code': 400, 'message': '该IP合集已存在'}), 400
        collection.name = data['name']
    
    db.session.commit()
    
    return jsonify({'success': True, 'code': 200, 'message': '更新成功'}), 200
# ===== 统计图表接口 =====

# 1. 支出分类饼图数据
@api_bp.route('/statistics/pie', methods=['GET'])
@jwt_required()
def get_pie_data():
    from app.models import Bill
    from collections import defaultdict
    
    user_id = get_jwt_identity()
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        return jsonify({'success': False, 'code': 400, 'message': '请提供year和month参数'}), 400
    
    # 查询该月支出账单
    bills = Bill.query.filter(
        Bill.user_id == user_id,
        Bill.type == 'expense',
        Bill.date >= datetime(year, month, 1),
        Bill.date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).all()
    
    # 按分类汇总
    category_total = defaultdict(float)
    for bill in bills:
        category_total[bill.category] += bill.amount
    
    total = sum(category_total.values())
    
    result = []
    for category, amount in category_total.items():
        percent = round(amount / total * 100, 1) if total > 0 else 0
        result.append({
            'category': category,
            'amount': round(amount, 2),
            'percent': percent
        })
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': {
            'total_expense': round(total, 2),
            'categories': result
        }
    }), 200

# 2. 每日支出趋势（柱状图）
@api_bp.route('/statistics/trend', methods=['GET'])
@jwt_required()
def get_trend_data():
    from app.models import Bill
    from calendar import monthrange
    
    user_id = get_jwt_identity()
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        return jsonify({'success': False, 'code': 400, 'message': '请提供year和month参数'}), 400
    
    # 获取当月天数
    _, last_day = monthrange(year, month)
    
    # 查询该月支出账单
    bills = Bill.query.filter(
        Bill.user_id == user_id,
        Bill.type == 'expense',
        Bill.date >= datetime(year, month, 1),
        Bill.date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).all()
    
    # 按日期汇总
    daily_expense = {}
    for bill in bills:
        day = bill.date.day
        daily_expense[day] = daily_expense.get(day, 0) + bill.amount
    
    # 生成完整日期列表
    result = []
    total_expense = 0
    for day in range(1, last_day + 1):
        amount = daily_expense.get(day, 0)
        total_expense += amount
        result.append({
            'day': day,
            'amount': round(amount, 2)
        })
    
    # 计算日均支出
    avg_expense = round(total_expense / last_day, 2) if last_day > 0 else 0
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': {
            'daily_expense': result,
            'avg_expense': avg_expense,
            'total_expense': round(total_expense, 2)
        }
    }), 200

# 3. 分类消费排行
@api_bp.route('/statistics/ranking', methods=['GET'])
@jwt_required()
def get_ranking():
    from app.models import Bill
    from collections import defaultdict
    
    user_id = get_jwt_identity()
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    if not year or not month:
        return jsonify({'success': False, 'code': 400, 'message': '请提供year和month参数'}), 400
    
    # 查询该月支出账单
    bills = Bill.query.filter(
        Bill.user_id == user_id,
        Bill.type == 'expense',
        Bill.date >= datetime(year, month, 1),
        Bill.date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).all()
    
    # 按分类汇总
    category_stats = defaultdict(lambda: {'amount': 0, 'count': 0})
    for bill in bills:
        category_stats[bill.category]['amount'] += bill.amount
        category_stats[bill.category]['count'] += 1
    
    # 计算环比（与上月比较）
    # 查询上月数据
    if month == 1:
        last_year, last_month = year - 1, 12
    else:
        last_year, last_month = year, month - 1
    
    last_bills = Bill.query.filter(
        Bill.user_id == user_id,
        Bill.type == 'expense',
        Bill.date >= datetime(last_year, last_month, 1),
        Bill.date < datetime(last_year, last_month + 1, 1) if last_month < 12 else datetime(last_year + 1, 1, 1)
    ).all()
    
    last_category_amount = defaultdict(float)
    for bill in last_bills:
        last_category_amount[bill.category] += bill.amount
    
    # 构建排行列表
    result = []
    for category, stats in category_stats.items():
        last_amount = last_category_amount.get(category, 0)
        if last_amount > 0:
            percent_change = round((stats['amount'] - last_amount) / last_amount * 100, 1)
        else:
            percent_change = None if stats['amount'] == 0 else 100
        
        result.append({
            'category': category,
            'amount': round(stats['amount'], 2),
            'count': stats['count'],
            'percent_change': percent_change
        })
    
    # 按金额降序排序
    result.sort(key=lambda x: x['amount'], reverse=True)
    
    return jsonify({
        'success': True,
        'code': 200,
        'message': '获取成功',
        'data': result
    }), 200

# ===== 测试接口 =====

@api_bp.route('/test')
def test():
    return jsonify({'success': True, 'message': 'API测试成功'})