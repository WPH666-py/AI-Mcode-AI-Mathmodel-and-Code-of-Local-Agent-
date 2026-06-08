from django.contrib.auth.models import User
from django.utils.functional import SimpleLazyObject

DEFAULT_USERNAME = '_local_'
DEFAULT_EMAIL = 'local@localhost'


def get_default_user():
    """获取或创建默认本地用户"""
    user, _ = User.objects.get_or_create(
        username=DEFAULT_USERNAME,
        defaults={'email': DEFAULT_EMAIL},
    )
    return user


class AutoLoginMiddleware:
    """自动认证中间件：本地单用户模式，跳过登录"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user = SimpleLazyObject(get_default_user)
        return self.get_response(request)


class APICSRFExemptMiddleware:
    """API 路由禁用 CSRF：本地工具无需 CSRF 保护"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return self.get_response(request)
