import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { pool } from './db';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(express.json());

/**
 * 1. WORKER LOCATION UPDATE API ENDPOINT
 * Receives workerId, latitude, and longitude from the worker's mobile app.
 * Updates PostGIS geography column in PostgreSQL.
 */
app.post('/api/worker/location', async (req: Request, res: Response) => {
  const { workerId, latitude, longitude } = req.body;

  if (!workerId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing required fields: workerId, latitude, longitude' });
  }

  try {
    const query = `
      UPDATE worker_profiles
      SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, is_online;
    `;

    const result = await pool.query(query, [longitude, latitude, workerId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    io.to(`worker_${workerId}`).emit('location_updated', { latitude, longitude });

    return res.status(200).json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating worker location:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 2. CUSTOMER SEARCH API ENDPOINT
 * Returns a list of nearby online workers within 5km sorted by distance.
 */
app.get('/api/customer/search', async (req: Request, res: Response) => {
  const { lat, lng, skill, radius } = req.query;

  if (!lat || !lng || !skill) {
    return res.status(400).json({ error: 'Missing required query parameters: lat, lng, skill' });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const searchRadiusMeters = radius ? parseFloat(radius as string) : 5000;

  try {
    const query = `
      SELECT
          wp.id AS worker_id,
          u.full_name,
          u.avatar_url,
          wp.skills,
          wp.rating,
          wp.total_jobs,
          ST_Distance(
              wp.current_location,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_in_meters
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.id
      WHERE
          wp.is_online = TRUE
          AND wp.kyc_status = 'APPROVED'
          AND $3 = ANY(wp.skills)
          AND ST_DWithin(
              wp.current_location,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
              $4
          )
      ORDER BY distance_in_meters ASC
      LIMIT 25;
    `;

    const result = await pool.query(query, [longitude, latitude, skill, searchRadiusMeters]);

    return res.status(200).json({
      success: true,
      count: result.rowCount,
      workers: result.rows,
    });
  } catch (error) {
    console.error('Error searching nearby workers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Marketplace Backend running on port ${PORT}`);
});
