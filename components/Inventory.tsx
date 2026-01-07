import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Search, AlertTriangle, Plus, Filter, ArrowDownUp, Image as ImageIcon, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { useAppStore } from '../context';
import { TableFilter, FilterState, filterByDateRange } from './TableFilter';

// Action Menu Component
const ActionMenu: React.FC<{ 
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  itemName: string;
}> = ({ onView, onEdit, onDelete, itemName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
      >
        <MoreHorizontal size={20} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
          >
            <Eye size={16} />
            Xem
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
          >
            <Edit size={16} />
            Sửa
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Bạn có chắc chắn muốn xóa "${itemName}"?`)) {
                onDelete();
              }
              setIsOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Xóa
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to generate SKU automatically
const generateSKU = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // Generate random alphanumeric string (6 characters)
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `XOXO_${year}_${month}_${randomStr}`;
};

export const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppStore(); 
  const [filter, setFilter] = useState<FilterState>({ locNhanh: 'all', thoiGian: { tuNgay: null, denNgay: null } });
  const [searchText, setSearchText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    category: 'Hoá chất' as 'Hoá chất' | 'Phụ kiện' | 'Dụng cụ' | 'Vật tư tiêu hao',
    quantity: '',
    unit: '',
    minThreshold: '',
    importPrice: '',
    supplier: '',
    image: ''
  });

  // Lọc dữ liệu theo thời gian và tìm kiếm
  const filteredInventory = useMemo(() => {
    let result = filterByDateRange(inventory, filter, 'lastImport');
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(search) ||
        i.sku.toLowerCase().includes(search) ||
        i.supplier.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [inventory, filter, searchText]);

  const handleAddItem = async () => {
    // Auto-generate SKU if not set
    const finalSKU = newItem.sku || generateSKU();
    
    if (!finalSKU || !newItem.name || !newItem.quantity || !newItem.unit || !newItem.importPrice) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    try {
      // Không tạo ID - để database tự tạo
      const newInventoryItem: any = {
        sku: finalSKU.toUpperCase(),
        name: newItem.name,
        category: newItem.category,
        quantity: parseFloat(newItem.quantity),
        unit: newItem.unit,
        minThreshold: parseFloat(newItem.minThreshold) || 0,
        importPrice: parseInt(newItem.importPrice),
        supplier: newItem.supplier || '',
        lastImport: new Date().toLocaleDateString('vi-VN')
      };
      
      // Only add image if it exists and is not empty
      if (newItem.image && newItem.image.trim() !== '') {
        newInventoryItem.image = newItem.image;
      }
      
      await addInventoryItem(newInventoryItem);
      
      setNewItem({
        sku: generateSKU(), // Auto-generate new SKU for next item
        name: '',
        category: 'Hoá chất',
        quantity: '',
        unit: '',
        minThreshold: '',
        importPrice: '',
        supplier: '',
        image: ''
      });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Lỗi khi thêm vật tư:', error);
      alert('Lỗi khi thêm vật tư: ' + (error?.message || String(error)));
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.sku || !editingItem.name || !editingItem.quantity || !editingItem.unit || !editingItem.importPrice) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    try {
      const updatedItem: any = {
        ...editingItem,
        sku: editingItem.sku.toUpperCase(),
        quantity: parseFloat(editingItem.quantity),
        minThreshold: parseFloat(editingItem.minThreshold) || 0,
        importPrice: parseInt(editingItem.importPrice)
      };
      
      // Only add image if it exists and is not empty, otherwise remove it
      if (editingItem.image && editingItem.image.trim() !== '') {
        updatedItem.image = editingItem.image;
      } else {
        // Remove image property if empty
        delete updatedItem.image;
      }
      
      await updateInventoryItem(editingItem.id, updatedItem);
      
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error('Lỗi khi cập nhật vật tư:', error);
      alert('Lỗi khi cập nhật vật tư: ' + (error?.message || String(error)));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteInventoryItem(itemId);
    } catch (error: any) {
      console.error('Lỗi khi xóa vật tư:', error);
      alert('Lỗi khi xóa vật tư: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal Thêm Vật Tư */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Vật Tư Mới</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Mã SKU <span className="text-red-500">*</span> <span className="text-xs text-slate-500">(Tự động tạo)</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.sku || generateSKU()}
                    readOnly
                    className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-slate-300 cursor-not-allowed opacity-75 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tên vật tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="VD: Xi Saphir Medaille d'Or"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Danh mục</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value as typeof newItem.category})}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  >
                    <option value="Hoá chất">Hoá chất</option>
                    <option value="Phụ kiện">Phụ kiện</option>
                    <option value="Dụng cụ">Dụng cụ</option>
                    <option value="Vật tư tiêu hao">Vật tư tiêu hao</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Đơn vị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    placeholder="VD: Hộp, Chai, Cái..."
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    placeholder="15"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Ngưỡng tối thiểu
                  </label>
                  <input
                    type="number"
                    value={newItem.minThreshold}
                    onChange={(e) => setNewItem({...newItem, minThreshold: e.target.value})}
                    placeholder="5"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Giá nhập (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newItem.importPrice}
                    onChange={(e) => setNewItem({...newItem, importPrice: e.target.value})}
                    placeholder="350000"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nhà cung cấp</label>
                <input
                  type="text"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                  placeholder="VD: Saphir Vietnam"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Hình ảnh</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith('image/')) {
                        alert('Vui lòng chọn file ảnh!');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        setNewItem({...newItem, image: base64});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                />
                {newItem.image && (
                  <div className="mt-2">
                    <img src={newItem.image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-neutral-700" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddItem}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Thêm Vật Tư
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Vật Tư */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Sửa Vật Tư</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Mã SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({...editingItem, sku: e.target.value.toUpperCase()})}
                    placeholder="VD: CHEM-SAP-01"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tên vật tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    placeholder="VD: Xi Saphir Medaille d'Or"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Danh mục</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value as typeof editingItem.category})}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  >
                    <option value="Hoá chất">Hoá chất</option>
                    <option value="Phụ kiện">Phụ kiện</option>
                    <option value="Dụng cụ">Dụng cụ</option>
                    <option value="Vật tư tiêu hao">Vật tư tiêu hao</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Đơn vị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                    placeholder="VD: Hộp, Chai, Cái..."
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value})}
                    placeholder="15"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Ngưỡng tối thiểu
                  </label>
                  <input
                    type="number"
                    value={editingItem.minThreshold}
                    onChange={(e) => setEditingItem({...editingItem, minThreshold: e.target.value})}
                    placeholder="5"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Giá nhập (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editingItem.importPrice}
                    onChange={(e) => setEditingItem({...editingItem, importPrice: e.target.value})}
                    placeholder="350000"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nhà cung cấp</label>
                <input
                  type="text"
                  value={editingItem.supplier}
                  onChange={(e) => setEditingItem({...editingItem, supplier: e.target.value})}
                  placeholder="VD: Saphir Vietnam"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Hình ảnh</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith('image/')) {
                        alert('Vui lòng chọn file ảnh!');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        setEditingItem({...editingItem, image: base64});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                />
                {editingItem.image && (
                  <div className="mt-2">
                    <img src={editingItem.image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-neutral-700" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateItem}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Kho Vận</h1>
          <p className="text-slate-500 mt-1">Theo dõi nguyên vật liệu, hoá chất và phụ tùng.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => alert('Chức năng xuất/nhập kho đang được phát triển')}
             className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 hover:text-white transition-colors"
           >
             <ArrowDownUp size={18} />
             <span>Xuất/Nhập</span>
           </button>
           <button 
             onClick={() => {
               setNewItem({
                 ...newItem,
                 sku: generateSKU() // Auto-generate SKU when opening modal
               });
               setShowAddModal(true);
             }}
             className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
           >
             <Plus size={18} />
             <span>Thêm Mới</span>
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 group">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg border border-blue-900/30">
                <Package size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Tổng mặt hàng</p>
                <h3 className="text-2xl font-bold text-slate-100">{inventory.length}</h3>
              </div>
           </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 group">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-red-900/20 text-red-500 rounded-lg border border-red-900/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Cảnh báo sắp hết</p>
                <h3 className="text-2xl font-bold text-slate-100">
                  {inventory.filter(i => i.quantity <= i.minThreshold).length.toLocaleString('vi-VN')}
                </h3>
              </div>
           </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 group">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-gold-900/20 text-gold-500 rounded-lg border border-gold-900/30">
                <Search size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Giá trị tồn kho</p>
                <h3 className="text-2xl font-bold text-slate-100">
                  {(inventory.reduce((acc, i) => acc + (i.quantity * i.importPrice), 0)).toLocaleString()} ₫
                </h3>
              </div>
           </div>
        </div>
      </div>

      {/* Inventory List */}
      <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row gap-4">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã SKU..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <TableFilter onFilterChange={setFilter} />
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {filteredInventory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Không tìm thấy vật tư nào phù hợp với bộ lọc
            </div>
          ) : filteredInventory.map((item) => (
            <div key={item.id} className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex gap-6 items-center hover:border-gold-900/30 transition-all">
              <div className="w-24 h-24 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100">{item.name}</h3>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="font-mono text-slate-600 text-xs">SKU: {item.sku}</span>
                      <span className="text-slate-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">{item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.quantity <= item.minThreshold ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-500 border border-red-900/30">
                        <AlertTriangle size={12} /> Sắp hết
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/20 text-emerald-500 border border-emerald-900/30">
                        Sẵn sàng
                      </span>
                    )}
                    <ActionMenu
                      itemName={item.name}
                      onView={() => alert(`Xem chi tiết vật tư: ${item.name}\n\nSKU: ${item.sku}\nDanh mục: ${item.category}\nTồn kho: ${item.quantity.toLocaleString('vi-VN')} ${item.unit}\nNgưỡng tối thiểu: ${item.minThreshold.toLocaleString('vi-VN')} ${item.unit}\nGiá nhập: ${item.importPrice.toLocaleString('vi-VN')} ₫\nNhà cung cấp: ${item.supplier || 'Chưa có'}\nLần nhập cuối: ${item.lastImport || 'Chưa có'}`)}
                      onEdit={() => {
                        setEditingItem({
                          id: item.id,
                          sku: item.sku,
                          name: item.name,
                          category: item.category,
                          quantity: item.quantity.toString(),
                          unit: item.unit,
                          minThreshold: item.minThreshold.toString(),
                          importPrice: item.importPrice.toString(),
                          supplier: item.supplier || '',
                          image: item.image || '',
                          lastImport: item.lastImport || ''
                        });
                        setShowEditModal(true);
                      }}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-semibold">Tồn kho:</span>
                      <span className="ml-2 font-bold text-gold-500">
                        {Number.isInteger(item.quantity) ? item.quantity.toLocaleString('vi-VN') : item.quantity.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {item.unit}
                      </span>
                    </div>
                    {item.supplier && (
                      <div>
                        <span className="text-xs text-slate-500">NCC:</span>
                        <span className="ml-2 text-slate-300">{item.supplier}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-400">
                    Giá nhập: <span className="font-medium text-slate-300">{item.importPrice.toLocaleString()} ₫</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};