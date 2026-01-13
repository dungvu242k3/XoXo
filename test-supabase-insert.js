import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edwwzlpmgqqikhtxbzwo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd3d6bHBtZ3FxaWtodHhiendvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTI1NDgsImV4cCI6MjA4MzI4ODU0OH0.Q0S0iGTnJEQ1tYpw68B0Rzn9K6g5l-DcuHVZjToR9sQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('🔍 Đang kiểm tra kết nối Supabase...');
  
  // Test 1: Kiểm tra bảng có tồn tại không
  console.log('\n1. Kiểm tra bảng dich_vu_spa...');
  const { data: checkData, error: checkError } = await supabase
    .from('dich_vu_spa')
    .select('count')
    .limit(1);
  
  if (checkError) {
    console.error('❌ Lỗi khi kiểm tra bảng:', checkError);
    console.error('   Message:', checkError.message);
    console.error('   Details:', checkError.details);
    console.error('   Hint:', checkError.hint);
    return;
  }
  console.log('✅ Bảng tồn tại!');
  
  // Test 2: Đếm số lượng records hiện có
  console.log('\n2. Đếm số lượng dịch vụ hiện có...');
  const { count, error: countError } = await supabase
    .from('dich_vu_spa')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Lỗi khi đếm:', countError);
  } else {
    console.log(`✅ Hiện có ${count} dịch vụ trong bảng`);
  }
  
  // Test 3: Thử insert một record test
  console.log('\n3. Thử insert một dịch vụ test...');
  const testService = {
    id: `TEST-${Date.now()}`,
    ten_dich_vu: 'Dịch vụ test',
    danh_muc: 'Test',
    duong_dan_danh_muc: ['Test'],
    gia_niem_yet: 100000,
    mo_ta: 'Đây là dịch vụ test',
    anh_dich_vu: '',
    id_quy_trinh: null,
    cac_buoc_quy_trinh: []
  };
  
  console.log('   Dữ liệu sẽ insert:', JSON.stringify(testService, null, 2));
  
  const { data: insertData, error: insertError } = await supabase
    .from('dich_vu_spa')
    .insert(testService)
    .select();
  
  if (insertError) {
    console.error('❌ Lỗi khi insert:', insertError);
    console.error('   Message:', insertError.message);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
    console.error('   Code:', insertError.code);
  } else {
    console.log('✅ Insert thành công!');
    console.log('   Data trả về:', insertData);
    
    // Xóa record test
    console.log('\n4. Xóa record test...');
    const { error: deleteError } = await supabase
      .from('dich_vu_spa')
      .delete()
      .eq('id', testService.id);
    
    if (deleteError) {
      console.error('⚠️  Lỗi khi xóa test record:', deleteError);
    } else {
      console.log('✅ Đã xóa record test');
    }
  }
  
  // Test 4: Lấy tất cả records
  console.log('\n5. Lấy tất cả dịch vụ...');
  const { data: allData, error: allError } = await supabase
    .from('dich_vu_spa')
    .select('*')
    .order('ngay_tao', { ascending: false })
    .limit(5);
  
  if (allError) {
    console.error('❌ Lỗi khi lấy data:', allError);
  } else {
    console.log(`✅ Lấy được ${allData?.length || 0} dịch vụ:`);
    allData?.forEach((svc, idx) => {
      console.log(`   ${idx + 1}. ${svc.ten_dich_vu} - ${svc.gia_niem_yet}₫`);
    });
  }
}

testInsert().catch(console.error);

