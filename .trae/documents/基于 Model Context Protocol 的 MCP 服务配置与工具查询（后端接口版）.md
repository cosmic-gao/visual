## 目标
- 严格按 [AGENTS.md](file:///e:/mspbots/visual-agent/AGENTS.md) 规范实现：
  - 前端调用后端必须使用 `$fetch`（不直接用 `fetch()`）。
  - 不杜撰 API/文件路径。
- **MCP 业务逻辑与 UI 放在 `agent-topology` 外部**（你要求的“组件外部”指整个 `agent-topology` 之外）。
- `agent-topology` 只通过 slot 触发弹窗、展示结果、把工具写入 Toolbox 节点。
- `service/server.ts` 实现接口（先不持久化，用内存对象保存）。

## 后端实现（service/server.ts）
### 内存存储
- `serversByUrl: Record<string, { name: string; url: string; transport?: 'http' | 'jsonrpc' }>`
- `toolsCacheByUrl: Record<string, { tools: any[]; fetchedAt: string }>`（可选）

### API（稳定 JSON 输出）
- `GET /api/mcp/servers`：列出服务
- `POST /api/mcp/servers`：新增服务（校验 url 唯一）
- `PUT /api/mcp/servers`：更新服务（支持 url 迁移）
- `DELETE /api/mcp/servers?url=...`：删除服务
- `GET /api/mcp/tools?url=...`：查询工具列表
  - 适配 MCP tools/list（参考 Inspector 的常见实现）：
    1) `GET {serverUrl}/tools/list`
    2) 失败则 JSON-RPC：`POST {serverUrl}` body `{ jsonrpc:'2.0', id:1, method:'tools/list', params:{} }`
  - 统一返回 `McpTool[]`（含 `name, display_name, description, input_schema, mcp_server_name, mcp_server_url`）
  - 统一错误返回 `{ message, status, url }`

### 运行权限说明
- 若运行环境 `net` 权限不可用，tools 查询会失败；接口返回清晰错误以便 UI Notifications 展示。
- 如需连远程 MCP Server，再单独补一个最小改动：在 `package.json#manifest.permissions` 开启 net 权限（按平台允许的字段）。

## 前端实现（agent-topology 外部）
### 新建目录（两词中横线，文件名单词化）
- `components/mcp-service/`
  - `types.ts`：McpServer/McpTool/McpConfig
  - `api.ts`：封装 `$fetch` 调用上述后端 API（组件外部处理接口）
  - `state.ts`：`useMcpController()`（组件外部处理数据流：servers/tools/activeUrl/loading/errors/logs/selection）
  - `service.tsx`：MCP Inspector 风格“服务/连接/Tools/Notifications”弹窗（只做交互 + 展示；通过 props/回调接入 controller）
  - `picker.tsx`：Tools/Export/Notifications 弹窗（只做交互 + 展示）
  - `export.ts`：纯函数生成 PRD 规定的 MCP JSON（tools + interrupt_config）

### 与 agent-topology 的集成方式
- `agent-topology/slots/defaults.tsx` 只做“挂载点/桥接”
  - 在 `ToolboxHeader` 内使用 `useMcpController()`（来自 `components/mcp-service/state.ts`）
  - 把 controller 的数据与 actions 传给 `components/mcp-service/service.tsx` / `picker.tsx`
  - “Add to Toolbox” 仍使用 `updateNodeData()` 写入 Toolbox 节点 `data.tools[]`
- `agent-topology` 内现有 `mcp-service/*` 将迁移到 `components/mcp-service/*`，并更新 import 引用。

## 验证
- `pnpm run build`
- 手动回归：
  - MCP 弹窗：新增/编辑/删除服务 → Refresh tools → Tools 列表展示
  - Add 弹窗：勾选工具 → Export 生成 JSON → Add to Toolbox 写入
  - 失败/超时：Notifications 有错误信息

按此计划实现后，MCP 的“配置/查询/选择/导出”都会在 `agent-topology` 外部完成，`agent-topology` 仅负责 UI 入口与展示/写入节点数据。