from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, func
from datetime import datetime, timezone, timedelta
import uuid
from flask_wtf import CSRFProtect
import boto3
from botocore.config import Config
from flask_apscheduler import APScheduler

# Carrega as variáveis de ambiente do arquivo .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

app = Flask(__name__)
csrf = CSRFProtect()
db = SQLAlchemy()
scheduler = APScheduler()

ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'webm'}

def allowed_video(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

# Configuração do Flask
secret_key = os.getenv('SECRET_KEY')
if not secret_key:
    print("AVISO: SECRET_KEY não encontrada nas variáveis de ambiente")
    secret_key = 'chave-temporaria-para-desenvolvimento'  # Chave temporária para desenvolvimento

app.config['SECRET_KEY'] = secret_key
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializa o banco de dados
db.init_app(app)
csrf.init_app(app)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

class Paciente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20), nullable=False)
    cpf = db.Column(db.String(14), unique=True, nullable=False)
    nascimento = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at = db.Column(db.DateTime(timezone=True))
    videos = db.relationship('Video', backref='paciente', lazy=True)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    url = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    paciente_id = db.Column(db.Integer, db.ForeignKey('paciente.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'url': self.url,
            'created_at': self.created_at.isoformat(),
            'paciente_id': self.paciente_id
        }

class Medico(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    crm = db.Column(db.String(20), unique=True, nullable=False)
    especialidade = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'crm': self.crm,
            'especialidade': self.especialidade
        }

# Cria as tabelas se não existirem
def init_db():
    with app.app_context():
        try:
            # Verifica se as tabelas existem
            with db.engine.connect() as conn:
                # Tenta acessar cada tabela
                for table in ['user', 'paciente', 'video', 'medico']:
                    try:
                        conn.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                        print(f"Tabela {table} já existe!")
                    except Exception:
                        print(f"Tabela {table} não existe. Criando todas as tabelas...")
                        db.create_all()
                        print("Tabelas criadas com sucesso!")
                        
                        # Adiciona médicos de exemplo
                        medicos_exemplo = [
                            Medico(nome="Dr. João Silva", crm="12345-SP", especialidade="Pediatra"),
                            Medico(nome="Dra. Maria Santos", crm="67890-SP", especialidade="Ginecologista"),
                            Medico(nome="Dr. Pedro Oliveira", crm="54321-SP", especialidade="Clínico Geral")
                        ]
                        
                        for medico in medicos_exemplo:
                            if not Medico.query.filter_by(crm=medico.crm).first():
                                db.session.add(medico)
                        
                        db.session.commit()
                        print("Médicos de exemplo adicionados com sucesso!")
                        break
                conn.commit()
        except Exception as e:
            print(f"Erro ao verificar/criar tabelas: {str(e)}")
            raise e

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
        print("Erro: Nenhum arquivo enviado")
        return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'})

    video = request.files['video']
    if video.filename == '' or not allowed_video(video.filename):
        print(f"Erro: Arquivo de vídeo inválido - {video.filename}")
        return jsonify({'success': False, 'message': 'Arquivo de vídeo inválido'})
    
    if video:
        try:
            print("Iniciando upload do vídeo...")
            # Salva o arquivo e obtém a URL
            url = salvar_arquivo(video)
            print(f"URL do vídeo gerada: {url}")
            
            # Cria o novo vídeo no banco de dados
            novo_video = Video(
                titulo=request.form.get('titulo'),
                descricao=request.form.get('descricao'),
                paciente_id=request.form.get('paciente_id'),
                url=url
            )
            
            db.session.add(novo_video)
            db.session.commit()
            print("Vídeo salvo no banco de dados com sucesso")
            
            return jsonify({
                'success': True,
                'video': novo_video.to_dict()
            })
        except Exception as e:
            print(f"Erro ao processar o vídeo: {str(e)}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Erro ao processar o vídeo: {str(e)}'
            })
    
    return jsonify({'success': False, 'message': 'Erro ao processar o vídeo'})

@app.route('/videos_paciente')
@login_required
def videos_paciente():
    if session.get('tipo_usuario') == 'paciente':
        paciente_id = session.get('paciente_id')
    else:
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
    if session.get('tipo_usuario') == 'paciente' and video.paciente_id != session.get('paciente_id'):
        return jsonify({'success': False, 'message': 'Não autorizado'}), 403

    db.session.delete(video)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/consulta/<int:paciente_id>')
@login_required
def consulta(paciente_id):
    paciente = db.session.get(Paciente, paciente_id)
    if not paciente:
        flash('Paciente não encontrado', 'error')
        return redirect(url_for('dashboard'))
    
    medicos = Medico.query.order_by(Medico.nome).all()
    return render_template('consulta.html', paciente=paciente, medicos=medicos)


@app.route('/salvar_consulta', methods=['POST'])
@login_required
def salvar_consulta():
    # Endpoint de exemplo para gravar dados de consulta
    # Implementação real dependerá da modelagem de dados
    return jsonify({'success': True})

@app.route('/novo_medico', methods=['POST'])
@login_required
def novo_medico():
    nome = request.form.get('nome')
    crm = request.form.get('crm')
    especialidade = request.form.get('especialidade')

    # Verifica se já existe médico com o mesmo CRM
    if Medico.query.filter_by(crm=crm).first():
        return jsonify({
            'success': False,
            'message': 'Já existe um médico cadastrado com este CRM.'
        }), 400

    try:
        medico = Medico(
            nome=nome,
            crm=crm,
            especialidade=especialidade
        )
        db.session.add(medico)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medico': medico.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro ao cadastrar médico: {str(e)}'
        }), 500

