# Design: Fix Modbus TCP ReuseSerial Mode

## Affected Files

- `server/runtime/devices/modbus/index.js` — 主要修改文件

## Design Details

### 1. 引入 SharedConnection 管理器

在 `server/runtime/index.js` 的 runtime 对象中，`socketPool` 和 `socketMutex` 是独立的 Map。修改方案将它们统一管理，使用一个复合结构：

```javascript
// Use a module-level sharedTcpConnections Map instead of
// directly using socketPool and socketMutex from runtime.
```

由于 `socketPool` 和 `socketMutex` 是 runtime 级别的共享资源，且其他模块（如 redis）也引用它们，我们不改变 runtime 接口。而是在 modbus/index.js 模块级别引入一个 `sharedTcpConnections` Map 来管理 TCP 连接的引用计数：

```javascript
// Module-level shared TCP connection pool with reference counting
const sharedTcpConnections = new Map();
// key: address (e.g. "192.168.1.100:502")
// value: {
//   socket: net.Socket,
//   mutex: Mutex | null,
//   refCount: number,
//   connecting: boolean
// }
```

### 2. 修改 `_connect()` — TCP + socketReuse 路径

**当前代码（有 bug）：**
```javascript
if (runtime.socketPool.has(address)) {
    socket = runtime.socketPool.get(address);
} else {
    socket = new net.Socket();
    runtime.socketPool.set(address, socket);
    if (socketReuse === ReuseSerial) {
        runtime.socketMutex.set(address, new Mutex());
    }
}
var openFlag = socket.readyState === "opening" || socket.readyState === "open";
if (!openFlag) {
    socket.connect({host, port});  // 异步，不等待
}
// ... linkTCP(socket, callback) — callback 可能在 socket 未就绪时被调用
```

**修复后：**
```javascript
if (!sharedTcpConnections.has(address)) {
    // First device to use this address, create a SharedConnection
    const shared = {
        socket: new net.Socket(),
        mutex: (socketReuse === ReuseSerial) ? new Mutex() : null,
        refCount: 0,
        connecting: false
    };
    sharedTcpConnections.set(address, shared);

    // Auto-cleanup when the underlying socket closes
    shared.socket.on('close', () => {
        sharedTcpConnections.delete(address);
    });
}

const shared = sharedTcpConnections.get(address);
shared.refCount++;

// Ensure the shared socket is connected before proceeding
const connectSocket = () => {
    return new Promise((resolve, reject) => {
        const openFlag = shared.socket.readyState === "opening"
                      || shared.socket.readyState === "open";
        if (openFlag) {
            return resolve();
        }
        if (shared.connecting) {
            // Another device is connecting, wait for it
            shared.socket.once('connect', resolve);
            shared.socket.once('error', reject);
            return;
        }
        shared.connecting = true;
        shared.socket.connect({host, port});
        shared.socket.once('connect', () => {
            shared.connecting = false;
            resolve();
        });
        shared.socket.once('error', (err) => {
            shared.connecting = false;
            shared.refCount--;  // Rollback ref count on connection failure
            reject(err);
        });
    });
};

try {
    await connectSocket();
    // Bind this Modbus client to the shared socket
    client.linkTCP(shared.socket, callback);
} catch (err) {
    callback(err);
}
```

### 3. 修改 `disconnect()` — 不关闭共享 Socket

**当前代码（有 bug）：**
```javascript
this.disconnect = function () {
    return new Promise(function (resolve, reject) {
        if (!client.isOpen) {
            resolve(true);
        } else {
            client.close(function (result) {  // ← 这会调用 socket.end()!
                resolve(result);
            });
        }
    });
}
```

**修复后：**

对于 TCP + socketReuse 模式，`client.close()` 会导致 `TcpPort.close()` → `socket.end()`，这会关闭共享 Socket。解决方案是：对于共享模式，不调用 `client.close()`，而是仅清理本地状态。

```javascript
this.disconnect = function () {
    return new Promise(function (resolve, reject) {
        _checkWorking(false);

        // TCP + socketReuse mode: only decrement ref count, don't close the shared socket
        if (type === ModbusTypes.TCP && data.property.socketReuse) {
            const address = data.property.address;
            const shared = sharedTcpConnections.get(address);
            if (shared) {
                shared.refCount = Math.max(0, shared.refCount - 1);
                if (shared.refCount === 0) {
                    // Last user, safe to destroy the socket
                    sharedTcpConnections.delete(address);
                    shared.socket.destroy();
                }
            }
            _connected = false;
            _emitStatus('connect-off');
            _clearVarsValue();
            resolve(false);
        } else {
            // Original logic for non-shared modes
            if (!client.isOpen) {
                _emitStatus('connect-off');
                _clearVarsValue();
                resolve(true);
            } else {
                client.close(function (result) {
                    if (result) {
                        logger.error(`'${data.name}' try to disconnect failed!`);
                    } else {
                        logger.info(`'${data.name}' disconnected!`, true);
                    }
                    _emitStatus('connect-off');
                    _clearVarsValue();
                    resolve(result);
                });
            }
        }
    });
}
```

