"""Background Celery task logic for per-text processing."""

from ..database import models
from ..logging_config import get_logger
from ..text_pipeline import TextProcessingPipeline
from ..text_upload_batches import sync_text_upload_batch_state, utcnow

logger = get_logger('app.task.text_task_logic', source='task', task_module='text_task_logic')


def run_process_single_text_pipeline(task, text_id: int):
    from app.extensions import db
    from app.database.queries import add_suggestion

    pipeline = TextProcessingPipeline()
    text_obj = db.session.get(models.Text, text_id)

    if text_obj is None:
        logger.warning('Text not found during async processing', extra={'event': {'text_id': text_id}})
        return {
            'status': 'Completed',
            'processed': 0,
            'failed_files': [f'text:{text_id}'],
        }

    if text_obj.processing_status == models.ProcessingStatus.READY:
        batch = sync_text_upload_batch_state(db.session, text_obj.upload_batch_id) if text_obj.upload_batch_id else None
        return {
            'status': 'Completed',
            'processed': 1,
            'failed_files': [],
            'batch_id': batch.id if batch else None,
        }

    batch = db.session.get(models.TextUploadBatch, text_obj.upload_batch_id) if text_obj.upload_batch_id else None

    try:
        task.update_state(
            state='PROGRESS',
            meta={
                'current': 1,
                'total': 1,
                'status': f'Processando texto {text_id}',
            },
        )

        text_obj.processing_status = models.ProcessingStatus.PROCESSING
        text_obj.processing_started_at = text_obj.processing_started_at or utcnow()
        text_obj.processing_heartbeat_at = utcnow()
        text_obj.processing_attempts = (text_obj.processing_attempts or 0) + 1
        text_obj.processing_task_id = task.request.id
        text_obj.last_processing_error = None

        if batch is not None:
            batch.status = models.TextUploadBatchStatus.PROCESSING
            batch.processing_started_at = batch.processing_started_at or utcnow()
            batch.processing_finished_at = None

        db.session.commit()

        token_rows = (
            db.session.query(models.Token)
            .filter_by(text_id=text_id)
            .order_by(models.Token.position)
            .all()
        )

        token_ids = [token.id for token in token_rows]
        if token_ids:
            db.session.query(models.TokensSuggestions).filter(
                models.TokensSuggestions.token_id.in_(token_ids)
            ).delete(synchronize_session=False)

        for token in token_rows:
            token.to_be_normalized = False

        db.session.commit()

        from ..text_pipeline.models import Token as PipelineToken

        tokens = [
            PipelineToken(
                idx=token.position,
                text=token.token_text,
                is_word=token.is_word,
                whitespace_after=token.whitespace_after or '',
            )
            for token in token_rows
        ]

        full_text = ''.join(token.text + token.whitespace_after for token in tokens)
        processed_data = pipeline.process_tokens(tokens, full_text)
        text_obj.processing_heartbeat_at = utcnow()

        for position, token_data in processed_data.items():
            token = next((row for row in token_rows if row.position == position), None)
            if token is None:
                continue

            if token_data.get('to_be_normalized'):
                token.to_be_normalized = True

                unique_suggestions = list(dict.fromkeys(token_data.get('suggestions', [])))
                for suggestion in unique_suggestions:
                    add_suggestion(text_id, token.id, suggestion, db.session)

        text_obj.processing_status = models.ProcessingStatus.READY
        text_obj.processing_heartbeat_at = utcnow()
        db.session.commit()

        if batch is not None:
            batch = sync_text_upload_batch_state(db.session, batch.id)

        logger.info(
            'Background text processing finished successfully',
            extra={'event': {'text_id': text_id, 'batch_id': getattr(batch, 'id', None)}},
        )

        return {
            'status': 'Completed',
            'processed': 1,
            'failed_files': [],
            'batch_id': getattr(batch, 'id', None),
        }

    except Exception as exc:
        db.session.rollback()
        text_obj = db.session.get(models.Text, text_id)

        if text_obj is not None:
            text_obj.processing_status = models.ProcessingStatus.FAILED
            text_obj.processing_heartbeat_at = utcnow()
            text_obj.last_processing_error = str(exc)
            db.session.commit()
            failed_file = text_obj.source_file_name or f'text:{text_id}'
        else:
            failed_file = f'text:{text_id}'

        if batch is not None:
            batch.last_error = str(exc)
            db.session.commit()
            batch = sync_text_upload_batch_state(db.session, batch.id)

        logger.exception(
            'Failed to process ML pipeline for text',
            extra={'event': {'text_id': text_id, 'error': str(exc)}},
        )

        return {
            'status': 'Completed',
            'processed': 0,
            'failed_files': [failed_file],
            'batch_id': getattr(batch, 'id', None),
        }
