import os
from pathlib import Path

def is_safe_path(base_dir, path_to_check):
    """
    Verifica que 'path_to_check' esté contenido dentro de 'base_dir'.
    Previene ataques de Path Traversal (../).
    """
    base_dir = os.path.abspath(base_dir)
    path_to_check = os.path.abspath(path_to_check)
    
    # Resolver la ruta real (manejando symlinks si es necesario)
    return os.path.commonpath([base_dir]) == os.path.commonpath([base_dir, path_to_check])

def sanitize_filename(filename):
    """Elimina caracteres peligrosos de un nombre de archivo sugerido."""
    import re
    # Permitir solo caracteres alfanuméricos, guiones, puntos y espacios
    return re.sub(r'[^\w\-_\. ]', '', os.path.basename(filename))
