// 31번 시나리오용 가상의 서버 코드입니다. 보안 문제를 일부러 넣었습니다(정답은 테스트_시나리오.md 31번).
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const pool = new Pool({
  connectionString: 'postgres://admin:SuperSecret123@db.example.com:5432/walkapp',
});
const PAYMENT_SECRET_KEY = 'sk_live_51Hxxxxxxxxxxxxxxxxxxxx';

// 보호자의 예약 목록
app.get('/api/bookings', async (req, res) => {
  const ownerId = req.query.ownerId;
  const result = await pool.query(`SELECT * FROM bookings WHERE owner_id = '${ownerId}'`);
  res.json(result.rows);
});

// 결제 승인
app.post('/api/pay', async (req, res) => {
  const { bookingId, amount } = req.body;
  try {
    await chargeCard(PAYMENT_SECRET_KEY, bookingId, amount);
    await pool.query('UPDATE bookings SET paid = true WHERE id = $1', [bookingId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

async function chargeCard(key, bookingId, amount) {
  // 결제대행사 API 호출 (생략)
}

app.listen(3000);
