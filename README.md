# codelint

Python 代码层级检查工具。检查依赖方向违规和文件大小。

## 安装

```bash
npm install -g github:voxServalG/codelint
```

需要 Node.js >= 18 和 Python >= 3.10。

## 快速开始

```bash
codelint deploy     # 自动探测项目配置并部署
codelint check      # 检查代码层级与文件大小
```

### deploy

交互式配置向导。自动探测项目的模块前缀、层级划分，展示检测结果，逐项让用户确认或修改。完成后写入两个文件：

- `codelint.json` — 项目配置
- `.github/workflows/code-quality.yml` — CI 工作流

### check

读取 `codelint.json` 配置，扫描源代码执行两项检查：

1. **层级方向**：底层不可导入高层（low-level → high-level 方向禁止）
2. **文件大小**：超过阈值行数的文件报 warning 或 error

支持 `--json` 输出机器可读的 JSON 报告。

## 检查规则

| 规则 | 级别 | 说明 |
|------|------|------|
| `layer-direction` | error | 低层级模块导入了高层级模块 |
| `file-size` | error/warning | 文件超过行数阈值 |

层级方向规则：**更小的层级不能 import 更大的层级**。比如 L0 (纯基元) 不能 import L1 (业务核心)，L1 不能 import L2 (终端入口)。同级或向下允许。

## 配置

`codelint.json` 示例：

```json
{
  "modulePrefix": "origo",
  "srcDir": "src",
  "maxLinesError": 500,
  "maxLinesWarning": 300,
  "tiers": [
    {
      "name": "纯基元",
      "modules": ["origo.internal.core", "origo.internal.config", "origo.internal.log", "origo.internal.research"]
    },
    {
      "name": "业务核心",
      "modules": ["origo.signal", "origo.strategy", "origo.execute"]
    },
    {
      "name": "终端入口",
      "modules": ["origo.internal.cli"]
    }
  ]
}
```

| 字段 | 说明 | 默认 |
|------|------|------|
| `modulePrefix` | 模块前缀（只检查该前缀下的导入） | 自动检测 |
| `srcDir` | 源代码目录 | `src` |
| `maxLinesError` | 文件行数 error 阈值 | `500` |
| `maxLinesWarning` | 文件行数 warning 阈值 | `300` |
| `tiers` | 层级定义列表 | 自动检测 |

### tiers 字段

每个 tier 包含：

| 字段 | 说明 |
|------|------|
| `name` | 层级名称（如"纯基元"） |
| `modules` | 属于该层的模块路径列表 |

层级从 L0 开始编号，规则：L<N> 不能 import L<M>（N < M 时禁止）。
