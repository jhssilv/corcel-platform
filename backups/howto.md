
# How to create a backup
```sh
chmod +x backup_script.sh
sudo ./backup_script.sh
```

# How to recover a backup
```sh
chmod +x restore.sh
sudo ./restore.sh <dump>
```

# How to build this container
```sh
docker build -t postgres-backup-image .
```

# How to run this container:
```sh
docker run -d \
  --name postgres-backup \
  -v /backups:/backups \
  -v /var/run/docker.sock:/var/run/docker.sock \
  postgres-backup-image
```