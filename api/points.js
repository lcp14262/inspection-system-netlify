// api/points.js
const CHECKIN_POINTS = {
    'A001': { name: '1号厂房东侧', area: '生产车间', lat: 31.229975, lng: 118.1795, radius: 100 },
    'A002': { name: '安庆工厂', area: '仓储区', lat: 31.2318, lng: 120.6790, radius: 50 },
    'B001': { name: '合肥工厂', area: '危化品区', lat:31.7608, lng:117.2027, radius: 200 },
};

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    const points = Object.entries(CHECKIN_POINTS).map(([id, p]) => ({
        id, ...p, items: ['消防设施', '安全通道', '设备状态'], frequency: '每日',
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, points })
    };
};
