const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, remove } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://xoxo-b2c0d-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function deleteMemberByPhone(phone) {
    try {
        console.log(`🔍 Đang tìm nhân sự có SĐT: ${phone}...`);

        // 1. Lấy danh sách nhân sự
        const snapshot = await get(ref(db, 'nhan_su'));
        if (!snapshot.exists()) {
            console.log('⚠️ Không tìm thấy dữ liệu nhân sự nào.');
            process.exit(0);
        }

        const members = snapshot.val();
        let foundId = null;
        let foundName = '';

        // 2. Tìm kiếm
        for (const [id, member] of Object.entries(members)) {
            if (member.phone === phone || member.so_dien_thoai === phone) {
                foundId = id;
                foundName = member.name || member.ho_ten;
                break;
            }
        }

        // 3. Xóa nếu tìm thấy
        if (foundId) {
            console.log(`✅ Đã tìm thấy: ${foundName} (ID: ${foundId})`);
            await remove(ref(db, `nhan_su/${foundId}`));
            console.log(`🗑️ Đã xóa thành công nhân sự ${foundName}!`);
        } else {
            console.log(`❌ Không tìm thấy nhân sự nào với SĐT ${phone}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

// Phone number from user request
const TARGET_PHONE = '0965310233';

deleteMemberByPhone(TARGET_PHONE);
