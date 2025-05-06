from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from models import db, User, Paciente, Video
from datetime import datetime, timezone
from sqlalchemy import text
import uuid

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'sua_chave_secreta_aqui')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializa o banco de dados
db.init_app(app)

# Cria as tabelas se não existirem
def init_db():
    with app.app_context():
        try:
            # Verifica se as tabelas existem
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1 FROM paciente LIMIT 1"))
                conn.commit()
        except Exception:
            # Se não existirem, cria as tabelas
            db.create_all()
            print("Tabelas criadas com sucesso!")

# Inicializa o banco de dados
init_db()

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
        tipo = request.form.get('tipo')
        
        # Login de paciente
        if tipo == 'paciente':
            cpf = request.form.get('cpf')
            nascimento = request.form.get('nascimento')
            
            paciente = Paciente.query.filter_by(cpf=cpf).first()
            if paciente and str(paciente.nascimento) == nascimento:
                session['paciente_id'] = paciente.id
                session['paciente_nome'] = paciente.nome
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
    
    # Verifica o tipo de login na URL para mostrar o formulário correto
    tipo = request.args.get('tipo', 'clinica')
    return render_template('login.html', tipo=tipo)

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
    # Busca todos os pacientes não excluídos ordenados por data de criação
    pacientes = Paciente.query.filter_by(deleted_at=None).order_by(Paciente.created_at.desc()).all()
    
    # Calcula o primeiro dia do mês atual (com timezone UTC)
    primeiro_dia_mes = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Filtra pacientes do mês, garantindo que todas as datas estejam em UTC
    pacientes_mes = [
        p for p in pacientes 
        if p.created_at.replace(tzinfo=timezone.utc) >= primeiro_dia_mes
    ]
    
    return render_template('dashboard.html', 
                         pacientes=pacientes,
                         total_pacientes=len(pacientes),
                         pacientes_mes=len(pacientes_mes))

@app.route('/dashboard_paciente')
def dashboard_paciente():
    if 'paciente_id' not in session or session.get('tipo_usuario') != 'paciente':
        flash('Por favor, faça login primeiro', 'error')
        return redirect(url_for('login'))
    
    paciente = db.session.get(Paciente, session['paciente_id'])
    if not paciente:
        session.clear()
        flash('Paciente não encontrado', 'error')
        return redirect(url_for('login'))
    
    videos = Video.query.filter_by(paciente_id=paciente.id).order_by(Video.created_at.desc()).all()
    return render_template('dashboard_paciente.html', paciente=paciente, videos=videos)

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
        return jsonify({
            'success': False,
            'message': 'Já existe um paciente cadastrado com este CPF.'
        }), 400

    try:
        paciente = Paciente(
            nome=nome,
            telefone=telefone,
            cpf=cpf,
            nascimento=nascimento
        )
        db.session.add(paciente)
        db.session.commit()
        
        # Retorna os dados do novo paciente
        return jsonify({
            'success': True,
            'id': paciente.id,
            'nome': paciente.nome,
            'telefone': paciente.telefone,
            'cpf': paciente.cpf,
            'nascimento': paciente.nascimento.strftime('%d/%m/%Y')
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Erro ao cadastrar paciente.'
        }), 500

@app.route('/paciente/<int:id>')
@login_required
def get_paciente(id):
    paciente = db.session.get(Paciente, id)
    if not paciente:
        return jsonify({'error': 'Paciente não encontrado'}), 404
    return jsonify({
        'id': paciente.id,
        'nome': paciente.nome,
        'telefone': paciente.telefone,
        'cpf': paciente.cpf,
        'nascimento': paciente.nascimento.strftime('%Y-%m-%d')
    })

@app.route('/editar_paciente', methods=['POST'])
@login_required
def editar_paciente():
    data = request.get_json()
    paciente = db.session.get(Paciente, data['id'])
    if not paciente:
        return jsonify({
            'success': False,
            'message': 'Paciente não encontrado.'
        })
    
    # Verifica se o CPF já existe para outro paciente
    if data['cpf'] != paciente.cpf:
        if Paciente.query.filter_by(cpf=data['cpf']).first():
            return jsonify({
                'success': False,
                'message': 'Já existe um paciente cadastrado com este CPF.'
            })
    
    try:
        paciente.nome = data['nome']
        paciente.telefone = data['telefone']
        paciente.cpf = data['cpf']
        paciente.nascimento = datetime.strptime(data['nascimento'], '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'paciente': {
                'id': paciente.id,
                'nome': paciente.nome,
                'telefone': paciente.telefone,
                'cpf': paciente.cpf,
                'nascimento': paciente.nascimento.strftime('%d/%m/%Y')
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Erro ao atualizar paciente.'
        })

@app.route('/excluir_paciente/<int:id>', methods=['POST'])
@login_required
def excluir_paciente(id):
    paciente = db.session.get(Paciente, id)
    if not paciente:
        return jsonify({
            'success': False,
            'message': 'Paciente não encontrado.'
        })
    
    try:
        # Soft delete - apenas marca como excluído
        paciente.deleted_at = datetime.now(timezone.utc)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Paciente excluído com sucesso!'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Erro ao excluir paciente.'
        })

@app.route('/babyvideo/<int:paciente_id>')
@login_required
def babyvideo(paciente_id):
    paciente = db.session.get(Paciente, paciente_id)
    if not paciente:
        flash('Paciente não encontrado', 'error')
        return redirect(url_for('dashboard'))
    videos = Video.query.filter_by(paciente_id=paciente_id).order_by(Video.created_at.desc()).all()
    return render_template('babyvideo.html', paciente=paciente, videos=videos)

@app.route('/novo_video', methods=['POST'])
@login_required
def novo_video():
    if 'video' not in request.files:
        return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'})
    
    video = request.files['video']
    if video.filename == '':
        return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'})
    
    if video:
        try:
            # Salva o arquivo e obtém a URL
            url = salvar_arquivo(video)
            
            # Cria o novo vídeo no banco de dados
            novo_video = Video(
                titulo=request.form.get('titulo'),
                descricao=request.form.get('descricao'),
                paciente_id=request.form.get('paciente_id'),
                url=url
            )
            
            db.session.add(novo_video)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'video': novo_video.to_dict()
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Erro ao processar o vídeo: {str(e)}'
            })
    
    return jsonify({'success': False, 'message': 'Erro ao processar o vídeo'})

@app.route('/videos_paciente')
@login_required
def videos_paciente():
    paciente_id = request.args.get('paciente_id')
    videos = Video.query.filter_by(paciente_id=paciente_id).order_by(Video.created_at.desc()).all()
    return jsonify({
        'success': True,
        'videos': [video.to_dict() for video in videos]
    })

@app.route('/excluir_video/<int:video_id>', methods=['POST'])
@login_required
def excluir_video(video_id):
    video = Video.query.get_or_404(video_id)
    db.session.delete(video)
    db.session.commit()
    return jsonify({'success': True})

def salvar_arquivo(arquivo):
    # Usa a pasta videos existente
    upload_dir = os.path.join(app.static_folder, 'videos')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Gera um nome único para o arquivo
    extensao = os.path.splitext(arquivo.filename)[1]
    nome_arquivo = f"{uuid.uuid4()}{extensao}"
    
    # Salva o arquivo
    caminho_arquivo = os.path.join(upload_dir, nome_arquivo)
    arquivo.save(caminho_arquivo)
    
    # Retorna a URL relativa do arquivo
    return f"/static/videos/{nome_arquivo}"

if __name__ == '__main__':
    app.run(debug=True) 