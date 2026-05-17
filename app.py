from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'  # Важно изменить в продакшене!

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, авторизуйтесь для доступа к этой странице'
login_manager.login_message_category = 'warning'

# ========== МОДЕЛИ БАЗЫ ДАННЫХ ==========

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Factory(db.Model):
    __tablename__ = 'factories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    
    sections = db.relationship('Section', back_populates='factory', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {'id': self.id, 'name': self.name}

class Section(db.Model):
    __tablename__ = 'sections'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    factory_id = db.Column(db.Integer, db.ForeignKey('factories.id'), nullable=False)
    
    __table_args__ = (db.UniqueConstraint('name', 'factory_id', name='unique_section_name_per_factory'),)
    
    factory = db.relationship('Factory', back_populates='sections')
    equipments = db.relationship('Equipment', secondary='section_equipment', back_populates='sections')

class Equipment(db.Model):
    __tablename__ = 'equipments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    
    sections = db.relationship('Section', secondary='section_equipment', back_populates='equipments')

section_equipment = db.Table('section_equipment',
    db.Column('section_id', db.Integer, db.ForeignKey('sections.id'), primary_key=True),
    db.Column('equipment_id', db.Integer, db.ForeignKey('equipments.id'), primary_key=True)
)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ========== ФУНКЦИИ ДЛЯ ИЕРАРХИИ ==========

def get_all_parents(item_type, item_id):
    if item_type == 'equipment':
        equipment = Equipment.query.get(item_id)
        if not equipment:
            return []
        
        result = []
        for section in equipment.sections:
            result.append({
                'level': 1,
                'type': 'section',
                'name': section.name,
                'id': section.id
            })
            if section.factory:
                result.append({
                    'level': 2,
                    'type': 'factory',
                    'name': section.factory.name,
                    'id': section.factory.id
                })
        return result
    
    elif item_type == 'section':
        section = Section.query.get(item_id)
        if not section:
            return []
        
        result = []
        if section.factory: 
            result.append({
                'level': 1,
                'type': 'factory',
                'name': section.factory.name,
                'id': section.factory.id
            })
        return result
    
    return []

def get_all_children(item_type, item_id):
    if item_type == 'factory':
        factory = Factory.query.get(item_id)
        if not factory:
            return []
        
        result = []
        for section in factory.sections:
            result.append({
                'level': 1,
                'type': 'section',
                'name': section.name,
                'id': section.id
            })
            for equipment in section.equipments:
                result.append({
                    'level': 2,
                    'type': 'equipment',
                    'name': equipment.name,
                    'id': equipment.id
                })
        return result
    
    elif item_type == 'section':
        section = Section.query.get(item_id)
        if not section:
            return []
        
        result = []
        for equipment in section.equipments:
            result.append({
                'level': 1,
                'type': 'equipment',
                'name': equipment.name,
                'id': equipment.id
            })
        return result
    
    return []

# ========== МАРШРУТЫ АВТОРИЗАЦИИ ==========

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
        
        if user and user.check_password(password):
            login_user(user)
            flash(f'Добро пожаловать, {user.username}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        else:
            flash('Неверное имя пользователя или пароль', 'danger')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Валидация
        if not username or not password:
            flash('Все поля обязательны для заполнения', 'danger')
        elif password != confirm_password:
            flash('Пароли не совпадают', 'danger')
        elif len(password) < 4:
            flash('Пароль должен содержать минимум 4 символа', 'danger')
        else:
            existing_user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
            if existing_user:
                flash('Пользователь с таким именем уже существует', 'danger')
            else:
                user = User(username=username)
                user.set_password(password)
                db.session.add(user)
                db.session.commit()
                
                # Автоматически входим после регистрации
                login_user(user)
                flash(f'Добро пожаловать, {username}! Регистрация успешно завершена.', 'success')
                return redirect(url_for('index'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы', 'info')
    return redirect(url_for('login'))

# ========== ЗАЩИЩЕННЫЕ МАРШРУТЫ ==========

@app.route('/')
@login_required
def index():
    return render_template('index.html')

# ---------- Фабрики ----------
@app.route('/factories')
@login_required
def list_factories():
    factories = Factory.query.all()
    return render_template('factories.html', factories=factories)

@app.route('/factories/create', methods=['POST'])
@login_required
def create_factory():
    name = request.form.get('name')
    if name:
        existing = Factory.query.filter(func.lower(Factory.name) == func.lower(name)).first()
        if existing:
            return jsonify({'success': False, 'error': f'Фабрика с названием "{name}" уже существует!'}), 400
        
        factory = Factory(name=name)
        db.session.add(factory)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Название не может быть пустым'}), 400

@app.route('/factories/<int:id>/update', methods=['POST'])
@login_required
def update_factory(id):
    factory = Factory.query.get(id)
    if factory:
        name = request.form.get('name')
        if name:
            existing = Factory.query.filter(
                func.lower(Factory.name) == func.lower(name),
                Factory.id != id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': f'Фабрика с названием "{name}" уже существует!'}), 400
            
            factory.name = name
            db.session.commit()
            return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Объект не найден'}), 404

@app.route('/factories/<int:id>/delete')
@login_required
def delete_factory(id):
    factory = Factory.query.get(id)
    if factory:
        db.session.delete(factory)
        db.session.commit()
    return redirect(url_for('list_factories'))

# ---------- Участки ----------
@app.route('/sections')
@login_required
def list_sections():
    sections = Section.query.all()
    factories = Factory.query.all()
    return render_template('sections.html', sections=sections, factories=factories)

@app.route('/sections/create', methods=['POST'])
@login_required
def create_section():
    name = request.form.get('name')
    factory_id = request.form.get('factory_id')
    if name and factory_id:
        existing = Section.query.filter(
            func.lower(Section.name) == func.lower(name),
            Section.factory_id == int(factory_id)
        ).first()
        if existing:
            return jsonify({'success': False, 'error': f'На этой фабрике уже есть участок с названием "{name}"!'}), 400
        
        section = Section(name=name, factory_id=int(factory_id))
        db.session.add(section)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Название и фабрика обязательны'}), 400

@app.route('/sections/<int:id>/update', methods=['POST'])
@login_required
def update_section(id):
    section = Section.query.get(id)
    if section:
        name = request.form.get('name')
        factory_id = request.form.get('factory_id')
        
        if name:
            existing = Section.query.filter(
                func.lower(Section.name) == func.lower(name),
                Section.factory_id == int(factory_id),
                Section.id != id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': f'На этой фабрике уже есть участок с названием "{name}"!'}), 400
            
            section.name = name
        
        if factory_id:
            section.factory_id = int(factory_id)
        
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Объект не найден'}), 404

@app.route('/sections/<int:id>/delete')
@login_required
def delete_section(id):
    section = Section.query.get(id)
    if section:
        db.session.delete(section)
        db.session.commit()
    return redirect(url_for('list_sections'))

# ---------- Оборудование ----------
@app.route('/equipments')
@login_required
def list_equipments():
    equipments = Equipment.query.all()
    sections = Section.query.all()
    return render_template('equipments.html', equipments=equipments, sections=sections)

@app.route('/equipments/create', methods=['POST'])
@login_required
def create_equipment():
    name = request.form.get('name')
    section_ids = request.form.getlist('section_ids')
    
    if name:
        existing = Equipment.query.filter(func.lower(Equipment.name) == func.lower(name)).first()
        if existing:
            return jsonify({'success': False, 'error': f'Оборудование с названием "{name}" уже существует!'}), 400
        
        equipment = Equipment(name=name)
        db.session.add(equipment)
        db.session.flush()
        
        for section_id in section_ids:
            section = Section.query.get(int(section_id))
            if section:
                equipment.sections.append(section)
        
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Название не может быть пустым'}), 400

@app.route('/equipments/<int:id>/update', methods=['POST'])
@login_required
def update_equipment(id):
    equipment = Equipment.query.get(id)
    if equipment:
        name = request.form.get('name')
        
        if name:
            existing = Equipment.query.filter(
                func.lower(Equipment.name) == func.lower(name),
                Equipment.id != id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': f'Оборудование с названием "{name}" уже существует!'}), 400
            
            equipment.name = name
        
        equipment.sections.clear()
        
        section_ids = request.form.getlist('section_ids')
        for section_id in section_ids:
            section = Section.query.get(int(section_id))
            if section:
                equipment.sections.append(section)
        
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Объект не найден'}), 404

@app.route('/equipments/<int:id>/delete')
@login_required
def delete_equipment(id):
    equipment = Equipment.query.get(id)
    if equipment:
        db.session.delete(equipment)
        db.session.commit()
    return redirect(url_for('list_equipments'))

# ---------- Просмотр родителей/детей ----------
@app.route('/relations/<string:type>/<int:id>')
@login_required
def view_relations(type, id):
    parents = get_all_parents(type, id)
    children = get_all_children(type, id)
    
    names = {
        'factory': 'Фабрика',
        'section': 'Участок',
        'equipment': 'Оборудование'
    }
    
    return render_template('relations.html', 
                         item_type=type, 
                         item_id=id,
                         type_name=names.get(type, type),
                         parents=parents, 
                         children=children)

@app.route('/equipments/<int:id>/sections')
@login_required
def get_equipment_sections(id):
    equipment = Equipment.query.get(id)
    if equipment:
        section_ids = [s.id for s in equipment.sections]
        return jsonify({'section_ids': section_ids})
    return jsonify({'section_ids': []})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)