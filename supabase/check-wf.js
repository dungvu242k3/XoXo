import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnvConfig() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) return parseEnvFile(envPath);
        const envLocalPath = path.resolve(__dirname, '../.env.local');
        if (fs.existsSync(envLocalPath)) return parseEnvFile(envLocalPath);
        return {};
    } catch (e) { return {}; }
}

function parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) config[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    });
    return config;
}

const env = getEnvConfig();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('No env config'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWorkflow() {
    console.log('Checking WF-001...');
    const { data, error } = await supabase
        .from('quy_trinh')
        .select('*')
        .eq('id', 'WF-001')
        .single();

    if (error) {
        console.error('Error fetching WF-001:', error);
    } else {
        console.log('Found WF-001:', data);
    }

    // Check Stages
    const { data: stages, error: stagesError } = await supabase
        .from('cac_buoc_quy_trinh')
        .select('*')
        .eq('id_quy_trinh', 'WF-001');

    if (stagesError) {
        console.error('Error fetching stages:', stagesError);
    } else {
        console.log(`✅ Found ${stages.length} stages for WF-001`);

        // Check Tasks
        if (stages.length > 0) {
            const stageIds = stages.map(s => s.id);
            const { data: tasks, error: tasksError } = await supabase
                .from('cac_task_quy_trinh')
                .select('*')
                .in('id_buoc_quy_trinh', stageIds)
                .order('thu_tu');

            if (tasksError) {
                console.error('Error fetching tasks:', tasksError);
            } else {
                console.log(`✅ Found ${tasks.length} tasks in total.`);
                tasks.forEach(t => {
                    const stage = stages.find(s => s.id === t.id_buoc_quy_trinh);
                    console.log(`   - [Stage: ${stage?.ten_buoc}] Task: ${t.ten_task} (Order: ${t.thu_tu})`);
                });
            }
        }
    }
}

checkWorkflow();
