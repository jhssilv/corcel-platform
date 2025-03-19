FROM alpine:latest

# Install dependencies
RUN apk add --no-cache bash docker-cli postgresql-client

# Create backup directory
RUN mkdir /backups

# Copy backup script
COPY backup_script.sh /backup_script.sh
RUN chmod +x /backup_script.sh

# Install cron
RUN echo "0 2 * * * /backup_script.sh" > /etc/crontabs/root

# Start cron
CMD ["crond", "-f", "-l", "2"]