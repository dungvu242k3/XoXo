# Migration Guide: Firebase → Supabase

## So sánh cấu trúc

### Firebase Realtime Database (Cũ)
```json
{
  "dich_vu_spa": {
    "SVC-123": {
      "id": "SVC-123",
      "name": "Service Name",
      "categoryPath": ["Level1", "Level2"],
      "workflows": [{"id": "wf-1", "order": 0}]
    }
  }
}
```

### Supabase PostgreSQL (Mới)
```sql
INSERT INTO dich_vu_spa (id, name, category_path, workflows)
VALUES (
  'SVC-123',
  'Service Name',
  '["Level1", "Level2"]'::jsonb,
  '[{"id": "wf-1", "order": 0}]'::jsonb
);
```

## Thay đổi trong Code

### Trước (Firebase):
```typescript
import { ref, set, get, onValue } from 'firebase/database';
import { db, DB_PATHS } from './firebase';

// Read
const snapshot = await get(ref(db, `${DB_PATHS.SERVICES}/${id}`));
const data = snapshot.val();

// Write
await set(ref(db, `${DB_PATHS.SERVICES}/${id}`), serviceData);

// Listen
onValue(ref(db, DB_PATHS.SERVICES), (snapshot) => {
  const data = snapshot.val();
});
```

### Sau (Supabase):
```typescript
import { supabase, DB_TABLES } from './supabase';

// Read
const { data, error } = await supabase
  .from(DB_TABLES.SERVICES)
  .select('*')
  .eq('id', id)
  .single();

// Write
const { error } = await supabase
  .from(DB_TABLES.SERVICES)
  .upsert(serviceData);

// Listen (Realtime)
supabase
  .channel('services')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: DB_TABLES.SERVICES },
    (payload) => {
      console.log('Change:', payload);
    }
  )
  .subscribe();
```

## JSONB Queries

### Query với JSONB:
```typescript
// Tìm service có categoryPath chứa "TÚI QUAI"
const { data } = await supabase
  .from(DB_TABLES.SERVICES)
  .select('*')
  .contains('category_path', ['TÚI QUAI']);

// Tìm workflow có stage cụ thể
const { data } = await supabase
  .from(DB_TABLES.WORKFLOWS)
  .select('*')
  .contains('stages', [{ name: 'Vệ sinh' }]);
```

## Checklist Migration

- [ ] Tạo Supabase project
- [ ] Chạy schema.sql
- [ ] Cấu hình .env với Supabase credentials
- [ ] Cài đặt @supabase/supabase-js
- [ ] Cập nhật imports từ firebase.ts sang supabase.ts
- [ ] Thay thế tất cả Firebase calls bằng Supabase calls
- [ ] Test tất cả CRUD operations
- [ ] Setup Realtime subscriptions
- [ ] Migrate data từ Firebase (nếu có)
- [ ] Update documentation

