# Proposal: Fix Modbus TCP ReuseSerial Mode

## Summary

修复 Modbus TCP 连接在 `socketReuse = ReuseSerial` 模式下的多个缺陷，使多个设备能够安全地共享同一个 TCP Socket 连接进行 Modbus 通信。

## Background

当前 FUXA 支持多个 Modbus TCP 设备通过 `socketPool` 共享同一个 `net.Socket` 连接。当 `socketReuse` 设为 `ReuseSerial` 时，还会创建 Mutex 来串行化访问。然而，此模式存在以下致命缺陷：

1. **断开传播（致命）**: 一个设备调用 `disconnect()` → `client.close()` → `socket.end()` 会关闭共享 Socket，导致同地址的所有设备同时断开。
2. **过载关闭传播（致命）**: `_checkWorking()` 过载保护调用 `client.close()` 同样会杀死共享连接。
3. **连接竞态（严重）**: `socket.connect()` 是异步的，但 `linkTCP` 不等待连接完成就可能回调成功。
4. **死池污染（严重）**: 断开后 Socket 已关闭但仍留在 `socketPool` 中，后续设备取到死 Socket 导致连接永远失败。
5. **无引用计数（中等）**: 不知道有多少设备在使用共享 Socket，无法安全清理资源。

## Approach

### 核心思路：引用计数 + 不关闭共享 Socket

```
                    修复后架构
┌─────────────────────────────────────────────────┐
│  socketPool: Map<address, SharedConnection>      │
│                                                  │
│  SharedConnection {                              │
│    socket: net.Socket,                           │
│    refCount: number,     ← 引用计数              │
│    mutex: Mutex          ← 串行化访问             │
│  }                                               │
│                                                  │
│  Device A ──┐                                    │
│             ├─▶ SharedConnection (refCount=2)    │
│  Device B ──┘       ↕ Mutex 串行化                │
│                     ↕ 共享 Socket                 │
│                       ↓                           │
│                  TCP 线路                         │
└─────────────────────────────────────────────────┘
```

### 修复策略

1. **引入 `SharedConnection` 管理类**: 封装 Socket 生命周期、引用计数和 Mutex
2. **修改 `disconnect()`**: 仅减少引用计数，不关闭 Socket；最后一个设备断开时才真正关闭
3. **修改 `_checkWorking()` 过载保护**: 不直接 `client.close()`，改为仅标记断开状态
4. **修复连接竞态**: 等待 Socket `connect` 事件后再回调
5. **清理死池**: Socket 关闭时从 pool 中移除，下次连接时创建新 Socket

## Scope

### In Scope
- `server/runtime/devices/modbus/index.js` 中的 `_connect()`、`disconnect()`、`polling()`、`setValue()`、`_checkWorking()`
- 仅限 `ModbusTypes.TCP` + `socketReuse` 模式
- 兼容现有的 `Reuse`（无 Mutex）和 `ReuseSerial`（有 Mutex）两种子模式

### Out of Scope
- Modbus RTU 的 `ReuseSerial` 模式（串口复用需要完全不同的架构）
- 客户端 UI 变更
- 其他设备类型的连接管理

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 修改影响非 ReuseSerial 模式 | 中 | 严格条件判断，仅在新代码路径中生效 |
| SharedConnection 引用计数泄漏 | 低 | 在 device stop/remove 时确保 decrement |
| 现有用户升级后行为变化 | 低 | 仅修复 bug，不改变 API 语义 |

## Success Criteria

1. 多个 Modbus TCP 设备共享同一 Socket 地址时，一个设备断开不影响其他设备
2. 所有设备断开后，共享 Socket 和 Mutex 被正确清理
3. Socket 连接失败或断开后，能自动从 pool 中清理并重建
4. `_checkWorking` 过载保护不会杀死共享连接
5. 现有非 socketReuse 模式行为不受影响
