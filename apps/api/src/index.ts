import express from 'express';
import cors from 'cors';
import { signup, login, me } from './auth/auth.controller';
import { requireAuth, requireRole } from './auth/auth.middleware';
import { requestRide, updateRideStatus, getMyActiveRide, getMyHistory } from './pooling/pooling.controller';
import { updateStatus, getActivePools, transitionPool, getHistory } from './driver/driver.controller';

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
app.get('/api/passenger/rides/active', requireAuth, requireRole('PASSENGER'), getMyActiveRide);
app.get('/api/passenger/rides/history', requireAuth, requireRole('PASSENGER'), getMyHistory);

// Driver Flow
app.patch('/api/driver/status', requireAuth, requireRole('DRIVER'), updateStatus);
app.get('/api/driver/pools', requireAuth, requireRole('DRIVER'), getActivePools);
app.patch('/api/driver/pools/:pool_id/status', requireAuth, requireRole('DRIVER'), transitionPool);
app.get('/api/driver/history', requireAuth, requireRole('DRIVER'), getHistory);

app.get('/api/health', (req, res) => {
  res.send('OiTesla API is running!');
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
