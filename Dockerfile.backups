FROM alpine:latest

# Install dependencies
RUN apk add --no-cache bash docker-cli postgresql-client

# Create backup directory
RUN mkdir /dumps

# Copy backup script
COPY backups/backup_script.sh /backup_script.sh
COPY backups/entrypoint.sh /entrypoint.sh

RUN chmod +x /backup_script.sh /entrypoint.sh

# Install cron
RUN echo "0 2 * * * /backup_script.sh" > /etc/crontabs/root

# Executes the entrypoint script on startup
ENTRYPOINT ["/entrypoint.sh"]

# Start cron
CMD ["crond", "-f", "-l", "2"]