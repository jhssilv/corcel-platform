import os
from google import genai
from google.genai import types
from PIL import Image
import io

def perform_ocr(image_path_or_bytes):
    """
    Performs OCR on an image using Google Gemini Flash (using updated google-genai SDK).
    Args:
        image_path_or_bytes (str or bytes): Path to the image file or bytes.
    Returns:
        str: Extracted text.
    """
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise ValueError("API_KEY not found in environment variables.")

    client = genai.Client(api_key=api_key)

    image = None
    if isinstance(image_path_or_bytes, str):
        image = Image.open(image_path_or_bytes)
    else:
        image = Image.open(io.BytesIO(image_path_or_bytes))

    # Convert to RGB if needed and resize/optimize if necessary
    # Gemini handles images well, but standardizing to RGB is good practice
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Prompt for OCR
    prompt = """
        Você é um especialista em OCR (Reconhecimento Óptico de Caracteres).
        Transcreva EXATAMENTE todo o texto visível nesta imagem. 
        Use DUAS quebras de linha consecutivas (linha em branco) antes de cada parágrafo.
        Ignore as quebras de linha ao fim das linhas na imagem (junte as linhas do mesmo parágrafo). 
        Não adicione comentários, introduções, conclusões ou correções, forneça apenas o texto extraído.
        Junte palavras separadas por hífens no final das linhas.
        """

    try:
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=[prompt, image]
        )
        print(response.text, flush=True)
        return response.text
        
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        raise e
