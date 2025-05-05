from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from models import db, User, Paciente

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'sua_chave_secreta_aqui')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Verifica se é login de paciente
        if 'cpf' in request.form:
            cpf = request.form.get('cpf')
            nascimento = request.form.get('nascimento')
            
            paciente = Paciente.query.filter_by(cpf=cpf).first()
            if paciente and str(paciente.nascimento) == nascimento:
                session['paciente_id'] = paciente.id
                session['tipo_usuario'] = 'paciente'
                flash('Login realizado com sucesso!', 'success')
                return redirect(url_for('dashboard_paciente'))
            flash('CPF ou data de nascimento inválidos', 'error')
            return render_template('login.html')
            
        # Login de usuário clínica
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            session['tipo_usuario'] = 'clinica'
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('dashboard'))
        flash('Usuário ou senha inválidos', 'error')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('Nome de usuário já existe', 'error')
            return redirect(url_for('register'))
            
        if User.query.filter_by(email=email).first():
            flash('Email já cadastrado', 'error')
            return redirect(url_for('register'))
            
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('Registro realizado com sucesso! Faça login para continuar.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/dashboard_paciente')
def dashboard_paciente():
    if 'paciente_id' not in session:
        flash('Por favor, faça login primeiro', 'error')
        return redirect(url_for('login'))
        
    paciente = Paciente.query.get(session['paciente_id'])
    if not paciente:
        session.clear()
        flash('Paciente não encontrado', 'error')
        return redirect(url_for('login'))
        
    return render_template('dashboard_paciente.html', paciente=paciente)

@app.route('/logout')
def logout():
    if 'tipo_usuario' in session:
        if session['tipo_usuario'] == 'clinica':
            logout_user()
        session.clear()
    flash('Você foi desconectado com sucesso', 'success')
    return redirect(url_for('login'))

@app.route('/novo_paciente', methods=['POST'])
@login_required
def novo_paciente():
    nome = request.form.get('nome')
    telefone = request.form.get('telefone')
    cpf = request.form.get('cpf')
    nascimento = request.form.get('nascimento')

    # Verifica se já existe paciente com o mesmo CPF
    if Paciente.query.filter_by(cpf=cpf).first():
        flash('Já existe um paciente cadastrado com este CPF.', 'error')
        return redirect(url_for('dashboard'))

    try:
        paciente = Paciente(
            nome=nome,
            telefone=telefone,
            cpf=cpf,
            nascimento=nascimento
        )
        db.session.add(paciente)
        db.session.commit()
        flash('Paciente cadastrado com sucesso!', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Erro ao cadastrar paciente.', 'error')
    return redirect(url_for('dashboard'))

if __name__ == '__main__':
    app.run(debug=True) 