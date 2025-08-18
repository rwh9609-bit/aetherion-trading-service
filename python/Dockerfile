FROM python:3.10-slim
WORKDIR /app/python
COPY python/requirements.txt /app/python/requirements.txt
COPY python /app/python
COPY data /app/python/data
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
