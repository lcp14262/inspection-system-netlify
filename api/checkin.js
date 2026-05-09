// api/checkin.js
exports.handler = async function(event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, message: '方法不允许' }) };
    }

    let body;
    try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, message: '数据格式错误' }) }; }

    const { point_id, lat, lng, result, description, photo } = body;

    const CHECKIN_POINTS = {
         'A001': { name: '1号厂房东侧', area: '生产车间', lat: 31.230834, lng: 118.173694, radius: 100 },
         'A002': { name: '安庆工厂', area: '仓储区', lat: 30.5215, lng: 117.0478, radius: 200 },
         'B001': { name: '合肥工厂', area: '危化品区', lat: 31.7608, lng: 117.2027, radius: 200 },
    };
    const point = CHECKIN_POINTS[point_id];
    if (!point) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, message: '点位不存在' }) };

    const R = 6371000;
    const dLat = (point.lat - lat) * Math.PI / 180;
    const dLng = (point.lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(point.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    if (distance > point.radius) return { statusCode: 403, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, message: `位置校验失败！距离 ${distance.toFixed(1)} 米，超出 ${point.radius} 米范围` }) };
    if (result === '异常' && (!description || description.trim() === '')) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, message: '异常必须填写问题描述' }) };

    try {
        const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }) });
        const tokenData = await tokenRes.json();
        const token = tokenData.tenant_access_token;

        // 1. 如果有照片，先上传照片到飞书
        let fileToken = null;
        if (photo) {
            const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const formData = new FormData();
            formData.append('parent_type', 'bitable_app');
            formData.append('parent_node', process.env.FEISHU_BITABLE_TOKEN);
            formData.append('file_name', `photo_${Date.now()}.jpg`);
            formData.append('file', new Blob([buffer]), `photo_${Date.now()}.jpg`);

            const uploadRes = await fetch('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.code === 0) fileToken = uploadData.data.file_token;
        }

        // 2. 获取北京时间
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        // 3. 创建记录
        const fields = {
            '点位名称': point.name, '巡检时间': timeStr, '巡检结果': result,
            'GPS纬度': lat, 'GPS经度': lng, '距点位距离': Math.round(distance*10)/10,
            '问题描述': description || '', '处理状态': result === '异常' ? '待处理' : '已解决',
        };
        if (fileToken) fields['现场照片'] = [{ "file_token": fileToken }];

        const recordRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BITABLE_TOKEN}/tables/${process.env.FEISHU_TABLE_ID}/records`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ fields })
        });
        const recordData = await recordRes.json();
        if (recordData.code !== 0) throw new Error(recordData.msg);

        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, message: '打卡成功，数据已存入飞书表格', distance: Math.round(distance*10)/10 }) };
    } catch (err) {
        return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, message: '写入失败: ' + err.message }) };
    }
};
