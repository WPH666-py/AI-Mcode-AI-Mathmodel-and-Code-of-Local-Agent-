from django.db import models
from django.contrib.auth.models import User
import uuid


class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', '草稿'),
            ('processing', '处理中'),
            ('done', '完成'),
            ('failed', '失败'),
        ],
        default='draft',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.title


class UploadedFile(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    file_name = models.CharField(max_length=500)
    file_type = models.CharField(max_length=10)
    file_size = models.BigIntegerField(default=0)
    parsed_content = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name


class Question(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='questions')
    order = models.IntegerField()
    content = models.TextField()
    analysis = models.TextField(blank=True, default='')
    formula = models.TextField(blank=True, default='')
    code = models.TextField(blank=True, default='')
    result_text = models.TextField(blank=True, default='')
    result_image = models.ImageField(upload_to='results/%Y/%m/%d/', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('order',)
        unique_together = ('project', 'order')

    def __str__(self):
        return f"第{self.order}问"


class Task(models.Model):
    STATUS_CHOICES = [
        ('pending', '等待中'),
        ('parsing', '解析文件中'),
        ('cleaning', '清洗数据中'),
        ('analyzing', '分析问题中'),
        ('modeling', '数学建模中'),
        ('coding', '生成代码中'),
        ('executing', '执行代码中'),
        ('done', '完成'),
        ('failed', '失败'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    celery_task_id = models.CharField(max_length=100, blank=True)
    thinking_log = models.JSONField(default=list)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"Task {self.id} - {self.get_status_display()}"
