import importlib

import pytest


def test_ignore_llm_if_on_cpu_env_true(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'test-secret')
    monkeypatch.setenv('IGNORE_LLM_IF_ON_CPU', 'true')
    monkeypatch.delenv('LLM_DEVICE', raising=False)

    import app.config as config_module

    reloaded = importlib.reload(config_module)

    try:
        assert reloaded.Config.IGNORE_LLM_IF_ON_CPU is True
    finally:
        monkeypatch.delenv('IGNORE_LLM_IF_ON_CPU', raising=False)
        importlib.reload(config_module)


def test_ignore_llm_if_on_cpu_env_false(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'test-secret')
    monkeypatch.setenv('IGNORE_LLM_IF_ON_CPU', 'false')
    monkeypatch.delenv('LLM_DEVICE', raising=False)

    import app.config as config_module

    reloaded = importlib.reload(config_module)

    try:
        assert reloaded.Config.IGNORE_LLM_IF_ON_CPU is False
    finally:
        monkeypatch.delenv('IGNORE_LLM_IF_ON_CPU', raising=False)
        importlib.reload(config_module)


def test_ignore_llm_if_on_cpu_rejects_invalid_values(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'test-secret')
    monkeypatch.setenv('IGNORE_LLM_IF_ON_CPU', '1')

    import app.config as config_module

    with pytest.raises(ValueError, match="IGNORE_LLM_IF_ON_CPU"):
        importlib.reload(config_module)

    monkeypatch.delenv('IGNORE_LLM_IF_ON_CPU', raising=False)
    importlib.reload(config_module)


def test_llm_device_uses_env_override(monkeypatch):
    monkeypatch.setenv('SECRET_KEY', 'test-secret')
    monkeypatch.setenv('LLM_DEVICE', 'CUDA')

    import app.config as config_module

    reloaded = importlib.reload(config_module)

    try:
        assert reloaded.Config.LLM_DEVICE == 'cuda'
    finally:
        monkeypatch.delenv('LLM_DEVICE', raising=False)
        importlib.reload(config_module)
