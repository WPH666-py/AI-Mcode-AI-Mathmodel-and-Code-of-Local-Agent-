from rest_framework import serializers
from .models import Project, UploadedFile, Question, Task
from apps.accounts.models import UserAPIKey


class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ('id', 'file', 'file_name', 'file_type', 'file_size', 'parsed_content', 'uploaded_at')
        read_only_fields = ('file_name', 'file_type', 'file_size', 'parsed_content')


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ('id', 'order', 'content', 'analysis', 'formula', 'code', 'result_text', 'result_image')


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ('id', 'status', 'thinking_log', 'error_message', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'thinking_log', 'error_message', 'created_at', 'updated_at')


class ProjectSerializer(serializers.ModelSerializer):
    files = UploadedFileSerializer(many=True, read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'title', 'description', 'status', 'files', 'questions', 'tasks', 'created_at', 'updated_at')
        read_only_fields = ('status',)


class ProjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('id', 'title', 'status', 'created_at', 'updated_at')


class CreateTaskSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=['deepseek', 'qwen', 'openai', 'claude'])
    enable_web_search = serializers.BooleanField(default=False)

    def validate_provider(self, value):
        user = self.context['request'].user
        if not UserAPIKey.objects.filter(user=user, provider=value, is_active=True).exists():
            raise serializers.ValidationError(f"请先绑定 {value} 的 API Key")
        return value
