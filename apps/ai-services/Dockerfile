FROM python:3.11.14-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential cmake pkg-config libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY apps/ai-services/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
  && pip install --no-cache-dir -r requirements.txt

COPY apps/ai-services/app ./app
COPY apps/ai-services/models ./models

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
