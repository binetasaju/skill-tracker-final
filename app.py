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
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
db = SQLAlchemy(app)

# Helper function to check for allowed file extensions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# --- DATABASE MODELS (NEW 4-TABLE STRUCTURE) ---

# 1. Department Table
class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    # Relationship: A department has many users
    users = db.relationship('User', backref='department', lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name}

# 2. User Table (Modified)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    
    # This is now a Foreign Key
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=True) 

    # Relationships
    # 'skills' links to the skills this user (student) has submitted
    skills = db.relationship('Skill', backref='student', lazy=True, foreign_keys='Skill.student_id')
    # 'validations' links to the skills this user (faculty) has validated
    validations = db.relationship('Validation', backref='faculty', lazy=True, foreign_keys='Validation.faculty_id')

    def to_dict(self):
        # We also want to send the department name, not just the id
        dept_name = self.department.name if self.department else None
        return {"id": self.id, "name": self.name, "email": self.email, "department": dept_name, "role": self.role}

# 3. Skill Table (Modified)
class Skill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    skill_name = db.Column(db.String(100), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    evidence = db.Column(db.String(200))
    
    # Link to the student who submitted it
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # A Skill has one Validation (one-to-one relationship)
    validation = db.relationship('Validation', backref='skill', uselist=False, lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "student_id": self.student_id, "skillName": self.skill_name, "level": self.level, "evidence": self.evidence}

# 4. Validation Table (New)
class Validation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), nullable=False, default='Pending')
    feedback = db.Column(db.Text, nullable=True)
    
    # Link to the skill being validated (one-to-one)
    skill_id = db.Column(db.Integer, db.ForeignKey('skill.id'), unique=True, nullable=False)
    # Link to the faculty who validated it (can be empty at first)
    faculty_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    def to_dict(self):
        return {"id": self.id, "status": self.status, "feedback": self.feedback, "skill_id": self.skill_id, "faculty_id": self.faculty_id}


# --- DATABASE COMMAND (Modified to add departments) ---
# --- DATABASE COMMAND (Modified to add departments) ---
@app.cli.command('init-db')
def init_db_command():
    """Clears the existing data and creates new tables."""
    db.drop_all() # Drop all tables to be safe
    db.create_all() # Create new tables based on our models
    
    # Also ensure the uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # --- Pre-populate the Department table ---
    print('Adding departments...')
    try:
        # --- NEW LIST OF 6 DEPARTMENTS ---
        dept1 = Department(name="Computer Science")
        dept2 = Department(name="Electronics")
        dept3 = Department(name="Mechanical")
        dept4 = Department(name="Civil Engineering")
        dept5 = Department(name="Chemical Engineering")
        dept6 = Department(name="Information Technology")
        
        db.session.add_all([dept1, dept2, dept3, dept4, dept5, dept6])
        # --- END OF CHANGE ---
        
        db.session.commit()
        print('6 Departments added.')
    except Exception as e:
        db.session.rollback()
        print(f"Error adding departments: {e}")
        
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

@app.route('/api/departments', methods=['GET'])
def api_get_departments():
    try:
        departments = Department.query.all()
        return jsonify([dept.to_dict() for dept in departments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing required fields"}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 409
    
    new_user = User(
        name=data['name'], 
        email=data['email'], 
        password=data['password'], 
        department_id=data.get('department_id'),
        role=data['role']
    )
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


# --- (NEW/MODIFIED SKILL ROUTES START HERE) ---

@app.route('/api/skills', methods=['GET', 'POST'])
@login_required
def api_student_skills():
    student_user_id = session['user_id']
    
    # --- POST (Add a New Skill) ---
    if request.method == 'POST':
        if 'skillName' not in request.form:
            return jsonify({"error": "Missing skill name in form"}), 400
            
        skill_name = request.form['skillName']
        level = request.form['level']
        file = request.files.get('evidence')
        filename = ""

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        
        # 1. Create the new Skill
        new_skill = Skill(
            student_id=student_user_id, 
            skill_name=skill_name, 
            level=level, 
            evidence=filename
        )
        db.session.add(new_skill)
        db.session.flush() # Use flush to get the new_skill.id before committing

        # 2. Create the associated Validation entry
        new_validation = Validation(
            skill_id=new_skill.id,
            status='Pending' # Default status
        )
        db.session.add(new_validation)
        
        try:
            db.session.commit()
            
            # Return the skill, but add the validation info
            skill_dict = new_skill.to_dict()
            skill_dict['status'] = new_validation.status
            skill_dict['feedback'] = new_validation.feedback
            return jsonify(skill_dict), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    # --- GET (Get My Skills) ---
    # This query joins Skill and Validation to get all data in one go.
    skills_with_validation = db.session.query(Skill, Validation).\
        join(Validation, Skill.id == Validation.skill_id).\
        filter(Skill.student_id == student_user_id).all()

    result = []
    for skill, validation in skills_with_validation:
        skill_dict = skill.to_dict()
        skill_dict['status'] = validation.status
        skill_dict['feedback'] = validation.feedback
        result.append(skill_dict)
        
    return jsonify(result)

# --- (NEW/MODIFIED FACULTY ROUTES START HERE) ---

@app.route('/api/submissions')
@faculty_required
def api_faculty_submissions():
    # --- THIS IS THE UPDATED LOGIC ---
    # Get the logged-in faculty's ID
    faculty_user_id = session['user_id']
    
    # Find the faculty's department ID
    faculty_user = User.query.get(faculty_user_id)
    faculty_dept_id = faculty_user.department_id

    # If the faculty has no department, they can't see any submissions
    if not faculty_dept_id:
        return jsonify([]) # Return an empty list

    # This query now joins Skill, Validation, and User (student)
    # AND filters where the User's (student's) department_id
    # matches the faculty's department_id
    submissions = db.session.query(Skill, Validation, User).\
        join(Validation, Skill.id == Validation.skill_id).\
        join(User, Skill.student_id == User.id).\
        filter(User.department_id == faculty_dept_id).all()  # <--- THIS IS THE FIX
    # --- END OF UPDATED LOGIC ---
        
    result = []
    for skill, validation, student in submissions:
        data = skill.to_dict()
        data['status'] = validation.status
        data['feedback'] = validation.feedback
        data['studentName'] = student.name
        data['studentEmail'] = student.email
        # We also want to send the validation ID for updates
        data['validation_id'] = validation.id
        result.append(data)
        
    return jsonify(result)

@app.route('/api/validation/<int:validation_id>/status', methods=['PUT'])
@faculty_required
def api_update_skill_status(validation_id):
    validation = Validation.query.get_or_404(validation_id)
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['Validated', 'Rejected']:
        return jsonify({"error": "Invalid status"}), 400
        
    validation.status = new_status
    validation.faculty_id = session['user_id'] # Track which faculty member did it
    db.session.commit()
    
    return jsonify(validation.to_dict())

@app.route('/api/validation/<int:validation_id>/feedback', methods=['POST'])
@faculty_required
def api_add_feedback(validation_id):
    validation = Validation.query.get_or_404(validation_id)
    data = request.get_json()
    
    validation.feedback = data.get('feedback', '')
    validation.faculty_id = session['user_id'] # Track which faculty member did it
    db.session.commit()
    
    return jsonify(validation.to_dict())


# --- RUN THE APP ---
if __name__ == '__main__':
    app.run(debug=True)