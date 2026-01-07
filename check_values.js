
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env explicitly since we are running as a standalone node script
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkValues() {
    console.log('Querying distinct phong_ban from nhan_su table...');

    // Try to fetch all members to deduce distinct values
    const { data, error } = await supabase
        .from('nhan_su')
        .select('phong_ban');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No members found. Cannot deduce constraints from data.');
        return;
    }

    const distinctDepartments = [...new Set(data.map(m => m.phong_ban))];
    console.log('Found distinct departments:', distinctDepartments);

    // If we can't get check constraints directly via JS easily, 
    // looking at current data is the best proxy.
    // HOWEVER, if the table is empty or sparsely populated, we might miss values.
    // But if the user says "old code worked", there must be data.
    // Wait, if this is a new project, maybe there is NO data.
    // But "Add Employee" error suggests we are failing to add data.
    // Let's assume there is at least some data or we can try to "test" inserts?
    // No, testing inserts blindly is spammy.
}

checkValues();
