FROM python:3.9-slim

WORKDIR /app

# Instala as dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia os arquivos de requisitos primeiro para aproveitar o cache do Docker
COPY requirements.txt .

# Instala as dependências Python
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir psycopg2-binary

# Copia o resto do código
COPY . .

# Expõe a porta que o Flask vai usar
EXPOSE 5000

# Comando para iniciar o aplicativo
CMD ["python", "app.py"] 