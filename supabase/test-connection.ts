// File test kết nối Supabase
// Chạy: npx tsx supabase/test-connection.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edwwzlpmgqqikhtxbzwo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd3d6bHBtZ3FxaWtodHhiendvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTI1NDgsImV4cCI6MjA4MzI4ODU0OH0.Q0S0iGTnJEQ1tYpw68B0Rzn9K6g5l-DcuHVZjToR9sQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔌 Đang kiểm tra kết nối Supabase...\n');

  try {
    // Test 1: Kiểm tra kết nối cơ bản
    console.log('1. Kiểm tra kết nối...');
    const { data, error } = await supabase.from('khach_hang').select('count').limit(1);
    
    if (error) {
      console.error('❌ Lỗi kết nối:', error.message);
      console.log('\n💡 Lưu ý: Có thể bảng chưa được tạo. Vui lòng chạy schema.sql trước.');
      return;
    }

    console.log('✅ Kết nối thành công!\n');

    // Test 2: Kiểm tra các bảng
    console.log('2. Kiểm tra các bảng...');
    const tables = [
      'khach_hang',
      'don_hang',
      'hang_muc_dich_vu',
      'kho_vat_tu',
      'dich_vu_spa',
      'san_pham_ban_le',
      'nhan_su',
      'quy_trinh',
      'thong_bao'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK`);
      }
    }

    console.log('\n✅ Tất cả các bảng đã sẵn sàng!');
    console.log('\n📝 Bước tiếp theo:');
    console.log('   1. Import dữ liệu mẫu từ supabase/data-examples.json');
    console.log('   2. Cập nhật code để sử dụng Supabase thay vì Firebase');

  } catch (err: any) {
    console.error('❌ Lỗi:', err.message);
  }
}

testConnection();

