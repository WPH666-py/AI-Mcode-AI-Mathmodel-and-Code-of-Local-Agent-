from rest_framework import serializers
from .models import UserAPIKey


class UserAPIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAPIKey
        fields = ('id', 'provider', 'api_key', 'base_url', 'model_name', 'is_active', 'created_at')
        extra_kwargs = {
            'api_key': {'write_only': True},
        }