@app.route('/medicos')
@login_required
def medicos():
    medicos = Medico.query.order_by(Medico.nome).all()
    return render_template('medicos.html', medicos=medicos)

@app.route('/medico/<int:id>')
@login_required
def get_medico(id):
    medico = db.session.get(Medico, id)
    if not medico:
        return jsonify({'error': 'Médico não encontrado'}), 404
    return jsonify(medico.to_dict())

@app.route('/editar_medico', methods=['POST'])
@login_required
def editar_medico():
    data = request.form
    medico = db.session.get(Medico, data['id'])
    if not medico:
        return jsonify({
            'success': False,
            'message': 'Médico não encontrado.'
        })
    
    # Verifica se o CRM já existe para outro médico
    if data['crm'] != medico.crm:
        if Medico.query.filter_by(crm=data['crm']).first():
            return jsonify({
                'success': False,
                'message': 'Já existe um médico cadastrado com este CRM.'
            })
    
    try:
        medico.nome = data['nome']
        medico.crm = data['crm']
        medico.especialidade = data['especialidade']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medico': medico.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Erro ao atualizar médico.'
        })

@app.route('/excluir_medico/<int:id>', methods=['POST'])
@login_required
def excluir_medico(id):
    medico = db.session.get(Medico, id)
    if not medico:
        return jsonify({
            'success': False,
            'message': 'Médico não encontrado.'
        })
    
    try:
        db.session.delete(medico)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Médico excluído com sucesso!'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Erro ao excluir médico.'
        })

def salvar_arquivo(arquivo):
    print("Iniciando configuração do cliente S3...")
    
    # Verifica se todas as variáveis de ambiente necessárias estão presentes
    required_env_vars = [
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_PUBLIC_ACCESS_KEY',
        'CLOUDFLARE_SECRET_ACCESS_KEY',
        'CLOUDFLARE_BUCKET_NAME',
        'CLOUDFLARE_PUBLIC_URL_STORAGE'
    ]
    
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        error_msg = f"Variáveis de ambiente ausentes: {', '.join(missing_vars)}"
        print(f"ERRO: {error_msg}")
        raise Exception(error_msg)
    
    print("Variáveis de ambiente verificadas com sucesso")
    print(f"Account ID: {os.getenv('CLOUDFLARE_ACCOUNT_ID')}")
    print(f"Bucket Name: {os.getenv('CLOUDFLARE_BUCKET_NAME')}")
    print(f"Public URL: {os.getenv('CLOUDFLARE_PUBLIC_URL_STORAGE')}")
    
    try:
        # Configuração do cliente S3 para Cloudflare R2
        s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{os.getenv("CLOUDFLARE_ACCOUNT_ID")}.r2.cloudflarestorage.com',
            aws_access_key_id=os.getenv('CLOUDFLARE_PUBLIC_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('CLOUDFLARE_SECRET_ACCESS_KEY'),
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        print("Cliente S3 configurado com sucesso")

        # Gera um nome único para o arquivo
        extensao = os.path.splitext(arquivo.filename)[1]
        nome_arquivo = f"{uuid.uuid4()}{extensao}"
        
        # Define o caminho no bucket
        caminho_bucket = f"babyvideos/{nome_arquivo}"
        print(f"Caminho do bucket: {caminho_bucket}")
        
        print("Iniciando upload do arquivo para o R2...")
        # Faz upload do arquivo para o R2
        s3_client.upload_fileobj(
            arquivo,
            os.getenv('CLOUDFLARE_BUCKET_NAME'),
            caminho_bucket,
            ExtraArgs={'ContentType': arquivo.content_type}
        )
        print("Upload concluído com sucesso")
        
        # Retorna a URL pública do arquivo
        url = f"https://{os.getenv('CLOUDFLARE_PUBLIC_URL_STORAGE')}/{caminho_bucket}"
        print(f"URL pública gerada: {url}")
        return url
    except Exception as e:
        error_msg = f"Erro detalhado ao fazer upload: {str(e)}"
        print(f"ERRO: {error_msg}")
        print(f"Tipo do erro: {type(e).__name__}")
        if hasattr(e, 'response'):
            print(f"Resposta do erro: {e.response}")
        raise Exception(error_msg)

def delete_old_videos():
    """Delete videos that are older than 7 days"""
    with app.app_context():
        try:
            # Calculate the date 7 days ago
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            
            # Find and delete old videos
            old_videos = Video.query.filter(Video.created_at < seven_days_ago).all()
            
            if old_videos:
                print(f"Found {len(old_videos)} videos com 7 dias:")
                for video in old_videos:
                    print(f"- Video ID: {video.id}, Created at: {video.created_at}")
                    db.session.delete(video)
                
                db.session.commit()
                print(f" {len(old_videos)} Videos antigos deletados com sucesso")
            else:
                print("Nenhum video de 7 dias encontrado")
        except Exception as e:
            print(f"Erro ao deletar videos: {str(e)}")
            db.session.rollback()

# Configuração do scheduler
scheduler.init_app(app)
scheduler.add_job(id='delete_old_videos',
                 func=delete_old_videos,
                 trigger='interval',
                 hours=24)
scheduler.start()

if __name__ == '__main__':
    debug = os.getenv("FLASK_DEBUG") == "1"
    app.run(debug=True, host='0.0.0.0', port=5000)
