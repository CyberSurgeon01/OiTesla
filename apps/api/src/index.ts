import express from 'express';
import cors from 'cors';
import { signup, login, me } from './auth/auth.controller';
import { requireAuth, requireRole } from './auth/auth.middleware';
import { requestRide, updateRideStatus } from './pooling/pooling.controller';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.get('/api/auth/me', requireAuth, me);

// Pooling
app.post('/api/rides', requireAuth, requireRole('PASSENGER'), requestRide);
app.patch('/api/rides/:ride_id/status', requireAuth, updateRideStatus);

app.get('/api/health', (req, res) => {
  res.send('OiTesla API is running!');
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
