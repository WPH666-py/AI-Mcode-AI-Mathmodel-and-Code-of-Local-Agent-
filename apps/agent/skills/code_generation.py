from .base import BaseSkill
import json
import re


class CodeGenerationSkill(BaseSkill):
    name = "code_generation"
    description = "数学建模分析并生成可执行的 Python 代码"

    def _parse_response(self, response: str) -> dict:
        """Robust JSON parsing with multiple fallback strategies."""
        # Strategy 1: Clean markdown fences and parse as JSON
        try:
            cleaned = re.sub(r'```(?:json)?\s*\n?|\n?\s*```', '', response)
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            return json.loads(match.group() if match else response)
        except (json.JSONDecodeError, AttributeError):
            pass

        # Strategy 2: Try to extract fields via regex
        result = {}
        for field in ['analysis', 'formula', 'code']:
            # Match "field": "content" or "field": "content" (multiline)
            pattern = rf'"{field}"\s*:\s*"((?:[^"\\]|\\.)*)"'
            m = re.search(pattern, response, re.DOTALL)
            if m:
                result[field] = m.group(1)
            else:
                # Try matching with escaped newlines
                pattern2 = rf'"{field}"\s*:\s*"(.*?)"(?:\s*[,}}])'
                m2 = re.search(pattern2, response, re.DOTALL)
                if m2:
                    result[field] = m2.group(1)

        # Strategy 3: Extract code from markdown block, analysis from text
        if not result:
            code_match = re.search(r'```python\s*\n(.*?)```', response, re.DOTALL)
            if code_match:
                result['code'] = code_match.group(1).strip()
            # Try to get analysis from non-code parts
            analysis_match = re.search(r'(?:分析|思路|原理)[：:]\s*(.+?)(?=\n(?:公式|代码|```|$))', response, re.DOTALL)
            if analysis_match:
                result['analysis'] = analysis_match.group(1).strip()

        return result

    def _clean_document(self, text: str) -> str:
        """Clean generated markdown document text."""
        if not text:
            return ''
        text = text.strip()
        text = text.replace('\\n', '\n').replace('\\t', '\t')
        text = re.sub(r'```(?:markdown|md)?\s*\n?|\n?\s*```', '', text)
        return text.strip()

    def _clean_code(self, code: str) -> str:
        """Normalize generated Python code so it displays and runs as multiline code."""
        if not code:
            return ''
        code = code.strip()
        code = re.sub(r'^```(?:python)?\s*\n?|\n?\s*```$', '', code)
        code = code.replace('\\r\\n', '\n').replace('\\n', '\n').replace('\\t', '\t')
        code = code.replace('\r\n', '\n')
        return code.strip()

    def execute(self, context: dict) -> dict:
        project = context['project']
        llm = context['llm']
        cleaned_data = context.get('cleaned_data', '')
        previous_summary = context.get('previous_summary', '')

        questions = list(project.questions.all())
        if not questions:
            return context

        question_texts = '\n'.join(f"第{q.order}问：{q.content}" for q in questions)

        prompt = f"""你是数学建模专家兼 Python 程序员。请逐一分析以下所有问题，为每一问返回 JSON。

{question_texts}

数据来源（如有）：{cleaned_data[:800] if cleaned_data else '无外部数据'}

已有分析压缩摘要（如有，请在此基础上继续优化，不要简单重复）：
{previous_summary if previous_summary else '无已有分析'}

可用库：pandas, numpy, matplotlib, scipy, sklearn, seaborn, statsmodels, networkx, deap, openpyxl

请返回一个 JSON 数组，每个元素对应一问：
[
  {{
    "analysis": "第1问建模分析（求解思路、模型选择原因、关键步骤）",
    "formula": "第1问说明文档，使用 Markdown，包含模型假设、变量说明、核心公式、求解步骤、结果解释",
    "code": "第1问完整 Python 代码，必须使用真实换行符分行，不要压缩成一行"
  }},
  ...
]

代码要求：
1. 直接可运行，定义 main() 但不要自己调用
2. matplotlib 使用 plt.rcParams['font.sans-serif'] = ['SimHei']
3. 图片尺寸：plt.figure(figsize=(6, 3.5), dpi=120)
4. 结果用 print() 输出，图表文件名按问题编号保存，例如第1问保存为 result_1.png，第2问保存为 result_2.png
5. 每问都必须有完整的 analysis、formula、code 三个字段
6. formula 字段不要只写公式，改为清晰的 Markdown 说明文档，包含：模型假设、变量说明、核心公式、求解步骤、结果解释；其中所有数学公式必须用 $...$ 或 $$...$$ 包裹，不要把 LaTeX 裸露输出
7. code 字段必须是格式化后的多行 Python 代码，不能把所有代码压缩在一行；语句之间必须使用真实换行符
8. 只输出 JSON 数组，不要额外解释"""

        response = llm.chat_sync(prompt)
        results = []

        # Try parsing as JSON array first
        try:
            cleaned = re.sub(r'```(?:json)?\s*\n?|\n?\s*```', '', response)
            match = re.search(r'\[.*\]', cleaned, re.DOTALL)
            arr = json.loads(match.group() if match else response)
            if isinstance(arr, list):
                results = arr
        except (json.JSONDecodeError, AttributeError):
            pass

        # For each question, match result by index
        for i, q in enumerate(questions):
            if i < len(results):
                item = results[i]
            else:
                # If array parsing failed, try parsing each question individually
                item = self._parse_response(response)

            analysis = item.get('analysis', '')
            formula = self._clean_document(item.get('formula', ''))
            code = self._clean_code(item.get('code', ''))

            # If still empty after fallback, ensure at least some analysis
            if not analysis:
                analysis = f"第{q.order}问：{q.content} 的建模分析由 AI 自动生成"

            q.analysis = analysis
            q.formula = formula
            q.code = code
            q.save()

        context['modeling_results'] = [
            {'order': q.order, 'analysis': q.analysis, 'formula': q.formula}
            for q in questions
        ]
        return context
