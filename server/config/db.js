
// config/db.js
import { neon } from '@neondatabase/serverless';
import 'dotenv/config'; // if you haven't already loaded it in server.js

// Optional: fetch polyfill for Node < 18
// import fetch from 'node-fetch';
// const sql = neon(process.env.DATABASE_URL, { fetch });

console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL);

const sql = neon(process.env.DATABASE_URL);

export default sql;
