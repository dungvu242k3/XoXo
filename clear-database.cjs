const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://xoxo-b2c0d-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function clearDatabase() {
    try {
        console.log('🚀 Bắt đầu xóa dữ liệu trên Firebase...');

        // Set root to null to delete everything
        await set(ref(db), null);

        console.log('✅ Đã xóa toàn bộ dữ liệu thành công!');
        console.log('🔗 Kiểm tra tại: https://xoxo-b2c0d-default-rtdb.asia-southeast1.firebasedatabase.app/');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi xóa dữ liệu:', error);
        process.exit(1);
    }
}

clearDatabase();
