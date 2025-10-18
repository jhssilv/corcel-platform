import logging
import os
from logging.handlers import RotatingFileHandler

class DownloadLogger:
    """
    Configures and provides a dedicated logger for logging events
    related to the download functionality.
    """
    def __init__(self,
                 log_file='../logs/download.log',
                 log_name='app.download',      
                 level=logging.INFO,
                 max_bytes=10*1024*1024,       # Max file size of 10 MB
                 backup_count=3):              # Number of backup files to keep
        """
        Initializes and configures the logger.

        Args:
            log_file (str): Caminho para o ficheiro onde os logs serão guardados.
            log_name (str): Nome do logger (útil para filtragem).
            level (int): Nível mínimo de logging (ex: logging.INFO, logging.DEBUG).
            max_bytes (int): Tamanho máximo do ficheiro de log antes da rotação.
            backup_count (int): Quantos ficheiros de log antigos manter.
        """
        self.log_file = log_file
        self.log_name = log_name
        self.level = level
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.logger = self._setup_logger()

    def _setup_logger(self):
        """Configures the logger instance with a rotating file handler."""
        logger = logging.getLogger(self.log_name)
        logger.setLevel(self.level)

        # Prevent adding duplicate handlers if the setup is called multiple times
        if logger.hasHandlers():
            logger.handlers.clear()

        # Create the log directory if it doesn't exist
        log_dir = os.path.dirname(self.log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)

        # Configures the handler for file rotation
        file_handler = RotatingFileHandler(
            self.log_file,
            maxBytes=self.max_bytes,
            backupCount=self.backup_count,
            encoding='utf-8'
        )

        # Defines the format of log messages
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)

        # Adds the handler to the logger
        logger.addHandler(file_handler)

        return logger

    def get_logger(self):
        """Returns the configured logger instance."""
        return self.logger

# --- Example of How to Use (in another file) ---
# from .logging_config import DownloadLogger

# Instantiate the logger (can be done once at the start of your route module)
# download_log_manager = DownloadLogger()
# logger = download_log_manager.get_logger()

# Use the logger
# logger.info("Starting download process for user X.")
# logger.error("Failed to create zip file.", exc_info=True) # exc_info=True adds the traceback