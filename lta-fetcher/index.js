require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LTA_API_URL = 'https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents';

async function fetchAndStoreIncidents() {
  try {
    console.log(`[${new Date().toISOString()}] Fetching traffic incidents...`);

    const { data } = await axios.get(LTA_API_URL, {
      headers: { AccountKey: process.env.LTA_API_KEY, accept: 'application/json' },
    });

    if (!data || !data.value || data.value.length === 0) {
      console.log('No active incidents found.');
      return;
    }

    const now = new Date().toISOString();
    const incidents = data.value.map((incident) => ({
      type: incident.Type,
      latitude: incident.Latitude,
      longitude: incident.Longitude,
      message: incident.Message,
      last_seen_at: now,
    }));

    const { error } = await supabase
      .from('traffic_incidents')
      .upsert(incidents, { onConflict: 'message' });

    if (error) throw error;

    console.log(`[${new Date().toISOString()}] Processed ${incidents.length} incidents.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    if (err.cause) console.error('  Cause:', err.cause);
  }
}

console.log('LTA Traffic Incident Fetcher started. Running every 1 minute...');
fetchAndStoreIncidents();
cron.schedule('* * * * *', fetchAndStoreIncidents);