**关键问题**: `modbus-serial` 的 `client.isOpen` 返回 `this._port.isOpen`，即 `TcpPort.openFlag`。在共享模式下我们不能调用 `client.close()`（会关闭 Socket），但又需要让 `isConnected()` 返回 `false`。

**解决方案**: 在 `MODBUSclient` 实例级别维护一个 `_connected` 标志，在共享模式下用它替代 `client.isOpen`：

```javascript
var _connected = false;  // Used in shared-socket mode to track connection state

this.isConnected = function () {
    if (type === ModbusTypes.TCP && data.property.socketReuse) {
        return _connected;
    }
    return client.isOpen;
}
```

在 `_connect` 成功回调中设置 `_connected = true`，在 `disconnect` 中设置 `_connected = false`。

同时，共享模式下不调用 `client.close()`，改为手动移除 port 上的事件监听器，让 TcpPort 实例被 GC 回收，但保留底层 Socket。

### 4. 修改 `_checkWorking()` — 不关闭共享 Socket

**当前代码（有 bug）：**
```javascript
if (overloading >= 3) {
    if (type !== ModbusTypes.RTU) {
        logger.warn(`'${data.name}' working overload! ${overloading}`);
    }
    client.close();  // ← 杀死共享 Socket!
}
```

**修复后：**
```javascript
if (overloading >= 3) {
    if (type !== ModbusTypes.RTU) {
        logger.warn(`'${data.name}' working overload! ${overloading}`);
    }
    if (type === ModbusTypes.TCP && data.property.socketReuse) {
        // Shared-socket mode: don't close the shared socket,
        // just reset local state. device.js will handle reconnect
        // in the next checkStatus cycle.
        working = false;
        overloading = 0;
        _connected = false;
        _emitStatus('connect-error');
    } else {
        client.close();
    }
}
```

### 5. Polling/setValue Mutex 路径适配

当前代码在 `polling()` 和 `setValue()` 中使用 `runtime.socketMutex`，修改后改为使用 `sharedTcpConnections` 中的 `mutex`：

**当前：**
```javascript
if (resourceKey && runtime.socketMutex.has(resourceKey)) {
    socketRelease = await runtime.socketMutex.get(resourceKey).acquire();
}
```

**修复后：**
```javascript
const shared = sharedTcpConnections.get(resourceKey);
if (shared && shared.mutex) {
    socketRelease = await shared.mutex.acquire();
}
```

### 6. Socket 错误处理和自动重建

在 SharedConnection 的 Socket 上注册全局错误处理器，当 Socket 异常断开时：

```javascript
shared.socket.on('error', (err) => {
    logger.error(`Shared TCP connection error for ${address}: ${err}`);
});

shared.socket.on('close', () => {
    sharedTcpConnections.delete(address);
    // Devices relying on this socket will detect isConnected() = false
    // in their next checkStatus cycle, and device.js will trigger
    // a reconnect which creates a new SharedConnection.
});
```

## Data Flow

```
连接流程（修复后）:
───────────────────────────────────────────────────────────────────

  Device A.connect()                    Device B.connect()
       │                                      │
       ▼                                      ▼
  sharedTcpConnections.get(addr)        sharedTcpConnections.get(addr)
       │ not found → create                  │ found → reuse
       ▼                                      ▼
  new SharedConnection {socket,         refCount++ (1→2)
    mutex, refCount=1}                       │
       │                                      │
       ▼                                      ▼
  await socket.connect()                socket.readyState === "open"
       │                                      │
       ▼                                      ▼
  client.linkTCP(shared.socket)         client.linkTCP(shared.socket)
       │                                      │
       ▼                                      ▼
  _connected = true                     _connected = true


断开流程（修复后）:
───────────────────────────────────────────────────────────────────

  Device A.disconnect()                 Device B (不受影响)
       │
       ▼
  shared.refCount-- (2→1)
  refCount > 0 → 不关闭 Socket
       │
       ▼
  _connected = false
  清理本地 TcpPort 事件监听
       │
       ▼
  _emitStatus('connect-off')


  Device B.disconnect()  (最后一个)
       │
       ▼
  shared.refCount-- (1→0)
  refCount === 0 →
    sharedTcpConnections.delete(addr)
    socket.destroy()
```

## Backward Compatibility

- **非 socketReuse 模式**: 所有代码路径不变，`sharedTcpConnections` 不会被使用
- **TCP + Reuse（无 Mutex）**: `shared.mutex = null`，polling/setValue 中不获取 Mutex
- **TCP + ReuseSerial（有 Mutex）**: `shared.mutex = new Mutex()`，polling/setValue 中正常获取 Mutex
- **runtime.socketPool / runtime.socketMutex**: 保持原有接口不变，其他模块（如 redis）不受影响
