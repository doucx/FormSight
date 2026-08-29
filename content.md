收到，我们将对 `scripts/check_dry.py` 进行微调，过滤掉纯 JSX 闭合标签序列（如 `</div></div>);})`）、多行解构类型导入（如 `CardStatusTag,`）以及纯括号标点等良性噪点，使 DRY 检查报告聚焦于高价值的实质性业务代码与样式克隆。

## [WIP] feat(scripts): 微调 check_dry 规则以过滤良性噪点

### 用户需求
优化 `scripts/check_dry.py` 的行过滤规则与有效行识别逻辑，过滤多行 Import 列表和连续 JSX 闭合标签等良性噪点，降低报告中的误报率。

### 评论
在 AST/行级克隆检测中，跨文件的多行 `import { A, B, C } from '...'` 以及组件末尾连续的 `</div></div>);})` 经常由于代码行数达到滑动窗口阈值而被判定为代码克隆。通过升级词法过滤正则并增强实质性代码判定（`is_significant_line`），可以大幅提升检测精度与报告信噪比。

### 目标
1. 增强 `TRIVIAL_LINE_REGEX`，覆盖多行导入解构条目、`from '...'`、纯闭合标签组合与纯标点符号。
2. 增强 `is_significant_line`，自动剥离 JSX 闭合标签后判定是否包含实质性逻辑。
3. 优化窗口有效行占比判定逻辑。

### 基本原理
通过正则表达式在归一化阶段识别仅包含标点、闭合标签或单项类型导出的行，将其标记为非实质性行（Trivial Line）。在滑动窗口聚合时，若窗口内实质性行数量不足，则直接跳过该窗口，避免将语法闭合结构误判为业务逻辑克隆。

### 标签
#intent/tune #flow/ready #priority/medium
#comp/tooling #concept/cli #scope/dx
#ai/instruct
#task/domain/tooling #task/object/dry-checker #task/action/rule-refinement #task/state/continue

---

### Script

#### Acts 1: 微调 `scripts/check_dry.py` 的词法过滤与有效行判定

我们将更新 `TRIVIAL_LINE_REGEX` 正则与 `is_significant_line` 函数。

~~~~~act
patch_file
scripts/check_dry.py
~~~~~
~~~~~python.old
# 忽略无实际逻辑的样板行（导入、单括号、空行等）
TRIVIAL_LINE_REGEX = re.compile(
    r"^(import\s.+|export\s\*|export\s\{|\}|\{|\);\s*|//.*|/\*.*|\*.*|const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);)$"
)
~~~~~
~~~~~python.new
# 忽略无实际逻辑的样板行（导入、多行解构、单括号、闭合标签、空行等）
TRIVIAL_LINE_REGEX = re.compile(
    r"^("
    r"import\s.+|"
    r"export\s\*|"
    r"export\s\{|"
    r"from\s+['\"].+|"
    r"\}\s*from\s+['\"].+|"
    r"[A-Za-z0-9_$]+,\s*|"  # 多行 import/export 的解构类型单项，如 'CardStatusTag,'
    r"const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);|"
    r"[\{\}\(\)\[\]\,\;\:\>\<]+|"  # 纯括号与标点
    r"<\/[A-Za-z0-9_$.-]+>|"  # 单独的闭合标签如 </div>, </ModalShell>
    r"(<\/[A-Za-z0-9_$.-]+>\s*)+|"  # 多个连续闭合标签如 </div></div>
    r"\);\s*|"
    r"\}\);\s*|"
    r"//.*|"
    r"/\*.*|"
    r"\*.*"
    r")$"
)
~~~~~

~~~~~act
patch_file
scripts/check_dry.py
~~~~~
~~~~~python.old
    def is_significant_line(self, line: str) -> bool:
        norm = self.normalize_line(line)
        if not norm or len(norm) <= 2:
            return False
        if TRIVIAL_LINE_REGEX.match(norm):
            return False
        return True
~~~~~
~~~~~python.new
    def is_significant_line(self, line: str) -> bool:
        norm = self.normalize_line(line)
        if not norm or len(norm) <= 2:
            return False
        if TRIVIAL_LINE_REGEX.match(norm):
            return False
        # 剥离所有 JSX 闭合标签与纯标点后，如果剩余内容为空则视为非实质行
        stripped = re.sub(r"</[A-Za-z0-9_$.-]+>|[\{\}\(\)\[\]\,\;\:\>\<\s]", "", norm)
        if not stripped:
            return False
        return True
~~~~~

### 下一步建议

1. **重新运行验证**：在终端执行 `python scripts/check_dry.py`。
2. **观察报告变化**：确认类似 `Group #4`（连续 JSX 闭合标签）和 `Group #5, #6`（多行 Type Import）等良性噪点已被有效过滤，剩下的克隆组将全部集中在真实的业务逻辑（如 `formatTime`、Canvas 初始化等）与 Tailwind 高频重复模式上。
