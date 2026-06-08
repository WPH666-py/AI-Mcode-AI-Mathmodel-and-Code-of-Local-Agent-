def clean_dataframe(df):
    from . import _fast_dataframe_summary as _fds
    if _fds is not None:
        numeric_data = df.select_dtypes(include=['number'])
        if not numeric_data.empty:
            c_result = _fds(
                numeric_data.values.astype('float64'),
                list(numeric_data.columns),
                [str(dt) for dt in numeric_data.dtypes],
            )
            null_counts = df.isnull().sum()
            result = {
                'row_count': len(df),
                'column_count': len(df.columns),
                'columns': list(df.columns),
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'null_counts': {col: int(cnt) for col, cnt in null_counts.items() if cnt > 0},
                'total_nulls': int(null_counts.sum()),
                'numeric_summary': {s['col']: {
                    'min': s['min'], 'max': s['max'], 'mean': s['mean']
                } for s in c_result['numeric_summary']},
                'duplicate_rows': int(df.duplicated().sum()),
            }
            return result

    result = {}
    result['row_count'] = len(df)
    result['column_count'] = len(df.columns)
    result['columns'] = list(df.columns)
    result['dtypes'] = {col: str(dtype) for col, dtype in df.dtypes.items()}

    null_counts = df.isnull().sum()
    result['null_counts'] = {col: int(cnt) for col, cnt in null_counts.items() if cnt > 0}
    result['total_nulls'] = int(df.isnull().sum().sum())

    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 0:
        desc = df[numeric_cols].describe().to_dict()
        result['numeric_summary'] = {
            col: {k: (float(v) if not isinstance(v, dict) else v) for k, v in stats.items()}
            for col, stats in desc.items()
        }

    duplicate_count = int(df.duplicated().sum())
    result['duplicate_rows'] = duplicate_count

    return result


def clean_data_text(parsed_text, file_type):
    summary_lines = [f"文件类型: {file_type}", f"内容大小: {len(parsed_text)} 字符"]

    if file_type in ('csv',):
        import pandas as pd
        import io
        try:
            df = pd.read_csv(io.StringIO(parsed_text))
            info = clean_dataframe(df)
            summary_lines.append(f"行数: {info['row_count']}")
            summary_lines.append(f"列数: {info['column_count']}")
            summary_lines.append(f"列名: {', '.join(info['columns'])}")
            summary_lines.append(f"缺失值: {info['total_nulls']}")
            summary_lines.append(f"重复行: {info['duplicate_rows']}")
        except Exception:
            pass

    if file_type in ('xlsx', 'xls'):
        summary_lines.append('Excel 文件已解析为文本摘要')

    return '\n'.join(summary_lines)
