import logging
from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def run_agent_pipeline(self, task_id, provider):
    from apps.projects.models import Task, Project
    from apps.accounts.models import UserAPIKey
    from apps.agent.cli_agent import CLIAgent
    from apps.agent.llm.base import create_llm_client
    from apps.projects.consumers import push_agent_thought

    try:
        task = Task.objects.get(id=task_id)
        project = task.project
    except (Task.DoesNotExist, Project.DoesNotExist) as e:
        logger.error(f"Task or Project not found: {task_id}")
        return {"error": "Task or Project not found"}

    api_key_obj = UserAPIKey.objects.filter(
        user=project.user,
        provider=provider,
        is_active=True,
    ).first()

    if not api_key_obj:
        task.status = 'failed'
        task.error_message = f"未找到 {provider} 的有效 API Key"
        task.save()
        push_agent_thought(task_id, {
            "type": "thinking",
            "content": f"❌ 未找到 {provider} 的有效 API Key",
            "status": "failed",
        })
        return {"error": f"API Key for {provider} not found"}

    llm_client = create_llm_client(api_key_obj)

    def push_callback(data):
        task.refresh_from_db()
        thinking_log = task.thinking_log or []
        thinking_log.append(data)
        task.thinking_log = thinking_log
        task.save()
        push_agent_thought(str(task_id), data)

    def update_status(status):
        task.refresh_from_db()
        task.status = status
        task.save()

    agent = CLIAgent(llm_client=llm_client, push_callback=push_callback)

    try:
        result = agent.run_pipeline(
            project=project,
            task=task,
            update_status_callback=update_status,
        )
        task.status = 'done'
        task.save()
        return {"status": "done"}
    except Exception as e:
        task.status = 'failed'
        task.error_message = str(e)
        task.save()
        logger.exception(f"Agent pipeline failed: {e}")
        return {"status": "failed", "error": str(e)}
