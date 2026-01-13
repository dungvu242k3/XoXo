import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, ShoppingBag, Package, DollarSign, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { MOCK_PRODUCTS } from '../constants';
import { TableFilter, FilterState } from './TableFilter';
import { useAppStore } from '../context';
import { Product } from '../types';
import { supabase, DB_PATHS } from '../supabase';

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

export const Products: React.FC = () => {
  const { updateProduct, deleteProduct, addProduct } = useAppStore();
  const [filter, setFilter] = useState<FilterState>({ locNhanh: 'all', thoiGian: { tuNgay: null, denNgay: null } });
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    image: '',
    desc: ''
  });

  // Load products from Supabase
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from(DB_PATHS.PRODUCTS)
          .select('*');
        
        // Bắt đầu với MOCK data
        const mergedProducts = new Map<string, Product>();
        
        // Thêm tất cả MOCK products trước
        MOCK_PRODUCTS.forEach(prod => {
          mergedProducts.set(prod.id, { ...prod });
        });
        
        // Merge với data từ Supabase (ưu tiên Supabase nếu trùng ID)
        if (!error && data) {
          data.forEach(prod => {
            const productId = prod.id || '';
            mergedProducts.set(productId, {
              id: productId,
              name: prod.name || '',
              category: prod.category || '',
              price: prod.price || 0,
              stock: prod.stock || 0,
              image: prod.image || '',
              desc: prod.desc || undefined
            } as Product);
          });
        }
        
        setProducts(Array.from(mergedProducts.values()));
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();

    // Listen for real-time updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: DB_PATHS.PRODUCTS,
        },
        async () => {
          // Reload products on change
          const { data } = await supabase.from(DB_PATHS.PRODUCTS).select('*');
          if (data) {
            const mergedProducts = new Map<string, Product>();
            MOCK_PRODUCTS.forEach(prod => {
              mergedProducts.set(prod.id, { ...prod });
            });
            data.forEach(prod => {
              const productId = prod.id || '';
              mergedProducts.set(productId, {
                id: productId,
                name: prod.name || '',
                category: prod.category || '',
                price: prod.price || 0,
                stock: prod.stock || 0,
                image: prod.image || '',
                desc: prod.desc || undefined
              } as Product);
            });
            setProducts(Array.from(mergedProducts.values()));
          } else {
            setProducts(MOCK_PRODUCTS);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Lấy danh sách danh mục unique
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return ['all', ...cats];
  }, [products]);

  // Lọc sản phẩm theo tìm kiếm và danh mục
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(search) ||
        (p.desc && p.desc.toLowerCase().includes(search))
      );
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }
    
    return result;
  }, [products, searchText, categoryFilter]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.category || !newProduct.price || !newProduct.stock) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    try {
      // Không tạo ID - để database tự tạo
      const productData: Product = {
        id: '', // Tạm thời để trống, sẽ được cập nhật sau khi tạo
        name: newProduct.name,
        category: newProduct.category,
        price: parseInt(newProduct.price),
        stock: parseInt(newProduct.stock),
        image: newProduct.image || '',
        desc: newProduct.desc || undefined
      };
      
      await addProduct(productData);
      
      setNewProduct({
        name: '',
        category: '',
        price: '',
        stock: '',
        image: '',
        desc: ''
      });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Lỗi khi thêm sản phẩm:', error);
      alert('Lỗi khi thêm sản phẩm: ' + (error?.message || String(error)));
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.category) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    
    const price = typeof editingProduct.price === 'string' ? parseInt(editingProduct.price) : editingProduct.price;
    const stock = typeof editingProduct.stock === 'string' ? parseInt(editingProduct.stock) : editingProduct.stock;
    
    if (!price || price <= 0 || !stock || stock < 0) {
      alert('Giá và tồn kho phải là số hợp lệ!');
      return;
    }
    
    try {
      const updatedProduct: Product = {
        ...editingProduct,
        price,
        stock,
        desc: editingProduct.desc || undefined,
        image: editingProduct.image || ''
      };
      
      await updateProduct(editingProduct.id, updatedProduct);
      setShowEditModal(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Lỗi khi cập nhật sản phẩm:', error);
      alert('Lỗi khi cập nhật sản phẩm: ' + (error?.message || String(error)));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
    } catch (error: any) {
      console.error('Lỗi khi xóa sản phẩm:', error);
      alert('Lỗi khi xóa sản phẩm: ' + (error?.message || String(error)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal Thêm Sản Phẩm */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Sản Phẩm Mới</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  placeholder="VD: Bộ Vệ Sinh Giày Cao Cấp"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    placeholder="VD: Vệ Sinh Giày"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Giá bán (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="850000"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tồn kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                    placeholder="24"
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
                          setNewProduct({...newProduct, image: base64});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                  />
                  {newProduct.image && (
                    <div className="mt-2">
                      <img src={newProduct.image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-neutral-700" />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                <textarea
                  value={newProduct.desc}
                  onChange={(e) => setNewProduct({...newProduct, desc: e.target.value})}
                  placeholder="Mô tả sản phẩm..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                />
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
                onClick={handleAddProduct}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Thêm Sản Phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Sản Phẩm */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Sửa Sản Phẩm</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  placeholder="VD: Bộ Vệ Sinh Giày Cao Cấp"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    placeholder="VD: Vệ Sinh Giày"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Giá bán (₫) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={typeof editingProduct.price === 'number' ? editingProduct.price : editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                    placeholder="850000"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tồn kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={typeof editingProduct.stock === 'number' ? editingProduct.stock : editingProduct.stock}
                    onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                    placeholder="24"
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
                          setEditingProduct({...editingProduct, image: base64});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                  />
                  {editingProduct.image && (
                    <div className="mt-2">
                      <img src={editingProduct.image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-neutral-700" />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                <textarea
                  value={editingProduct.desc || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, desc: e.target.value})}
                  placeholder="Mô tả sản phẩm..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateProduct}
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
          <h1 className="text-2xl font-serif font-bold text-slate-100">Sản Phẩm Bán Kèm</h1>
          <p className="text-slate-500 mt-1">Quản lý sản phẩm vật lý, combo chăm sóc và phụ kiện.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Thêm Sản Phẩm</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm sản phẩm..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-600"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <TableFilter onFilterChange={setFilter} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 text-sm focus:ring-1 focus:ring-gold-500 outline-none"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-neutral-900 p-8 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 text-center text-slate-500">
            Không tìm thấy sản phẩm nào phù hợp với bộ lọc
          </div>
        ) : filteredProducts.map((product) => (
          <div key={product.id} className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex gap-6 items-center hover:border-gold-900/30 transition-all">
            <div className="w-24 h-24 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700 relative">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover opacity-80" 
              />
              <div className="absolute top-1 right-1 bg-neutral-950/90 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-gold-500 shadow-sm border border-neutral-800">
                {product.stock.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">{product.name}</h3>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span className="text-slate-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">{product.category}</span>
                    <span className="font-mono text-slate-600 text-xs">#{product.id}</span>
                  </div>
                </div>
                <ActionMenu
                  itemName={product.name}
                  onView={() => alert(`Xem chi tiết sản phẩm: ${product.name}\n\nID: ${product.id}\nDanh mục: ${product.category}\nGiá: ${product.price.toLocaleString('vi-VN')} ₫\nTồn kho: ${product.stock.toLocaleString('vi-VN')}\nMô tả: ${product.desc || 'Không có'}`)}
                  onEdit={() => {
                    setEditingProduct({
                      ...product,
                      price: String(product.price),
                      stock: String(product.stock)
                    } as any);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeleteProduct(product.id)}
                />
              </div>
              <p className="text-slate-500 text-sm mt-2 line-clamp-1">{product.desc}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Tồn kho:</span>
                  <span className="text-xs font-medium text-slate-300">{product.stock.toLocaleString('vi-VN')} sản phẩm</span>
                </div>
                <div className="font-bold text-lg text-gold-500">
                  {product.price.toLocaleString('vi-VN')} ₫
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Placeholder */}
        <div 
          onClick={() => setShowAddModal(true)}
          className="bg-neutral-900/50 rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center p-4 text-slate-600 hover:border-gold-600/50 hover:text-gold-500 hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <Plus size={20} className="mr-2" />
          <span className="font-medium">Thêm sản phẩm mới</span>
        </div>
      </div>
    </div>
  );
};