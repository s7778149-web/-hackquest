FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY ftp_server.py .
RUN mkdir -p /logs /ftp_root
EXPOSE 21
CMD ["python", "ftp_server.py"]