# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

ROOT = Path.cwd()
ICON = ROOT.parent / 'AI-Mcode.ico'

datas = [
    (str(ROOT / 'frontend' / 'dist'), 'frontend/dist'),
    (str(ROOT / 'templates'), 'templates'),
]

import autobahn
AUTOBAHN_DIR = Path(autobahn.__file__).resolve().parent
datas += [
    (str(AUTOBAHN_DIR / 'nvx'), 'autobahn/nvx'),
]

NVX_BINARIES = [
    str(AUTOBAHN_DIR.parent / '_nvx_xormasker.cp311-win_amd64.pyd'),
    str(AUTOBAHN_DIR.parent / '_nvx_utf8validator.cp311-win_amd64.pyd'),
]

block_cipher = None


a = Analysis(
    ['desktop_launcher.py'],
    pathex=[str(ROOT)],
    binaries=[(path, '.') for path in NVX_BINARIES if Path(path).exists()],
    datas=datas,
    hiddenimports=[
        'daphne.cli',
        'twisted.internet.asyncioreactor',
        'channels.layers',
        'django.contrib.admin.apps',
        'django.contrib.auth.apps',
        'django.contrib.contenttypes.apps',
        'django.contrib.sessions.apps',
        'django.contrib.messages.apps',
        'django.contrib.staticfiles.apps',
        'rest_framework',
        'corsheaders',
        'apps.accounts',
        'apps.projects',
        'apps.agent',
        'apps.files',
        'apps.core',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'eventlet',
        'matplotlib', 'seaborn', 'scipy', 'sklearn', 'scikit-learn',
        'xgboost', 'lightgbm', 'catboost', 'numba', 'llvmlite',
        'tkinter', '_tkinter', 'IPython', 'jupyter', 'notebook',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AI-Mcode',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(ICON) if ICON.exists() else None,
)
