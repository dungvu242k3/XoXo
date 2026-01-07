import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually since we don't want to enforce dotenv dependency
function getEnvConfig() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (!fs.existsSync(envPath)) {
            // Try local
            const envLocalPath = path.resolve(__dirname, '../.env.local');
            if (fs.existsSync(envLocalPath)) {
                return parseEnvFile(envLocalPath);
            }
            return {};
        }
        return parseEnvFile(envPath);
    } catch (e) {
        console.warn('⚠️  Could not read .env file:', e.message);
        return {};
    }
}

function parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            config[key] = value;
        }
    });
    return config;
}

const env = getEnvConfig();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Starting database seed...');
    console.log('   Target:', supabaseUrl);

    try {
        // 1. Read JSON data
        const jsonPath = path.join(__dirname, 'data-examples.json');
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const data = JSON.parse(rawData);

        // 2. Clean existing data (Optional: Be careful!)
        // For a fresh seed, we might want to truncate, but CASCADE deletes should handle it if we delete parent tables
        // console.log('🧹 Cleaning old data...');
        // await supabase.from('don_hang').delete().neq('id', '0');
        // await supabase.from('khach_hang').delete().neq('id', '0');
        // await supabase.from('kho_vat_tu').delete().neq('id', '0');
        // ... better to just upsert

        // 3. Helper to insert/upsert
        const upsertTable = async (table, rows) => {
            if (!rows || Object.keys(rows).length === 0) return;
            const rowsArray = Object.values(rows); // Convert object to array

            console.log(`   Populating ${table} (${rowsArray.length} records)...`);

            const { error } = await supabase.from(table).upsert(rowsArray, { onConflict: 'id' });
            if (error) {
                console.error(`❌ Error inserting into ${table}:`, error.message);
                throw error;
            }
        };

        // 4. Insert Independent Tables
        await upsertTable('nhan_su', data.nhan_su);
        await upsertTable('kho_vat_tu', data.kho_vat_tu);
        await upsertTable('san_pham_ban_le', data.san_pham_ban_le);
        await upsertTable('khach_hang', data.khach_hang);

        // 5. Insert Workflows (Complex hierarchy)
        console.log('   Populating Workflow system...');
        const workflows = Object.values(data.quy_trinh || {});

        for (const wf of workflows) {
            // 5a. Insert Workflow
            const { cac_buoc, ...wfData } = wf;
            const { error: wfError } = await supabase.from('quy_trinh').upsert(wfData);
            if (wfError) console.error('Error inserting workflow:', wfError);

            // 5b. Insert Stages
            if (cac_buoc && cac_buoc.length > 0) {
                for (const stage of cac_buoc) {
                    const { todos, ...stageData } = stage;
                    // Map snake_case for DB
                    const dbStage = {
                        id: stageData.id,
                        id_quy_trinh: wf.id,
                        ten_buoc: stageData.name,
                        thu_tu: stageData.order,
                        mau_sac: stageData.color,
                        chi_tiet: stageData.details,
                        tieu_chuan: stageData.standards,
                        cong_viec: todos // Keep as JSONB for backward compat or if used
                    };

                    const { error: stageError } = await supabase.from('cac_buoc_quy_trinh').upsert(dbStage);
                    if (stageError) console.error('Error inserting stage:', stageError);

                    // 5c. Insert Tasks (cac_task_quy_trinh)
                    // DELETE old tasks first to ensure clean state (fix for user reported wrong data)
                    const { error: deleteError } = await supabase
                        .from('cac_task_quy_trinh')
                        .delete()
                        .eq('id_buoc_quy_trinh', stageData.id);

                    if (deleteError) console.error('Error deleting old tasks:', deleteError);

                    if (todos && todos.length > 0) {
                        const dbTasks = todos.map(todo => ({
                            id: todo.id,
                            id_buoc_quy_trinh: stageData.id,
                            ten_task: todo.title,
                            mo_ta: todo.description,
                            thu_tu: todo.order,
                            da_hoan_thanh: todo.completed
                        }));

                        const { error: taskError } = await supabase.from('cac_task_quy_trinh').upsert(dbTasks);
                        if (taskError) console.error('Error inserting tasks:', taskError);
                    }
                }
            }
        }

        // 6. Insert Services (Map category path)
        if (data.dich_vu_spa) {
            console.log('   Populating dich_vu_spa...');
            const services = Object.values(data.dich_vu_spa).map(svc => {
                const { duong_dan_danh_muc, ...rest } = svc;
                return {
                    ...rest,
                    cap_1: duong_dan_danh_muc?.[0] || null,
                    cap_2: duong_dan_danh_muc?.[1] || null,
                    cap_3: duong_dan_danh_muc?.[2] || null,
                    cap_4: duong_dan_danh_muc?.[3] || null,
                };
            });
            const { error: svcError } = await supabase.from('dich_vu_spa').upsert(services);
            if (svcError) console.error('Error services:', svcError.message);
        }

        // 7. Insert Orders
        await upsertTable('don_hang', data.don_hang);

        // 8. Insert Order Items (Hang Muc)
        // Need to handle maps if any nested, but data-examples seems flat for this table
        await upsertTable('hang_muc_dich_vu', data.hang_muc_dich_vu);

        // 9. Notifications
        await upsertTable('thong_bao', data.thong_bao);

        console.log('\n✅ Database seeded successfully!');

    } catch (err) {
        console.error('❌ Failed to seed database:', err);
        process.exit(1);
    }
}

seed();
