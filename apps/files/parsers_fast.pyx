# cython: language_level=3, boundscheck=False, wraparound=False
cimport cython
from libc.string cimport memcpy, strlen
from cpython.unicode cimport PyUnicode_DecodeUTF8, PyUnicode_AsUTF8String
from cpython.bytes cimport PyBytes_AsString, PyBytes_FromStringAndSize
import os


@cython.cfunc
@cython.inline
cdef bint _try_decode(const char* data, Py_ssize_t size, str encoding):
    try:
        PyUnicode_DecodeUTF8(data, size, 'strict')
        return True
    except UnicodeDecodeError:
        return False


cpdef str fast_read_text(str file_path):
    cdef bytes raw
    cdef const char* c_data
    cdef Py_ssize_t c_size
    cdef bytes path_bytes = file_path.encode('utf-8')

    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    cdef bytes file_bytes
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    cdef const char* buf = PyBytes_AsString(file_bytes)
    cdef Py_ssize_t buf_len = len(file_bytes)

    for enc in encodings:
        try:
            return file_bytes.decode(enc)
        except UnicodeDecodeError:
            continue

    return file_bytes.decode('utf-8', errors='ignore')


cpdef dict analyze_text_fast(str content):
    cdef Py_ssize_t total_chars = len(content)
    cdef Py_ssize_t total_lines = content.count('\n') + 1
    cdef Py_ssize_t total_words = len(content.split())
    cdef dict result = {
        'total_chars': total_chars,
        'total_lines': total_lines,
        'total_words': total_words,
        'size_kb': round(total_chars / 1024.0, 2),
    }
    return result
