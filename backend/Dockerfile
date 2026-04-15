FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg fonts-thai-tlwg wget fontconfig && \
    mkdir -p /usr/share/fonts/truetype/google-thai && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/kanit/Kanit-Bold.ttf" \
         -O /usr/share/fonts/truetype/google-thai/Kanit-Bold.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-SemiBold.ttf" \
         -O /usr/share/fonts/truetype/google-thai/Prompt-SemiBold.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf" \
         -O /usr/share/fonts/truetype/google-thai/Sarabun-Bold.ttf && \
    fc-cache -fv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DJANGO_SETTINGS_MODULE=config.settings
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
