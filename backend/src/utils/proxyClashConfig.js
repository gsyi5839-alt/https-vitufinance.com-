/**
 * Build Clash YAML configuration from proxy nodes.
 */
export function buildClashConfig(nodes, subscriptionName = 'VituProxy') {
    const proxies = [];
    const proxyNames = [];

    for (const node of nodes) {
        const proxyConfig = buildProxyConfig(node);
        if (proxyConfig) {
            proxies.push(proxyConfig);
            proxyNames.push(node.name);
        }
    }

    const config = {
        port: 7890,
        'socks-port': 7891,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'info',
        'external-controller': '127.0.0.1:9090',
        proxies: proxies,
        'proxy-groups': [
            {
                name: '🚀 节点选择',
                type: 'select',
                proxies: ['♻️ 自动选择', 'DIRECT', ...proxyNames]
            },
            {
                name: '♻️ 自动选择',
                type: 'url-test',
                proxies: proxyNames,
                url: 'http://www.gstatic.com/generate_204',
                interval: 300,
                tolerance: 50
            },
            {
                name: '🎯 全球直连',
                type: 'select',
                proxies: ['DIRECT', '🚀 节点选择']
            },
            {
                name: '🛑 广告拦截',
                type: 'select',
                proxies: ['REJECT', 'DIRECT']
            },
            {
                name: '🐟 漏网之鱼',
                type: 'select',
                proxies: ['🚀 节点选择', 'DIRECT', '♻️ 自动选择']
            }
        ],
        rules: [
            'DOMAIN-SUFFIX,cn,🎯 全球直连',
            'DOMAIN-KEYWORD,baidu,🎯 全球直连',
            'DOMAIN-KEYWORD,alibaba,🎯 全球直连',
            'DOMAIN-KEYWORD,taobao,🎯 全球直连',
            'DOMAIN-KEYWORD,qq,🎯 全球直连',
            'DOMAIN-KEYWORD,weixin,🎯 全球直连',
            'DOMAIN-KEYWORD,wechat,🎯 全球直连',
            'DOMAIN-KEYWORD,adservice,🛑 广告拦截',
            'DOMAIN-KEYWORD,googleads,🛑 广告拦截',
            'DOMAIN-SUFFIX,google.com,🚀 节点选择',
            'DOMAIN-SUFFIX,youtube.com,🚀 节点选择',
            'DOMAIN-SUFFIX,twitter.com,🚀 节点选择',
            'DOMAIN-SUFFIX,x.com,🚀 节点选择',
            'DOMAIN-SUFFIX,facebook.com,🚀 节点选择',
            'DOMAIN-SUFFIX,instagram.com,🚀 节点选择',
            'DOMAIN-SUFFIX,telegram.org,🚀 节点选择',
            'DOMAIN-SUFFIX,t.me,🚀 节点选择',
            'DOMAIN-SUFFIX,github.com,🚀 节点选择',
            'DOMAIN-SUFFIX,githubusercontent.com,🚀 节点选择',
            'DOMAIN-SUFFIX,openai.com,🚀 节点选择',
            'DOMAIN-SUFFIX,anthropic.com,🚀 节点选择',
            'GEOIP,CN,🎯 全球直连',
            'MATCH,🐟 漏网之鱼'
        ]
    };

    return convertToYaml(config);
}

function buildProxyConfig(node) {
    const baseConfig = {
        name: node.name,
        server: node.server,
        port: node.port
    };

    let extraConfig = {};
    if (node.extra_config) {
        try {
            extraConfig = typeof node.extra_config === 'string'
                ? JSON.parse(node.extra_config)
                : node.extra_config;
        } catch (error) {
            console.warn(`[ProxyRoutes] Invalid extra_config for node ${node.name}`);
        }
    }

    switch (node.proxy_type.toLowerCase()) {
        case 'ss':
        case 'shadowsocks':
            return {
                ...baseConfig,
                type: 'ss',
                cipher: node.cipher || 'aes-256-gcm',
                password: node.password,
                ...extraConfig
            };

        case 'vmess':
            return {
                ...baseConfig,
                type: 'vmess',
                uuid: node.password,
                alterId: extraConfig.alterId || 0,
                cipher: extraConfig.cipher || 'auto',
                tls: extraConfig.tls || false,
                ...extraConfig
            };

        case 'trojan':
            return {
                ...baseConfig,
                type: 'trojan',
                password: node.password,
                sni: extraConfig.sni || node.server,
                'skip-cert-verify': extraConfig.skipCertVerify || false,
                ...extraConfig
            };

        case 'hysteria2':
        case 'hy2':
            return {
                ...baseConfig,
                type: 'hysteria2',
                password: node.password,
                sni: extraConfig.sni || node.server,
                'skip-cert-verify': extraConfig.skipCertVerify || false,
                ...extraConfig
            };

        case 'vless':
            return {
                ...baseConfig,
                type: 'vless',
                uuid: node.password,
                flow: extraConfig.flow || '',
                tls: extraConfig.tls || true,
                ...extraConfig
            };

        default:
            console.warn(`[ProxyRoutes] Unknown proxy type: ${node.proxy_type}`);
            return null;
    }
}

function convertToYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;

        if (Array.isArray(value)) {
            result += `${spaces}${key}:\n`;
            for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    result += `${spaces}  - `;
                    const itemYaml = convertToYaml(item, indent + 2);
                    const lines = itemYaml.split('\n').filter(l => l.trim());
                    result += lines[0].trim() + '\n';
                    for (let i = 1; i < lines.length; i++) {
                        result += `${spaces}    ${lines[i].trim()}\n`;
                    }
                } else {
                    result += `${spaces}  - ${formatYamlValue(item)}\n`;
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            result += `${spaces}${key}:\n`;
            result += convertToYaml(value, indent + 1);
        } else {
            result += `${spaces}${key}: ${formatYamlValue(value)}\n`;
        }
    }

    return result;
}

function formatYamlValue(value) {
    if (typeof value === 'string') {
        if (value.includes(':') || value.includes('#') || value.includes('"') ||
            value.includes("'") || value.startsWith(' ') || value.endsWith(' ')) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return String(value);
}
