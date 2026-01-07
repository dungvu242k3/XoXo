
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('Starting debug script...');

try {
    // Load env
    const envPath = path.resolve('.env.local');
    console.log('Reading .env from:', envPath);

    if (!fs.existsSync(envPath)) {
        console.error('ERROR: .env.local file not found!');
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key:', supabaseKey ? 'Found' : 'Missing');

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function checkServices() {
        console.log('Querying dich_vu_spa table...');
        const { data, error } = await supabase.from('dich_vu_spa').select('*');

        if (error) {
            console.error('Error fetching services:', error);
            return;
        }

        console.log(`Found ${data.length} services.`);
        if (data.length > 0) {
            console.log('First service sample:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Table appears to be empty. Please seed data.');
        }
    }

    checkServices().catch(err => console.error('Async error:', err));

} catch (err) {
    console.error('Script failure:', err);
}
