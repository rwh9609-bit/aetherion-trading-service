FROM python:3.10-slim
WORKDIR /app
COPY . /app/python
COPY protos /app/protos
# COPY data /app/python/data
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
ENV PYTHONPATH=/app:/app/python:/app/protos
EXPOSE 8000
CMD ["uvicorn", "python.app:app", "--host", "0.0.0.0", "--port", "8000"]