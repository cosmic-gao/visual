## apikey 检查结论与改法
- 你要求：apikey 必须通过 Header 传递；如果已经能放到 Header，则移除 apiKey 字段与相关 UI/逻辑。
- 现状：
  - 后端 [server.ts](file:///e:/mspbots/visual-agent/service/server.ts) 仍有 apiKey 字段，并且会自动写 Authorization / query api_key。
  - 前端 [types.ts](file:///e:/mspbots/visual-agent/components/mcp-service/types.ts) 仍有 apiKey 字段；[api.ts](file:///e:/mspbots/visual-agent/components/mcp-service/api.ts) 仍在 tools/list 请求里发送 apiKey。
- 结论：当前已能用 Header 传鉴权，因此将彻底移除 apiKey，统一用 headers。

## 目标
- Toolbox 节点支持真实 MCP Server：配置 headers/config → 拉取 tools/list → 选择并添加。
- 移除测试数据与重复代码。
- 命名：方法/变量 1~2 词；组件名 ≤2 词；新增文件名 1 词。

## 后端改造（service/server.ts）
1. 移除测试与 debug
   - 删除 ensureTestServer、/api/mcp-test*、console.debug/log。
2. 移除 apiKey 字段（只保留 headers/config）
   - McpServer 去掉 apiKey。
   - buildHeaders 仅合并 server.headers。
   - /api/mcp/servers：保存 headers/config。
   - /api/mcp/tools：请求体支持 headers/config；缺省回落已保存值。
3. Smithery 兼容（用户仍只填 Header）
   - 若 host 是 server.smithery.ai 且 headers 含 Authorization: Bearer <token>，则从 Bearer token 推导并注入 query api_key=<token>。
4. tools/all 错误 url
   - errors 返回真实 url（不再 unknown）。
5. 去重复与命名收敛
   - tools/list 多路径请求整理为“策略数组 + 执行器”。
   - 统一把 3+ 词函数改为 1~2 词并同步引用（例如 normalizeServerUrl→normalizeServer、fetchWithTimeout→fetchTimed 等）。

## 前端改造（components/mcp-service + Toolbox）
1. 类型与接口统一
   - McpServer：删除 apiKey，新增 headers/config。
   - api.ts：create/update/listTools 全部改为发送 headers/config。
   - state.ts：透传并缓存 headers/config。
2. UI：完全用 Headers
   - service.tsx 移除 API Key 输入框。
   - Headers 编辑区默认提供 Authorization / Bearer（value 可空）。
   - 你提供的 key 通过该 Header 填写（不写进仓库代码）。
3. Toolbox 添加闭环
   - 修复 onAdd 签名：defaults.tsx 的 onAdd 接收 (tools, config)。
   - Toolbox 写入 tools + mcpConfig（2 词命名）。

## 真实 server（Playwright MCP）添加方式
- URL：https://server.smithery.ai/@enriquedlh97/playwright-mcp
- Header：Authorization: Bearer <你的 key>
- 说明：不会把 key 写到代码里；只通过 UI 输入或环境变量注入（可选）。

## 验证
- 通过上述 Header 拉取 tools/list 成功。
- Toolbox 节点工具可添加且持久展示。
- TS 类型与 props 无报错。

确认后我开始改代码并完成验证。