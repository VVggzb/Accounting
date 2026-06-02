from flask import Flask, jsonify, send_from_directory, send_file, abort
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import Config
import os

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    from app.models import User, Bill, IPCollection, IPItem

    @app.route('/health')
    def health():
        return jsonify({'success': True, 'message': '服务运行正常'})

    # 关键修改：向上取两层，得到 backend 根目录
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # 此时 backend_dir = D:\Code\Web\My accounting\backend

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        # 图片实际保存在 backend/app/uploads 下
        file_path = os.path.join(backend_dir, 'app', 'uploads', filename)
        file_path = os.path.normpath(file_path)

        print(f"[DEBUG] 请求文件: {filename}")
        print(f"[DEBUG] backend_dir: {backend_dir}")
        print(f"[DEBUG] 完整路径: {file_path}")
        print(f"[DEBUG] 文件存在: {os.path.exists(file_path)}")

        if not file_path.startswith(os.path.join(backend_dir, 'app', 'uploads')):
            abort(403)

        if not os.path.exists(file_path):
            return f"File not found: {filename}<br>Expected path: {file_path}", 404

        try:
            return send_file(file_path)
        except Exception as e:
            print(f"[ERROR] 发送文件失败: {e}")
            return f"Internal error: {e}", 500

    @app.route('/static/<path:filename>')
    def static_files(filename):
        static_dir = os.path.join(backend_dir, 'static')
        return send_from_directory(static_dir, filename)

    return app