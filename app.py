import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
from werkzeug.utils import secure_filename
import click

# --- APP CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-super-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///skill_tracker.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER # Add upload folder to config
db = SQLAlchemy(app)

# Helper function to check for allowed file extensions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    role = db.Column(db.String(20), nullable=False)
    skills = db.relationship('Skill', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "department": self.department, "role": self.role}

class Skill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    skill_name = db.Column(db.String(100), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    evidence = db.Column(db.String(200))
    status = db.Column(db.String(20), nullable=False, default='Pending')
    feedback = db.Column(db.Text, nullable=True) # New column for feedback

    def to_dict(self):
        return {"id": self.id, "user_id": self.user_id, "skillName": self.skill_name, "level": self.level, "evidence": self.evidence, "status": self.status, "feedback": self.feedback}

# --- DATABASE COMMAND ---
@app.cli.command('init-db')
def init_db_command():
    """Clears the existing data and creates new tables."""
    db.create_all()
    # Also ensure the uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    click.echo('Initialized the database.')


# --- AUTHENTICATION HELPERS ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

def faculty_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'faculty':
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function


# --- HTML PAGE SERVING ROUTES ---
@app.route('/')
def login_page(): return render_template('index.html')
@app.route('/register')
def register_page(): return render_template('register.html')
@app.route('/student/home')
@login_required
def student_home_page(): return render_template('student/student-home.html')
@app.route('/student/add-skill')
@login_required
def add_skill_page(): return render_template('student/add-skill.html')
@app.route('/student/my-skills')
@login_required
def my_skills_page(): return render_template('student/my-skills.html')
@app.route('/faculty/dashboard')
@faculty_required
def faculty_dashboard_page(): return render_template('faculty/fac-dashboard.html')

# --- ROUTE TO SERVE UPLOADED FILES ---
@app.route('/uploads/<filename>')
@login_required
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- API ENDPOINTS ---
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 409
    new_user = User(name=data['name'], email=data['email'], password=data['password'], department=data.get('department'), role=data['role'])
    db.session.add(new_user)
    db.session.commit()
    session['user_id'] = new_user.id
    session['role'] = new_user.role
    return jsonify(new_user.to_dict()), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email'), role=data.get('role')).first()
    if user and user.password == data.get('password'):
        session['user_id'] = user.id
        session['role'] = user.role
        return jsonify(user.to_dict()), 200
    return jsonify({"error": "Invalid credentials or role"}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/api/current_user')
@login_required
def api_current_user():
    user = User.query.get(session['user_id'])
    return jsonify(user.to_dict()) if user else (jsonify({"error": "User not found"}), 404)

@app.route('/api/skills', methods=['GET', 'POST'])
@login_required
def api_student_skills():
    user_id = session['user_id']
    if request.method == 'POST':
        # THIS IS THE CRITICAL CHANGE: Use request.form and request.files
        if 'skillName' not in request.form:
            return jsonify({"error": "Missing skill name in form"}), 400
        skill_name = request.form['skillName']
        level = request.form['level']
        file = request.files.get('evidence')
        filename = ""
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        new_skill = Skill(user_id=user_id, skill_name=skill_name, level=level, evidence=filename)
        db.session.add(new_skill)
        db.session.commit()
        return jsonify(new_skill.to_dict()), 201

    user_skills = Skill.query.filter_by(user_id=user_id).all()
    return jsonify([skill.to_dict() for skill in user_skills])

@app.route('/api/submissions')
@faculty_required
def api_faculty_submissions():
    submissions = db.session.query(Skill, User).join(User, Skill.user_id == User.id).all()
    result = []
    for skill, user in submissions:
        skill_data = skill.to_dict()
        skill_data['studentName'] = user.name
        skill_data['studentEmail'] = user.email
        result.append(skill_data)
    return jsonify(result)

@app.route('/api/skills/<int:skill_id>/status', methods=['PUT'])
@faculty_required
def api_update_skill_status(skill_id):
    skill = Skill.query.get_or_404(skill_id)
    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ['Validated', 'Rejected']:
        return jsonify({"error": "Invalid status"}), 400
    skill.status = new_status
    db.session.commit()
    return jsonify(skill.to_dict())

# New API endpoint for adding/updating feedback
@app.route('/api/skills/<int:skill_id>/feedback', methods=['POST'])
@faculty_required
def api_add_feedback(skill_id):
    skill = Skill.query.get_or_404(skill_id)
    data = request.get_json()
    skill.feedback = data.get('feedback', '')
    db.session.commit()
    return jsonify(skill.to_dict())


# --- RUN THE APP ---
if __name__ == '__main__':
    app.run(debug=True)

