import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = 3001;

app.use(express.json());

// Хранилище в памяти (для разработки)
const challenges = new Map(); // challenge -> expires
const credentials = new Map(); // credentialId -> publicKey

// Генерация challenge
app.get('/api/keys/challenge', (req, res) => {
  const challenge = crypto.randomBytes(32).toString('hex');
  challenges.set(challenge, Date.now() + 5 * 60 * 1000); // 5 минут
  console.log(`✅ Challenge generated: ${challenge.substring(0, 10)}...`);
  res.json({ challenge });
});

// Получение публичного ключа
app.get('/api/keys/:credentialId', (req, res) => {
  const publicKey = credentials.get(req.params.credentialId);
  console.log(`📢 Request for credential: ${req.params.credentialId.substring(0, 10)}...`);
  
  if (!publicKey) {
    console.log('❌ Credential not found');
    return res.status(404).json({ error: 'Credential not found' });
  }
  
  console.log('✅ Credential found');
  res.json({ publicKey });
});

// Сохранение нового ключа
app.post('/api/keys/:credentialId', (req, res) => {
  const { credentialId } = req.params;
  const { publicKey, challenge } = req.body;
  
  console.log(`📝 Saving credential: ${credentialId.substring(0, 10)}...`);
  
  // Проверяем challenge
  const expires = challenges.get(challenge);
  if (!expires || expires < Date.now()) {
    console.log('❌ Invalid or expired challenge');
    return res.status(400).json({ error: 'Invalid or expired challenge' });
  }
  
  // Сохраняем ключ
  credentials.set(credentialId, publicKey);
  challenges.delete(challenge);
  
  console.log('✅ Credential saved successfully');
  console.log(`📊 Total credentials: ${credentials.size}`);
  
  res.json({ success: true });
});

// Статус сервера
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    credentials: credentials.size,
    activeChallenges: challenges.size,
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log('\n🚀 ==================================');
  console.log(`✅ Key Manager server running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/keys/challenge`);
  console.log(`   GET  http://localhost:${PORT}/api/keys/:credentialId`);
  console.log(`   POST http://localhost:${PORT}/api/keys/:credentialId`);
  console.log(`   GET  http://localhost:${PORT}/api/status`);
  console.log('=================================\n');
});