# Free Hugging Face Space (Docker SDK, "CPU basic"): 2 vCPU, 16 GB RAM.
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH PYTHONUNBUFFERED=1 LIPI_THREADS=2
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
# The library pins old versions of everything; install its code only, dependencies come from requirements.txt.
RUN git clone --depth 1 https://github.com/Bhashini-IITJ/IndicPhotoOCR.git /home/user/ipo && \
    pip install --no-cache-dir --user --no-deps -e /home/user/ipo
# English reader is fetched through torch.hub; trust it without an interactive prompt.
RUN mkdir -p $HOME/.cache/torch/hub && echo baudm_parseq > $HOME/.cache/torch/hub/trusted_list
COPY --chown=user app.py .
# Download all model weights at build time so a restart never re-downloads them.
RUN python -c "import app, time; app._ready.wait(900); print('models ready', app._ready.is_set())"
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
