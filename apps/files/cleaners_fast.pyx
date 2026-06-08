# cython: language_level=3, boundscheck=False
cimport cython
import numpy as np
cimport numpy as np

np.import_array()

ctypedef np.float64_t DTYPE_t
ctypedef np.int64_t ITYPE_t


cpdef dict fast_dataframe_summary(DTYPE_t[:, :] data, list col_names, list dtypes):
    cdef Py_ssize_t n_rows = data.shape[0]
    cdef Py_ssize_t n_cols = data.shape[1]
    cdef Py_ssize_t i, j
    cdef double val, col_sum, col_min, col_max
    cdef int col_nan_count, duplicate_count
    cdef dict result = {}

    result['row_count'] = n_rows
    result['column_count'] = n_cols
    result['columns'] = col_names
    result['dtypes'] = {col: str(dt) for col, dt in zip(col_names, dtypes)}

    cdef list null_counts = []
    cdef int total_nulls = 0
    for j in range(n_cols):
        col_nan_count = 0
        for i in range(n_rows):
            if np.isnan(data[i, j]):
                col_nan_count += 1
        null_counts.append(col_nan_count)
        total_nulls += col_nan_count

    result['null_counts'] = {col_names[j]: null_counts[j] for j in range(n_cols) if null_counts[j] > 0}
    result['total_nulls'] = total_nulls

    cdef list col_stats_list = []
    for j in range(n_cols):
        if 'float' in str(dtypes[j]).lower() or 'int' in str(dtypes[j]).lower():
            col_sum = 0.0
            col_min = 1e308
            col_max = -1e308
            for i in range(n_rows):
                val = data[i, j]
                if not np.isnan(val):
                    col_sum += val
                    if val < col_min:
                        col_min = val
                    if val > col_max:
                        col_max = val
            col_stats_list.append({
                'col': col_names[j],
                'min': col_min,
                'max': col_max,
                'mean': col_sum / (n_rows - null_counts[j]) if (n_rows - null_counts[j]) > 0 else 0,
            })
    result['numeric_summary'] = col_stats_list

    return result
