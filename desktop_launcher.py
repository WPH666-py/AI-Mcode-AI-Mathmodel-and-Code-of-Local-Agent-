import os
import sys
import time
import socket
import threading
import webbrowser
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

FRONTEND_PORT = 3030
WS_PORT = 3031
API_PORT = 3032
LOG_FILE = None


def resource_path(*parts):
    base = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
    return base.joinpath(*parts)


def app_data_dir():
    candidates = [
        os.environ.get('LOCALAPPDATA'),
        os.environ.get('APPDATA'),
        str(Path.home()),
        str(resource_path()),
    ]
    for root in candidates:
        if not root:
            continue
        try:
            path = Path(root) / 'AI-Mcode'
            path.mkdir(parents=True, exist_ok=True)
            return path
        except Exception:
            continue
    path = Path.cwd() / 'AI-Mcode-data'
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_log(message):
    try:
        global LOG_FILE
        if LOG_FILE is None:
            LOG_FILE = app_data_dir() / 'launcher.log'
        with LOG_FILE.open('a', encoding='utf-8') as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")
    except Exception:
        pass


def wait_port(port, host='127.0.0.1', timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.3)
    return False


class FrontendHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        target = self.path.split('?', 1)[0]
        if target in ('/', '/index.html'):
            index_path = resource_path('frontend', 'dist', 'index.html')
            html = index_path.read_text(encoding='utf-8')
            inject = "<script>window.__AI_MCODE_API_BASE__='http://127.0.0.1:3032/api';window.__AI_MCODE_WS_HOST__='127.0.0.1:3031';</script>"
            html = html.replace('<head>', f'<head>{inject}', 1)
            body = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if target == '/favicon.ico':
            icon_path = resource_path('frontend', 'dist', 'favicon.ico')
            if not icon_path.exists():
                icon_path = resource_path('frontend', 'dist', 'wechat-py-qr.jpg.jpg')
            if icon_path.exists():
                body = icon_path.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', 'image/x-icon')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().do_GET()

    def log_message(self, format, *args):
        return


def setup_django_env():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    os.environ.setdefault('DJANGO_DEBUG', 'False')
    os.environ.setdefault('DJANGO_ALLOWED_HOSTS', '*')
    os.environ.setdefault('CORS_ALLOWED_ORIGINS', 'http://localhost:3030,http://127.0.0.1:3030')
    os.environ.setdefault('AUTOBAHN_USE_NVX', '0')
    os.environ['AI_MCODE_DATA_DIR'] = str(app_data_dir())


def migrate_once():
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', interactive=False, verbosity=0)


def start_frontend():
    try:
        frontend_dir = resource_path('frontend', 'dist')
        handler = partial(FrontendHandler, directory=str(frontend_dir))
        server = ThreadingHTTPServer(('127.0.0.1', FRONTEND_PORT), handler)
        write_log(f'frontend started on {FRONTEND_PORT}')
        server.serve_forever()
    except Exception as exc:
        import traceback
        write_log('frontend failed: ' + repr(exc))
        write_log(traceback.format_exc())


def start_api():
    try:
        setup_django_env()
        migrate_once()
        from django.core.handlers.wsgi import WSGIHandler
        from django.core.servers.basehttp import WSGIServer, WSGIRequestHandler
        from wsgiref.simple_server import make_server
        write_log(f'api started on {API_PORT}')
        server = make_server('127.0.0.1', API_PORT, WSGIHandler(), server_class=WSGIServer, handler_class=WSGIRequestHandler)
        server.serve_forever()
    except Exception as exc:
        import traceback
        write_log('api failed: ' + repr(exc))
        write_log(traceback.format_exc())


def start_ws():
    try:
        write_log('websocket setup starting')
        setup_django_env()
        write_log(f"websocket env ready, AUTOBAHN_USE_NVX={os.environ.get('AUTOBAHN_USE_NVX')}")
        if not wait_port(API_PORT, timeout=60):
            write_log('api was not ready before websocket startup')
        write_log('websocket importing daphne cli')
        from daphne.cli import CommandLineInterface
        write_log(f'websocket started on {WS_PORT}')
        CommandLineInterface().run([
            '-b', '127.0.0.1',
            '-p', str(WS_PORT),
            'config.asgi:application',
        ])
    except BaseException as exc:
        import traceback
        write_log('websocket failed: ' + repr(exc))
        write_log(traceback.format_exc())


def main():
    try:
        os.chdir(str(resource_path()))
    except Exception:
        pass
    write_log('launcher starting')

    threading.Thread(target=start_api, daemon=True).start()
    threading.Thread(target=start_frontend, daemon=True).start()

    if wait_port(FRONTEND_PORT, timeout=60):
        webbrowser.open(f'http://127.0.0.1:{FRONTEND_PORT}/')
    else:
        write_log('frontend port did not become ready')

    start_ws()

    while True:
        time.sleep(3600)


if __name__ == '__main__':
    main()
