from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ========== МОДЕЛИ БАЗЫ ДАННЫХ ==========

class Factory(db.Model):
    __tablename__ = 'factories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    
    # Связь с участками
    sections = db.relationship('Section', back_populates='factory', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {'id': self.id, 'name': self.name}

class Section(db.Model):
    __tablename__ = 'sections'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    factory_id = db.Column(db.Integer, db.ForeignKey('factories.id'), nullable=False)
    
    # Связи
    factory = db.relationship('Factory', back_populates='sections')
    equipments = db.relationship('Equipment', secondary='section_equipment', back_populates='sections')

class Equipment(db.Model):
    __tablename__ = 'equipments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    
    # Связь с участками (многие ко многим)
    sections = db.relationship('Section', secondary='section_equipment', back_populates='equipments')

# Связующая таблица для оборудования и участков
section_equipment = db.Table('section_equipment',
    db.Column('section_id', db.Integer, db.ForeignKey('sections.id'), primary_key=True),
    db.Column('equipment_id', db.Integer, db.ForeignKey('equipments.id'), primary_key=True)
)

# ========== ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ВСЕХ РОДИТЕЛЕЙ ==========

def get_all_parents(item_type, item_id):
    """
    Возвращает всех родителей для объекта
    item_type: 'equipment' или 'section'
    """
    if item_type == 'equipment':
        equipment = Equipment.query.get(item_id)
        if not equipment:
            return []
        
        result = []
        for section in equipment.sections:
            # Уровень 1: Участок
            result.append({
                'level': 1,
                'type': 'section',
                'name': section.name,
                'id': section.id
            })
            # Уровень 2: Фабрика (через участок)
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
        # Уровень 1: Фабрика
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
    """
    Возвращает всех детей для объекта
    """
    if item_type == 'factory':
        factory = Factory.query.get(item_id)
        if not factory:
            return []
        
        result = []
        for section in factory.sections:
            # Уровень 1: Участки
            result.append({
                'level': 1,
                'type': 'section',
                'name': section.name,
                'id': section.id
            })
            # Уровень 2: Оборудование на этих участках
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

# ========== МАРШРУТЫ (СТРАНИЦЫ) ==========

@app.route('/')
def index():
    return render_template('index.html')

# ---------- Фабрики ----------
@app.route('/factories')
def list_factories():
    factories = Factory.query.all()
    return render_template('factories.html', factories=factories)

@app.route('/factories/create', methods=['POST'])
def create_factory():
    name = request.form.get('name')
    if name:
        factory = Factory(name=name)
        db.session.add(factory)
        db.session.commit()
    return redirect(url_for('list_factories'))

@app.route('/factories/<int:id>/delete')
def delete_factory(id):
    factory = Factory.query.get(id)
    if factory:
        db.session.delete(factory)
        db.session.commit()
    return redirect(url_for('list_factories'))

# ---------- Участки ----------
@app.route('/sections')
def list_sections():
    sections = Section.query.all()
    factories = Factory.query.all()
    return render_template('sections.html', sections=sections, factories=factories)

@app.route('/sections/create', methods=['POST'])
def create_section():
    name = request.form.get('name')
    factory_id = request.form.get('factory_id')
    if name and factory_id:
        section = Section(name=name, factory_id=int(factory_id))
        db.session.add(section)
        db.session.commit()
    return redirect(url_for('list_sections'))

@app.route('/sections/<int:id>/delete')
def delete_section(id):
    section = Section.query.get(id)
    if section:
        db.session.delete(section)
        db.session.commit()
    return redirect(url_for('list_sections'))

# ---------- Оборудование ----------
@app.route('/equipments')
def list_equipments():
    equipments = Equipment.query.all()
    sections = Section.query.all()
    return render_template('equipments.html', equipments=equipments, sections=sections)

@app.route('/equipments/create', methods=['POST'])
def create_equipment():
    name = request.form.get('name')
    section_ids = request.form.getlist('section_ids')
    
    if name:
        equipment = Equipment(name=name)
        db.session.add(equipment)
        db.session.flush()
        
        for section_id in section_ids:
            section = Section.query.get(int(section_id))
            if section:
                equipment.sections.append(section)
        
        db.session.commit()
    return redirect(url_for('list_equipments'))

@app.route('/equipments/<int:id>/delete')
def delete_equipment(id):
    equipment = Equipment.query.get(id)
    if equipment:
        db.session.delete(equipment)
        db.session.commit()
    return redirect(url_for('list_equipments'))

# ---------- Просмотр родителей/детей ----------
@app.route('/relations/<string:type>/<int:id>')
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

# ========== ЗАПУСК ==========
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)