import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Users, Search, Plus, Phone, Mail, Building2, Briefcase, UserCheck, UserX, MoreHorizontal, Eye, Edit, Trash2, X } from 'lucide-react';
import { Member } from '../types';
import { useAppStore } from '../context';

// Component Select với khả năng thêm mới
const SelectWithAdd: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAddNew: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}> = ({ value, onChange, options, onAddNew, placeholder, className, label }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddNew = () => {
    if (newValue.trim() && !options.includes(newValue.trim())) {
      onAddNew(newValue.trim());
      onChange(newValue.trim());
      setNewValue('');
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-400 mb-2">
          {label}
        </label>
      )}
      {!isAdding ? (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 ${className || ''}`}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-slate-300 transition-colors flex items-center gap-1"
            title="Thêm mới"
          >
            <Plus size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNew();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
                setNewValue('');
              }
            }}
            placeholder="Nhập giá trị mới..."
            className={`flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600`}
          />
          <button
            type="button"
            onClick={handleAddNew}
            className="px-3 py-2 bg-gold-600 hover:bg-gold-700 text-black rounded-lg transition-colors"
            title="Lưu"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewValue('');
            }}
            className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-slate-300 transition-colors"
            title="Hủy"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

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

// Map role to department
const getDepartment = (role: Member['role']): string => {
  switch (role) {
    case 'Quản lý': return 'Quản Lý';
    case 'Kỹ thuật viên': return 'Kỹ Thuật';
    case 'QC': return 'QA/QC';
    case 'Tư vấn viên': return 'Kinh Doanh';
    default: return 'Khác';
  }
};

export const Members: React.FC = () => {
  const { members, updateMember, deleteMember, addMember } = useAppStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Off'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'Tư vấn viên' as Member['role'],
    department: undefined as Member['department'] | undefined,
    phone: '',
    email: '',
    status: 'Active' as Member['status'],
    specialty: '',
    avatar: ''
  });

  // Lưu các giá trị tùy chỉnh vào localStorage
  const [customRoles, setCustomRoles] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_roles');
    return saved ? JSON.parse(saved) : [];
  });

  const [customDepartments, setCustomDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_departments');
    return saved ? JSON.parse(saved) : [];
  });

  const [customStatuses, setCustomStatuses] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_statuses');
    return saved ? JSON.parse(saved) : [];
  });

  // Danh sách các giá trị mặc định (phải khớp với database constraint)
  const defaultRoles: string[] = ['Tư vấn viên', 'Kỹ thuật viên', 'QC', 'Quản lý'];
  const defaultDepartments: string[] = ['Kỹ Thuật', 'Spa', 'QA/QC', 'Hậu Cần', 'Quản Lý', 'Kinh Doanh'];
  const defaultStatuses: string[] = ['Active', 'Off'];

  // Mapping để validate giá trị hợp lệ cho database
  const validDepartments = new Set(defaultDepartments);
  const validRoles = new Set(defaultRoles);
  const validStatuses = new Set(defaultStatuses);

  // Kết hợp giá trị mặc định và tùy chỉnh
  const allRoles = useMemo(() => [...defaultRoles, ...customRoles], [customRoles]);
  const allDepartments = useMemo(() => [...defaultDepartments, ...customDepartments], [customDepartments]);
  const allStatuses = useMemo(() => [...defaultStatuses, ...customStatuses], [customStatuses]);

  // Hàm thêm giá trị mới (cho phép bất kỳ vai trò nào)
  const handleAddRole = (newRole: string) => {
    // Cho phép thêm bất kỳ vai trò nào
    if (!customRoles.includes(newRole)) {
      const updated = [...customRoles, newRole];
      setCustomRoles(updated);
      localStorage.setItem('custom_roles', JSON.stringify(updated));
    }
  };

  const handleAddDepartment = (newDept: string) => {
    // Cho phép thêm bất kỳ giá trị phòng ban nào
    if (!customDepartments.includes(newDept)) {
      const updated = [...customDepartments, newDept];
      setCustomDepartments(updated);
      localStorage.setItem('custom_departments', JSON.stringify(updated));
    }
  };

  const handleAddStatus = (newStatus: string) => {
    if (!validStatuses.has(newStatus)) {
      alert(`Trạng thái "${newStatus}" không hợp lệ. Chỉ cho phép: ${defaultStatuses.join(', ')}`);
      return;
    }
    if (!customStatuses.includes(newStatus)) {
      const updated = [...customStatuses, newStatus];
      setCustomStatuses(updated);
      localStorage.setItem('custom_statuses', JSON.stringify(updated));
    }
  };

  // Group members by department
  const membersByDept = useMemo(() => {
    const grouped: Record<string, Member[]> = {};

    let filtered = members || [];

    // Filter by search
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(search) ||
        m.phone.includes(search) ||
        (m.email && m.email.toLowerCase().includes(search)) ||
        (m.specialty && m.specialty.toLowerCase().includes(search))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Group by department
    filtered.forEach(member => {
      const dept = member.department || getDepartment(member.role);
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(member);
    });

    return grouped;
  }, [members, searchText, statusFilter]);

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.phone) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, SĐT)!');
      return;
    }

    try {
      // Không tạo ID - để database tự tạo
      const memberData: Member = {
        id: '', // Tạm thời để trống, sẽ được cập nhật sau khi tạo
        name: newMember.name,
        role: newMember.role,
        phone: newMember.phone,
        email: newMember.email || '',
        status: newMember.status,
        department: newMember.department,
        specialty: newMember.specialty, // Removed || undefined
        avatar: newMember.avatar // Removed || undefined
      };

      await addMember(memberData);

      // Đóng modal và reset form
      setShowAddModal(false);
      setNewMember({
        name: '',
        role: 'Tư vấn viên',
        department: undefined,
        phone: '',
        email: '',
        status: 'Active',
        specialty: '',
        avatar: ''
      });

      // Hiển thị thông báo thành công
      alert('Đã thêm nhân sự thành công!');
    } catch (error: any) {
      console.error('Lỗi khi thêm nhân sự:', error);
      alert('Lỗi khi thêm nhân sự: ' + (error?.message || String(error)));
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember || !editingMember.name || !editingMember.phone) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    try {
      // Ensure no undefined values in update
      const updatedData = {
        ...editingMember,
        email: editingMember.email || '',
        specialty: editingMember.specialty || '',
        avatar: editingMember.avatar || ''
      };

      await updateMember(editingMember.id, updatedData);
      
      // Đóng modal và reset
      setShowEditModal(false);
      setEditingMember(null);
      
      // Hiển thị thông báo thành công
      alert('Đã cập nhật nhân sự thành công!');
    } catch (error: any) {
      console.error('Lỗi khi cập nhật nhân sự:', error);
      const errorMessage = error?.message || String(error);
      alert('Lỗi khi cập nhật nhân sự: ' + errorMessage);
      // Không đóng modal nếu có lỗi để người dùng có thể sửa lại
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      await deleteMember(memberId);
    } catch (error: any) {
      console.error('Lỗi khi xóa nhân sự:', error);
      alert('Lỗi khi xóa nhân sự: ' + (error?.message || String(error)));
    }
  };

  const getRoleColor = (role: Member['role']) => {
    switch (role) {
      case 'Quản lý': return 'bg-gold-900/30 text-gold-400 border-gold-800';
      case 'Kỹ thuật viên': return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case 'QC': return 'bg-purple-900/30 text-purple-400 border-purple-800';
      case 'Tư vấn viên': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800';
      default: return 'bg-neutral-800 text-slate-400 border-neutral-700';
    }
  };

  const totalMembers = members ? members.length : 0;
  const activeMembers = members ? members.filter(m => m.status === 'Active').length : 0;

  return (
    <div className="space-y-6">
      {/* Modal Thêm Nhân Sự */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Nhân Sự Mới</h2>
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
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SelectWithAdd
                    label="Vai trò *"
                    value={newMember.role}
                    onChange={(role) => {
                      setNewMember({ 
                        ...newMember, 
                        role: role as Member['role'], 
                        department: getDepartment(role as Member['role']) as Member['department'] 
                      });
                    }}
                    options={allRoles}
                    onAddNew={handleAddRole}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <SelectWithAdd
                    label="Phòng ban"
                    value={newMember.department || ''}
                    onChange={(dept) => setNewMember({ ...newMember, department: dept as Member['department'] || undefined })}
                    options={allDepartments}
                    onAddNew={handleAddDepartment}
                    placeholder="Chọn phòng ban (tùy chọn)"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <SelectWithAdd
                  label="Trạng thái"
                  value={newMember.status}
                  onChange={(status) => setNewMember({ ...newMember, status: status as Member['status'] })}
                  options={allStatuses}
                  onAddNew={handleAddStatus}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    placeholder="0909 123 456"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="example@xoxo.vn"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>

              {newMember.role === 'Kỹ thuật viên' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Chuyên môn</label>
                  <input
                    type="text"
                    value={newMember.specialty}
                    onChange={(e) => setNewMember({ ...newMember, specialty: e.target.value })}
                    placeholder="VD: Phục hồi màu, Xi mạ vàng..."
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Ảnh đại diện</label>
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
                        setNewMember({ ...newMember, avatar: base64 });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                />
                {newMember.avatar && (
                  <div className="mt-2">
                    <img
                      src={newMember.avatar}
                      alt="Preview"
                      className="w-20 h-20 rounded-lg object-cover border border-neutral-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
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
                onClick={handleAddMember}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Thêm Nhân Sự
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Nhân Sự */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Sửa Nhân Sự</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SelectWithAdd
                    label="Vai trò *"
                    value={editingMember.role}
                    onChange={(role) => {
                      setEditingMember({
                        ...editingMember,
                        role: role as Member['role'],
                        department: getDepartment(role as Member['role']) as Member['department']
                      });
                    }}
                    options={allRoles}
                    onAddNew={handleAddRole}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <SelectWithAdd
                    label="Phòng ban"
                    value={editingMember.department || ''}
                    onChange={(dept) => setEditingMember({ ...editingMember, department: (dept || undefined) as Member['department'] })}
                    options={allDepartments}
                    onAddNew={handleAddDepartment}
                    placeholder="Chọn phòng ban (tùy chọn)"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <SelectWithAdd
                  label="Trạng thái"
                  value={editingMember.status}
                  onChange={(status) => setEditingMember({ ...editingMember, status: status as Member['status'] })}
                  options={allStatuses}
                  onAddNew={handleAddStatus}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={editingMember.phone}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    placeholder="0909 123 456"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingMember.email}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    placeholder="example@xoxo.vn"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>

              {editingMember.role === 'Kỹ thuật viên' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Chuyên môn</label>
                  <input
                    type="text"
                    value={editingMember.specialty || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, specialty: e.target.value })}
                    placeholder="VD: Phục hồi màu, Xi mạ vàng..."
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Ảnh đại diện</label>
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
                        setEditingMember({ ...editingMember, avatar: base64 });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                />
                {editingMember.avatar && (
                  <div className="mt-2">
                    <img
                      src={editingMember.avatar}
                      alt="Preview"
                      className="w-20 h-20 rounded-lg object-cover border border-neutral-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateMember}
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
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Nhân Sự</h1>
          <p className="text-slate-500 mt-1">Danh sách nhân viên theo phòng ban và vai trò.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all"
        >
          <Plus size={18} />
          <span>Thêm Nhân Sự</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Tổng nhân sự</p>
            <h3 className="text-2xl font-bold text-slate-100">{totalMembers}</h3>
          </div>
          <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg border border-blue-900/30">
            <Users size={24} />
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Đang làm việc</p>
            <h3 className="text-2xl font-bold text-emerald-500">{activeMembers}</h3>
          </div>
          <div className="p-3 bg-emerald-900/20 text-emerald-500 rounded-lg border border-emerald-900/30">
            <UserCheck size={24} />
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Nghỉ việc</p>
            <h3 className="text-2xl font-bold text-slate-400">{totalMembers - activeMembers}</h3>
          </div>
          <div className="p-3 bg-red-900/20 text-red-500 rounded-lg border border-red-900/30">
            <UserX size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 text-sm focus:ring-1 focus:ring-gold-500 outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Active">Đang làm việc</option>
          <option value="Off">Nghỉ việc</option>
        </select>
      </div>

      {/* Members by Department */}
      <div className="space-y-6">
        {Object.entries(membersByDept).map(([dept, members]) => (
          <div key={dept}>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100 mb-4 px-1">
              <Building2 size={20} className="text-gold-500" />
              <span>Phòng {dept}</span>
              <span className="text-xs font-normal text-slate-400 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">
                {members.length} người
              </span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex gap-6 items-center hover:border-gold-900/30 transition-all"
                >
                  <div className="w-24 h-24 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden flex-shrink-0">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-2xl">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-slate-100">{member.name}</h3>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                            <Briefcase size={10} />
                            {member.role}
                          </span>
                        </div>
                      </div>
                      <ActionMenu
                        itemName={member.name}
                        onView={() => alert(`Xem chi tiết nhân viên: ${member.name}\n\nID: ${member.id}\nVai trò: ${member.role}\nPhòng ban: ${member.department || getDepartment(member.role)}\nSĐT: ${member.phone}\nEmail: ${member.email}\nTrạng thái: ${member.status === 'Active' ? 'Đang làm việc' : 'Nghỉ việc'}\nChuyên môn: ${member.specialty || 'Không có'}`)}
                        onEdit={() => {
                          setEditingMember({ ...member });
                          setShowEditModal(true);
                        }}
                        onDelete={() => handleDeleteMember(member.id)}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone size={14} />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail size={14} />
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                        {member.specialty && (
                          <div className="text-xs text-gold-500 font-medium">
                            Chuyên môn: {member.specialty}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${member.status === 'Active'
                          ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-900/30'
                          : 'bg-red-900/20 text-red-500 border border-red-900/30'
                        }`}>
                        {member.status === 'Active' ? 'Đang làm việc' : 'Nghỉ việc'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(membersByDept).length === 0 && (
          <div className="bg-neutral-900 p-8 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 text-center text-slate-500">
            Không tìm thấy nhân sự nào phù hợp với bộ lọc
          </div>
        )}
      </div>
    </div>
  );
};
