"""Background Celery task logic for batch text processing."""

import io
import os
import zipfile

from docx import Document

from ..database import models
from ..database.queries import add_text
from ..logging_config import get_logger
from ..text_pipeline import TextProcessingPipeline

logger = get_logger('app.task.text_task_logic', source='task', task_module='text_task_logic')


def run_process_texts_pipeline(task, text_ids: list):
    from app.extensions import db
    from app.database import models
    from app.database.queries import add_suggestion

    pipeline = TextProcessingPipeline()
    processed_count = 0
    total = len(text_ids)

    logger.info('Background text batch processing started', extra={'event': {'total_texts': total}})

    for index, text_id in enumerate(text_ids):
        task.update_state(
            state='PROGRESS',
            meta={
                'current': index + 1,
                'total': total,
                'status': f'Processando texto {index + 1}/{total}',
            },
        )

        text_obj = db.session.query(models.Text).filter_by(id=text_id).first()
        if not text_obj:
            logger.warning(f'Text {text_id} not found during async processing')
            continue

        try:
            text_obj.processing_status = models.ProcessingStatus.PROCESSING
            db.session.commit()

            token_rows = (
                db.session.query(models.Token)
                .filter_by(text_id=text_id)
                .order_by(models.Token.position)
                .all()
            )

            from ..text_pipeline.models import Token as PipelineToken

            tokens = [
                PipelineToken(
                    idx=t.position,
                    text=t.token_text,
                    is_word=t.is_word,
                    whitespace_after=t.whitespace_after or '',
                )
                for t in token_rows
            ]

            full_text = "".join(t.text + t.whitespace_after for t in tokens)

            processed_data = pipeline.process_tokens(tokens, full_text)

            for position, t_data in processed_data.items():
                if t_data['to_be_normalized']:
                    token = next((t for t in token_rows if t.position == position), None)
                    if token:
                        token.to_be_normalized = True

                        unique_suggestions = list(set(t_data.get('suggestions', [])))
                        for suggestion in unique_suggestions:
                            add_suggestion(text_id, token.id, suggestion, db.session)

            text_obj.processing_status = models.ProcessingStatus.READY
            db.session.commit()
            processed_count += 1

            logger.info(
                'Background text processing finished successfully',
                extra={'event': {'text_id': text_id}},
            )

        except Exception as e:
            db.session.rollback()
            text_obj = db.session.query(models.Text).filter_by(id=text_id).first()
            if text_obj:
                text_obj.processing_status = models.ProcessingStatus.FAILED
                db.session.commit()
            logger.exception(
                f'Failed to process ML pipeline for text {text_id}',
                extra={'event': {'error': str(e)}},
            )

    return {
        'status': 'Concluido',
        'total': total,
        'processed': processed_count,
    }
