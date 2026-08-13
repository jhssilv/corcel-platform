from app.text_pipeline.pipeline import (
    _phase2_llm_corrections,
    process_tokens,
)
from app.text_pipeline.models import Token
import app.text_pipeline.pipeline as pipeline_mod


def test_pipeline_does_not_initialize_llm_when_disabled(mocker):
    mocker.patch('app.text_pipeline.pipeline.cfg.ignore_llm_if_on_cpu', return_value=True)
    mocker.patch('app.text_pipeline.pipeline.cfg.llm_device', return_value='cpu')
    llm_ctor = mocker.patch('app.text_pipeline.llm_client.OllamaClient')
    mocker.patch('app.text_pipeline.pipeline._llm', None)

    assert _phase2_llm_corrections('texto qualquer') is None
    llm_ctor.assert_not_called()


def test_pipeline_initializes_llm_lazily_when_enabled(mocker):
    mocker.patch('app.text_pipeline.pipeline.cfg.ignore_llm_if_on_cpu', return_value=False)
    mocker.patch('app.text_pipeline.pipeline.cfg.llm_device', return_value='cpu')
    llm_instance = mocker.Mock()
    llm_instance.get_corrections.return_value = {'caza': ['casa']}
    llm_ctor = mocker.patch('app.text_pipeline.llm_client.OllamaClient', return_value=llm_instance)
    mocker.patch('app.text_pipeline.pipeline._llm', None)

    assert _phase2_llm_corrections('texto qualquer') == {'caza': ['casa']}
    llm_ctor.assert_called_once_with()


def test_pipeline_uses_dictionary_only_detection_when_llm_is_unavailable(mocker):
    dictionary = mocker.Mock()
    dictionary.get_candidates.return_value = ["casa"]
    dictionary.is_valid_word.return_value = False
    
    mocker.patch('app.text_pipeline.pipeline._get_dictionary', return_value=dictionary)

    llm = mocker.Mock()
    llm.get_corrections.return_value = None
    
    mocker.patch('app.text_pipeline.pipeline._get_llm', return_value=llm)

    results = process_tokens(
        [Token(idx=0, text='caza', is_word=True, whitespace_after=' ')],
        'caza ',
    )

    assert results[0]['to_be_normalized'] is True
    assert results[0]['suggestions'] == ["casa"]


def test_pipeline_preserves_llm_assisted_behavior_when_llm_returns_no_corrections(mocker):
    dictionary = mocker.Mock()
    dictionary.get_candidates.return_value = ["casa"]
    dictionary.is_valid_word.return_value = False

    mocker.patch('app.text_pipeline.pipeline._get_dictionary', return_value=dictionary)

    llm = mocker.Mock()
    llm.get_corrections.return_value = {}

    mocker.patch('app.text_pipeline.pipeline._get_llm', return_value=llm)

    results = process_tokens(
        [Token(idx=0, text='caza', is_word=True, whitespace_after=' ')],
        'caza ',
    )

    assert results[0]['to_be_normalized'] is False
    assert results[0]['suggestions'] == ["casa"]
