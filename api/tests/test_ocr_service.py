import pytest
import os
from PIL import Image
import io
from app.services import ocr_service


def test_perform_ocr_with_file_path(mocker, tmp_path):
    """Test OCR with image file path."""
    # Create a test image
    test_image = tmp_path / "test.jpg"
    img = Image.new('RGB', (100, 100), color='white')
    img.save(test_image)
    
    # Mock the Gemini API
    mock_client = mocker.MagicMock()
    mock_response = mocker.MagicMock()
    mock_response.text = "Extracted text from image"
    mock_client.models.generate_content.return_value = mock_response
    
    mocker.patch('app.services.ocr_service.genai.Client', return_value=mock_client)
    mocker.patch.dict(os.environ, {'API_KEY': 'test-api-key'})
    
    result = ocr_service.perform_ocr(str(test_image))
    
    assert result == "Extracted text from image"
    assert mock_client.models.generate_content.called
    
    # Verify the correct model was used
    call_args = mock_client.models.generate_content.call_args
    assert call_args.kwargs['model'] == 'gemini-flash-lite-latest'


def test_perform_ocr_with_bytes(mocker):
    """Test OCR with image bytes."""
    # Create image bytes
    img = Image.new('RGB', (100, 100), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes = img_bytes.getvalue()
    
    # Mock the Gemini API
    mock_client = mocker.MagicMock()
    mock_response = mocker.MagicMock()
    mock_response.text = "Text from bytes"
    mock_client.models.generate_content.return_value = mock_response
    
    mocker.patch('app.services.ocr_service.genai.Client', return_value=mock_client)
    mocker.patch.dict(os.environ, {'API_KEY': 'test-api-key'})
    
    result = ocr_service.perform_ocr(img_bytes)
    
    assert result == "Text from bytes"


def test_perform_ocr_converts_rgba_to_rgb(mocker, tmp_path):
    """Test that RGBA images are converted to RGB."""
    # Create an RGBA image
    test_image = tmp_path / "test.png"
    img = Image.new('RGBA', (100, 100), color=(255, 0, 0, 128))
    img.save(test_image)
    
    # Mock the Gemini API
    mock_client = mocker.MagicMock()
    mock_response = mocker.MagicMock()
    mock_response.text = "Converted image text"
    mock_client.models.generate_content.return_value = mock_response
    
    mocker.patch('app.services.ocr_service.genai.Client', return_value=mock_client)
    mocker.patch.dict(os.environ, {'API_KEY': 'test-api-key'})
    
    result = ocr_service.perform_ocr(str(test_image))
    
    assert result == "Converted image text"
    
    # Check that the image passed to API is RGB
    call_args = mock_client.models.generate_content.call_args
    passed_image = call_args.kwargs['contents'][1]
    assert passed_image.mode == 'RGB'


def test_perform_ocr_no_api_key(mocker, tmp_path):
    """Test that missing API_KEY raises ValueError."""
    test_image = tmp_path / "test.jpg"
    img = Image.new('RGB', (100, 100))
    img.save(test_image)
    
    # Remove API_KEY from environment
    mocker.patch.dict(os.environ, {}, clear=True)
    
    with pytest.raises(ValueError, match="API_KEY not found"):
        ocr_service.perform_ocr(str(test_image))


def test_perform_ocr_api_error(mocker, tmp_path):
    """Test handling of API errors."""
    test_image = tmp_path / "test.jpg"
    img = Image.new('RGB', (100, 100))
    img.save(test_image)
    
    # Mock the Gemini API to raise an error
    mock_client = mocker.MagicMock()
    mock_client.models.generate_content.side_effect = Exception("API Error")
    
    mocker.patch('app.services.ocr_service.genai.Client', return_value=mock_client)
    mocker.patch.dict(os.environ, {'API_KEY': 'test-api-key'})
    
    with pytest.raises(Exception, match="API Error"):
        ocr_service.perform_ocr(str(test_image))


def test_perform_ocr_invalid_image_path(mocker):
    """Test with non-existent image file."""
    mocker.patch.dict(os.environ, {'API_KEY': 'test-api-key'})
    
    with pytest.raises(FileNotFoundError):
        ocr_service.perform_ocr("/non/existent/path.jpg")


def test_perform_ocr_prompt_content(mocker, tmp_path):
    """Test that the correct prompt is sent to the API."""
    test_image = tmp_path / "test.jpg"
    img = Image.new('RGB', (100, 100))
    img.save(test_image)
    
    # Mock the Gemini API
    mock_client = mocker.MagicMock()
    mock_response = mocker.MagicMock()
    mock_response.text = "Test output"
    mock_client.models.generate_content.return_value = mock_response
    
    mocker.patch('app.services.ocr_service.genai.Client', return_value=mock_client)
    mocker.patch.dict(os.environ, {'API_KEY': 'test-api-key'})
    
    ocr_service.perform_ocr(str(test_image))
    
    # Verify the prompt contains key OCR instructions
    call_args = mock_client.models.generate_content.call_args
    prompt = call_args.kwargs['contents'][0]
    
    assert 'OCR' in prompt
    assert 'transcreva' in prompt.lower() or 'transcrev' in prompt.lower()
    assert 'parágrafo' in prompt.lower()
