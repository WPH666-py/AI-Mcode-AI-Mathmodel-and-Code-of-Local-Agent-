from .base import BaseLLMClient
import httpx
import json


class ClaudeClient(BaseLLMClient):
    provider = "claude"

    def __init__(self, api_key, base_url=None, model_name=None):
        super().__init__(api_key, base_url, model_name)
        self.base_url = base_url or "https://api.anthropic.com/v1"
        self.model_name = model_name or "claude-3-5-sonnet-20241022"

    async def chat(self, prompt, system_prompt=None, stream=False):
        messages = [{"role": "user", "content": prompt}]
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.model_name,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system_prompt:
            body["system"] = system_prompt

        async with httpx.AsyncClient(timeout=None) as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]

    def chat_sync(self, prompt, system_prompt=None):
        import asyncio
        return asyncio.run(self.chat(prompt, system_prompt))
