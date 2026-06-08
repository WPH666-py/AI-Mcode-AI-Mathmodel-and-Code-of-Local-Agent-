from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, UploadedFileViewSet, TaskViewSet

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='project')
router.register(r'files', UploadedFileViewSet, basename='uploaded-file')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
