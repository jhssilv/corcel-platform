# Setting Up NVIDIA GPU Support for Docker (Ollama)

If you encounter the error `could not select device driver "nvidia" with capabilities: [[gpu]]` when spinning up the containers, your Docker host needs the **NVIDIA Container Toolkit** to interface properly with your GPU.

This guide covers the setup for a Linux host (Ubuntu/Debian-based).

## Prerequisites
- An NVIDIA GPU in your host machine.
- NVIDIA drivers already installed on the host (verify by running `nvidia-smi` on the host).
- Docker installed.

## Installation Steps

### 1. Set up the repository and GPG key
Run the following command to add the NVIDIA Container Toolkit GPG key and APT repository:

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
```

### 2. Update the package list and install the toolkit
```bash
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
```

### 3. Configure Docker to use the NVIDIA runtime
Update the Docker daemon configuration to recognize the NVIDIA container runtime:
```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

### 4. Restart the Docker daemon
Apply the configuration changes by restarting the Docker service:
```bash
sudo systemctl restart docker
```

### 5. Verify the installation
Test that Docker can now successfully map your GPU to containers by running:
```bash
docker run --rm --gpus all nvidia/cuda:12.3.2-base-ubuntu22.04 nvidia-smi
```
If this command outputs the standard `nvidia-smi` table showing your GPU details, you're good to go!

## Running the Application

The `docker-compose.yml` is already configured to request GPU deployment for the `ollama` service. Once the toolkit is installed and Docker is restarted, simply start your project:

```bash
docker compose up --build -d
```
