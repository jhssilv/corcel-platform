def format_text_content(text):
    """
    Format text by:
    - Removing single line breaks
    - Converting double line breaks to line break + tab
    This is applied only once during initial text insertion.
    """
    if not text:
        return text

    double_lb_placeholder = '___DOUBLE_LB___'
    formatted = text.replace('\n\n', double_lb_placeholder)

    formatted = formatted.replace('\n', ' ')

    formatted = formatted.replace(double_lb_placeholder, '\n\t')

    return formatted
