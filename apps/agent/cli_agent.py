import time
import logging
from .skills.file_parsing import FileParsingSkill
from .skills.data_cleaning import DataCleaningSkill
from .skills.code_generation import CodeGenerationSkill
from .skills.web_search import WebSearchSkill

logger = logging.getLogger(__name__)


class CLIAgent:
    """CLI Agent 主控引擎：编排 Skill 流水线，向前端实时推送思考过程"""

    def __init__(self, llm_client, push_callback=None):
        self.llm = llm_client
        self.push_callback = push_callback
        self.skills = self._load_skills()

    def _load_skills(self):
        return [
            FileParsingSkill(),
            DataCleaningSkill(),
            WebSearchSkill(),
            CodeGenerationSkill(),
        ]

    def _push(self, message, status=None):
        data = {
            "type": "thinking",
            "content": message,
            "timestamp": time.time(),
        }
        if status:
            data["status"] = status
        if self.push_callback:
            self.push_callback(data)
        logger.info(f"[Agent] {message}")

    def run_pipeline(self, project, task, update_status_callback=None, enable_web_search=False):
        return self._run_pipeline(project, task, update_status_callback, enable_web_search)

    def _build_existing_summary(self, project):
        chunks = []
        for q in project.questions.all():
            parts = [f"第{q.order}问：{q.content}"]
            if q.analysis:
                parts.append(f"已有分析：{q.analysis[:2000]}")
            if q.formula:
                parts.append(f"已有说明文档：{q.formula[:1000]}")
            if q.code:
                parts.append(f"已有代码摘要：{q.code[:1500]}")
            if q.result_text:
                parts.append(f"已有运行输出：{q.result_text[:1000]}")
            if len(parts) > 1:
                chunks.append("\n".join(parts))

        if not chunks:
            return ""

        prompt = f"""请把以下已有数学建模分析过程压缩成续跑上下文摘要。

要求：
1. 保留每一问已经确定的建模思路、说明文档、代码意图、运行结果和已发现问题。
2. 去掉重复解释和冗余代码细节。
3. 输出结构化摘要，控制在 1200 字以内。
4. 只输出摘要正文。

已有内容：
{chr(10).join(chunks)}"""
        return self.llm.chat_sync(prompt)

    def _run_pipeline(self, project, task, update_status_callback=None, enable_web_search=False):
        previous_summary = self._build_existing_summary(project)
        if previous_summary:
            self._push("🧩 已压缩已有分析过程，将在此基础上继续分析")

        context = {
            'project': project,
            'llm': self.llm,
            'task': task,
            'project_description': project.description,
            'enable_web_search': enable_web_search,
            'previous_summary': previous_summary,
            'push': self._push,
        }

        skill_status_map = {
            'file_parsing': ('parsing', '🔧 正在解析上传文件...'),
            'data_cleaning': ('cleaning', '🧹 正在清洗和分析数据...'),
            'web_search': ('analyzing', '🌐 正在联网搜索相关背景知识...'),
            'code_generation': ('coding', '🧮💻 正在进行数学建模并生成代码...'),
        }

        try:
            for skill in self.skills:
                if skill.name == 'web_search' and not enable_web_search:
                    self._push("⏭️ 已跳过联网搜索，如需联网可在开始前勾选")
                    continue

                status_info = skill_status_map.get(skill.name, (None, f"🔧 执行 {skill.description}"))
                task_status, message = status_info

                if update_status_callback:
                    update_status_callback(task_status)
                self._push(message, task_status)

                self._push(f"▶ 开始执行: {skill.description}")
                context = skill.execute(context)
                self._push(f"✅ {skill.name} 完成")

            self._push("🎉 所有任务执行完毕！", "done")
            project.status = 'done'
            project.save()

        except Exception as e:
            self._push(f"❌ 执行出错: {str(e)}", "failed")
            project.status = 'failed'
            project.save()
            raise

        return context
