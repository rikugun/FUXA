# Tasks: Fix Modbus TCP ReuseSerial Mode

## Task 1: 添加模块级 SharedConnection 管理器 [x]
**文件**: `server/runtime/devices/modbus/index.js`
- 在模块级别添加 `sharedTcpConnections` Map
- 定义 SharedConnection 结构 `{ socket, mutex, refCount, connecting }`
- 添加辅助函数 `getOrCreateSharedConnection(address, port, needMutex)` 返回 SharedConnection
- 添加辅助函数 `releaseSharedConnection(address)` 减引用计数并在 refCount=0 时清理

## Task 2: 重写 `_connect()` TCP + socketReuse 路径 [x]
**文件**: `server/runtime/devices/modbus/index.js` — `_connect()` 函数 TCP 分支
- 将 `_connect` 改为 `async function` 以支持 `await connectSocket()`
- 使用 `sharedTcpConnections` 替代直接操作 `runtime.socketPool`
- 实现 `await connectSocket()` 等待 Socket 真正就绪后再 `linkTCP`
- 处理连接失败的 refCount 回退
- 保留原有非 socketReuse 路径不变

## Task 3: 修改 `connect()` 适配 async _connect [x]
**文件**: `server/runtime/devices/modbus/index.js` — `this.connect()`
- `_connect` 改为 async 后，`this.connect()` 需要适配
- 设置 `_connected` 标志：成功时 `true`，失败时 `false`
- 调用 `this.init()` 时确认 TCP 类型

## Task 4: 重写 `disconnect()` 共享模式路径 [x]
**文件**: `server/runtime/devices/modbus/index.js` — `this.disconnect()`
- 添加 `_connected` 实例变量（共享模式替代 `client.isOpen`）
- TCP + socketReuse 路径：调用 `releaseSharedConnection()`，不调用 `client.close()`
- 重置 `_connected = false`
- 清理 TcpPort 上的事件监听器（通过 `port.removeAllListeners()`）
- 保留非共享模式的原有 `client.close()` 逻辑

## Task 5: 修改 `isConnected()` 支持共享模式 [x]
**文件**: `server/runtime/devices/modbus/index.js` — `this.isConnected()`
- TCP + socketReuse 模式下返回 `_connected` 而非 `client.isOpen`
- 其他模式保持 `client.isOpen` 不变

## Task 6: 修改 `_checkWorking()` 过载保护 [x]
**文件**: `server/runtime/devices/modbus/index.js` — `_checkWorking()`
- TCP + socketReuse 过载时：重置 working 状态、设 `_connected = false`、emit connect-error
- 不调用 `client.close()`（避免杀死共享 Socket）
- 其他模式保持原有 `client.close()` 逻辑

## Task 7: 修改 polling/setValue Mutex 获取路径 [x]
**文件**: `server/runtime/devices/modbus/index.js` — `this.polling()` 和 `this.setValue()`
- 将 `runtime.socketMutex.get(resourceKey).acquire()` 改为从 `sharedTcpConnections` 获取 mutex
- 兼容 shared.mutex 为 null 的情况（Reuse 模式无 Mutex）

## Task 8: 验证和测试 [x]
- 检查所有修改点的编译问题
- 确认非 socketReuse 模式的代码路径未被影响
- 确认 `_connect` 改为 async 后上层调用方 `device.js` 的兼容性
