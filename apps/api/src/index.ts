import express from 'express';
import cors from 'cors';
import { signup, login, me } from './auth/auth.controller';
import { requireAuth } from './auth/auth.middleware';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.get('/api/auth/me', requireAuth, me);

app.get('/api/health', (req, res) => {
  res.send('OiTesla API is running!');
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
