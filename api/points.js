const CHECKIN_POINTS = {
'A001': { name: '1号厂房东侧', area: '生产车间', lat: 31.230834, lng: 118.173690, radius: 100 },
    'A002': { name: '安庆工厂', area: '仓储区', lat: 30.5215, lng: 117.0478, radius: 200 },
    'B001': { name: '合肥工厂', area: '危化品区', lat: 31.7608, lng: 117.2027, radius: 200 },
};

exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // 处理 OPTIONS 预检请求（关键！解决跨域）
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    try {
        const points = Object.entries(CHECKIN_POINTS).map(([id, p]) => ({
            id,
            ...p,
            items: ['消防设施', '安全通道', '设备状态'],
            frequency: '每日'
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, points })
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: err.message })
        };
    }
};
