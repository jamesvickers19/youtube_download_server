# https://fastapi.tiangolo.com/deployment/docker/#dockerfile

FROM python:3.9

RUN apt-get update -qq && apt-get install ffmpeg -y

WORKDIR /app

RUN pip install opentelemetry-distro opentelemetry-exporter-otlp

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./app /app

CMD ["opentelemetry-instrument", "uvicorn", "main:app", "--proxy-headers", "--host", "0.0.0.0", "--port", "8080"]