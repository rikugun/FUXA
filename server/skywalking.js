const {default: agent} = require('skywalking-backend-js');
agent.start({
    // 服务名
    serviceName: 'fuxa',
    // 服务实例名
    serviceInstance: 'service-name-instance-skyw',
    // APM上报路径 (来自第一步)
    // collectorAddress: 'ap-guangzhou.apm.tencentcs.com:11800',
    collectorAddress: '192.168.30.22:11800',
    // Token (来自第一步)
    // authorization:'xxxxx',
});