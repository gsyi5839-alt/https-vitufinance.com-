import { express, dbQuery, authMiddleware, secureLog } from './shared.js';

const router = express.Router();

const PRIZES = {
  1: '特等奖',
  2: '一等奖',
  3: '二等奖',
  4: '三等奖',
  5: '四等奖',
  6: '五等奖'
};

router.get('/lucky-wheel/rigged', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const { used } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (used !== undefined) {
      whereClause += ' AND used = ?';
      params.push(used === 'true' ? 1 : 0);
    }

    const [countResult] = await dbQuery(
      `SELECT COUNT(*) as total FROM lucky_wheel_rigged WHERE ${whereClause}`,
      params
    );

    const rigged = await dbQuery(
      `SELECT id, wallet_address, prize_id, prize_name, created_by, used, created_at, used_at
       FROM lucky_wheel_rigged
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      success: true,
      data: {
        rigged,
        total: countResult?.total || 0,
        page,
        pageSize
      }
    });
  } catch (error) {
    console.error('获取指定中奖列表失败:', error.message);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

router.post('/lucky-wheel/rigged', authMiddleware, async (req, res) => {
  try {
    const { wallet_address, prize_id } = req.body;

    if (!wallet_address || !prize_id) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const prizeName = PRIZES[prize_id];
    if (!prizeName) {
      return res.status(400).json({ success: false, message: '无效的奖品ID' });
    }

    const normalizedAddress = wallet_address.toLowerCase();
    const [existing] = await dbQuery(
      'SELECT id FROM lucky_wheel_rigged WHERE wallet_address = ? AND used = 0',
      [normalizedAddress]
    );

    if (existing) {
      await dbQuery(
        `UPDATE lucky_wheel_rigged
         SET prize_id = ?, prize_name = ?, created_by = ?, created_at = NOW()
         WHERE id = ?`,
        [prize_id, prizeName, req.admin?.username || 'admin', existing.id]
      );
    } else {
      await dbQuery(
        `INSERT INTO lucky_wheel_rigged (wallet_address, prize_id, prize_name, created_by)
         VALUES (?, ?, ?, ?)`,
        [normalizedAddress, prize_id, prizeName, req.admin?.username || 'admin']
      );
    }

    secureLog('设置指定中奖', {
      admin: req.admin?.username,
      wallet: normalizedAddress.slice(0, 10),
      prize: prizeName
    });

    res.json({ success: true, message: `已设置 ${normalizedAddress.slice(0, 10)}... 下次中奖为 ${prizeName}` });
  } catch (error) {
    console.error('设置指定中奖失败:', error.message);
    res.status(500).json({ success: false, message: '设置失败' });
  }
});

router.delete('/lucky-wheel/rigged/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbQuery('DELETE FROM lucky_wheel_rigged WHERE id = ?', [id]);

    if (result.affectedRows > 0) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '记录不存在' });
    }
  } catch (error) {
    console.error('删除指定中奖失败:', error.message);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

export default router;
