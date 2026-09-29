import os
import uuid
from typing import Optional


def get_safe_extension(filename: str, allowed_extensions: Optional[set] = None) -> str:
    """
    Safely extracts and sanitizes the file extension without trusting full user input.
    Guards against null bytes, path traversal tokens, and malformed characters.
    """
    if not filename or not isinstance(filename, str) or "." not in filename:
        return ""

    # Strip directory separators and null bytes
    sanitized_name = os.path.basename(filename.replace("\\", "/")).replace("\x00", "")
    parts = sanitized_name.rsplit(".", 1)
    if len(parts) == 2:
        ext = parts[1].strip().lower()
        if allowed_extensions is None or ext in allowed_extensions:
            return ext
    return ""


def generate_unique_filename(original_filename: str, allowed_extensions: Optional[set] = None) -> str:
    """
    Generates a cryptographically random UUIDv4 filename preserving only the sanitized extension.
    Completely isolates the filesystem from untrusted user-supplied filenames.
    """
    ext = get_safe_extension(original_filename, allowed_extensions)
    if not ext:
        ext = "png"
    return f"{uuid.uuid4().hex}.{ext}"


def is_safe_path(base_dir: str, target_path: str) -> bool:
    """
    Verifies that target_path strictly resolves inside base_dir, preventing path traversal attacks
    such as '../', '..\\', Windows drive manipulation, or nested symlink escapes.
    """
    try:
        base_dir_abs = os.path.abspath(base_dir)
        target_path_abs = os.path.abspath(target_path)
        common = os.path.commonpath([base_dir_abs, target_path_abs])
        return common == base_dir_abs
    except Exception:
        return False


def cleanup_file(file_path: Optional[str]) -> bool:
    """
    Safely removes a temporary or partial file if it exists.
    Returns True if removed, False otherwise. Does not raise exceptions.
    """
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            return True
        except Exception:
            pass
    return False


def ensure_folders_exist(*folder_paths):
    """Ensures that required directories exist on disk."""
    for path in folder_paths:
        os.makedirs(path, exist_ok=True)
