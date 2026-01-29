## 调整点（按你补充要求）
- 第一阶段 **先使用假数据（Mock）**：不新增后端接口、不依赖真实 MCP Server，可在 UI 内完成“服务配置 → 工具选择 → 写入 Toolbox.tools → 导出 MCP JSON”。

## 交互与流程（保持不变）
- **点击 MCP**：打开“服务管理弹窗”
  - 新增/编辑/删除服务（name+url，url 唯一校验在前端完成）
  - “查询工具”按钮：使用 Mock Provider 返回工具列表（或返回错误/空列表）
- **点击 Add**：打开“工具选择弹窗”
  - 按服务分组展示 tools + checkbox
  - 多选/跨服务选择
  - 点击 “Add Tools”：把选中工具写入当前 TOOLBOX 节点 tools，并生成 MCP JSON（tools + interrupt_config）供复制/下载

## Mock 数据策略（可配置、可替换）
- 新增一个“工具数据提供者”抽象，后续替换为真实 `tools/list` 调用不影响 UI：
  - `provider.ts`：`listTools(server: McpServer): Promise<McpTool[]>`
- 提供默认 Mock 规则：
  - 对已知示例 URL（如 `https://tools.langchain.com`）返回错误（模拟 404）并展示错误提示。
  - 对其它 URL：返回一组固定工具（含 `name/display_name/mcp_server_*`），用于联调 UI。

## 前端落点（低耦合 + 命名规范）
- 不新增页面；通过 TOOLBOX header slot 接入弹窗。
- 新目录（两词中横线）：`components/agent-topology/mcp-service/`
  - `types.ts`：`McpServer` / `McpTool` / `McpConfig`（按 PRD）
  - `state.ts`：services、toolsCache、selected、loading/error
  - `provider.ts`：Mock tools/list 提供者（当前阶段只实现 mock）
  - `service.tsx`：服务管理弹窗（CRUD + 查询工具）
  - `picker.tsx`：工具选择弹窗（checkbox、多选、分组、预览）
  - `export.ts`：纯函数生成 `interrupt_config`（key 规则：`{url}::{tool}::{name}`，value `true`）
- 修改默认 toolbox header：从 [defaults.tsx](file:///e:/mspbots/visual-agent/components/agent-topology/slots/defaults.tsx) 接入 MCP/Add 逻辑；利用 slotProps 的 `nodeId`，通过 `@xyflow/react` 的 `useReactFlow().setNodes()` 更新该 TOOLBOX 节点的 `data.tools`。

## 数据映射（写入 Toolbox.tools）
- 选中的 `McpTool` → `ToolItem`：
  - `id`: `${mcp_server_url}::${name}`（稳定、便于去重）
  - `name`: `display_name ?? name`
  - `source`: `mcp_server_name`
  - `status`: 默认 `active`
- 去重：同 id 已存在则跳过并提示。

## 验证
- 单测（纯函数）：`interrupt_config` key 拼接、URL 规范化（去尾 `/`）、去重。
- 交互验证：
  - MCP 弹窗 CRUD + mock 查询
  - Add 弹窗勾选 → 写入 Toolbox.tools
  - JSON 预览/复制/下载
- 构建：`pnpm run build`。

## 第二阶段（后续替换为真 MCP，可选）
- 将 `provider.ts` 从 mock 替换为后端代理或直连（避免 CORS/安全问题建议走后端），UI 与数据结构不变。