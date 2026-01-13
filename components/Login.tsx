import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, DB_TABLES } from '../supabase';

interface LoginProps {
  onLoginSuccess: (member: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // Tài khoản mặc định để test
  const DEFAULT_EMAIL = 'van.ngo@xoxo.vn';
  const DEFAULT_PASSWORD = '123456';
  
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('🔐 Attempting login:', { email });

      // Kiểm tra email và password trong bảng nhan_su
      // Lưu ý: Cần chạy script supabase/add-password-column.sql trước để thêm cột mat_khau
      let members: any = null;
      let queryError: any = null;
      
      try {
        // Thử select với mat_khau trước
        const result = await supabase
          .from(DB_TABLES.MEMBERS)
          .select('id, ho_ten, vai_tro, sdt, email, trang_thai, anh_dai_dien, phong_ban, mat_khau')
          .eq('email', email.trim().toLowerCase())
          .eq('trang_thai', 'hoat_dong')
          .maybeSingle();
        
        members = result.data;
        queryError = result.error;
        
        // Nếu lỗi là do cột mat_khau chưa tồn tại, thử select không có mat_khau và cho phép đăng nhập không cần password
        if (queryError && (queryError.code === '42703' || queryError.message?.includes('mat_khau') || queryError.message?.includes('column') || queryError.message?.includes('does not exist'))) {
          console.warn('⚠️ Column mat_khau does not exist, trying without password check');
          // Thử select không có mat_khau
          const resultWithoutPassword = await supabase
            .from(DB_TABLES.MEMBERS)
            .select('id, ho_ten, vai_tro, sdt, email, trang_thai, anh_dai_dien, phong_ban')
            .eq('email', email.trim().toLowerCase())
            .eq('trang_thai', 'hoat_dong')
            .maybeSingle();
          
          if (resultWithoutPassword.error) {
            queryError = resultWithoutPassword.error;
            members = null;
          } else {
            members = resultWithoutPassword.data;
            queryError = null;
            // Cho phép đăng nhập nếu có member (tạm thời, trong khi chưa có password)
            if (members) {
              console.warn('⚠️ Password column not found. Allowing login without password check. Please run SQL script to add password column.');
              // Tiếp tục với đăng nhập (bỏ qua password check)
            }
          }
        }
      } catch (err: any) {
        console.error('❌ Login query error:', err);
        setError('Lỗi khi đăng nhập. Vui lòng kiểm tra console để xem chi tiết. ' + (err?.message || String(err)));
        setIsLoading(false);
        return;
      }
      
      if (queryError) {
        console.error('❌ Login error:', queryError);
        if (queryError.code === '42703' || queryError.message?.includes('mat_khau') || queryError.message?.includes('column') || queryError.message?.includes('does not exist')) {
          setError('Cột mật khẩu chưa được tạo trong database. Vui lòng chạy script SQL: supabase/add-password-column.sql trong Supabase SQL Editor.');
        } else {
          setError('Lỗi khi đăng nhập. Vui lòng thử lại. Chi tiết: ' + (queryError.message || String(queryError)));
        }
        setIsLoading(false);
        return;
      }

      if (!members) {
        console.warn('⚠️ Member not found:', { email });
        setError('Email hoặc mật khẩu không đúng.');
        setIsLoading(false);
        return;
      }
      
      // Kiểm tra password nếu có cột mat_khau (nếu không có thì cho phép đăng nhập tạm thời)
      if (members.mat_khau !== undefined && members.mat_khau !== null) {
        if (members.mat_khau !== password) {
          console.warn('⚠️ Invalid password:', { email });
          setError('Email hoặc mật khẩu không đúng.');
          setIsLoading(false);
          return;
        }
      } else {
        // Không có cột mat_khau hoặc password chưa được set, cho phép đăng nhập tạm thời
        console.warn('⚠️ Password column not found or not set. Allowing login without password.');
      }

      console.log('✅ Login successful:', {
        memberId: members.id,
        memberName: members.ho_ten,
        email: members.email
      });

      // Map member từ database sang format frontend
      const member = {
        id: members.id,
        name: members.ho_ten,
        role: members.vai_tro === 'quan_ly' ? 'Quản lý' :
              members.vai_tro === 'tu_van' ? 'Tư vấn viên' :
              members.vai_tro === 'ky_thuat' ? 'Kỹ thuật viên' :
              members.vai_tro === 'qc' ? 'QC' : members.vai_tro,
        phone: members.sdt,
        email: members.email,
        status: members.trang_thai === 'hoat_dong' ? 'Active' : 'Off',
        avatar: members.anh_dai_dien,
        department: members.phong_ban
      };

      // Lưu thông tin đăng nhập vào localStorage
      localStorage.setItem('currentUser', JSON.stringify(member));
      localStorage.setItem('isAuthenticated', 'true');

      // Callback để thông báo login thành công
      onLoginSuccess(member);
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err?.message || 'Lỗi khi đăng nhập. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-gold-500 mb-2">XO</h1>
          <p className="text-slate-400 text-sm">Hệ thống quản lý ERP/CRM</p>
        </div>

        {/* Login Form */}
        <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold-900/20 rounded-lg">
              <LogIn className="text-gold-500" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Đăng Nhập</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="van.ngo@xoxo.vn"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mật Khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-gold-600 hover:bg-gold-500 disabled:bg-neutral-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition-colors shadow-lg shadow-gold-900/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Đăng Nhập</span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-xs text-slate-500 text-center mb-3">
              Chỉ nhân viên đang hoạt động mới có thể đăng nhập
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail(DEFAULT_EMAIL);
                setPassword(DEFAULT_PASSWORD);
                setError('');
              }}
              className="w-full text-xs text-slate-400 hover:text-gold-500 transition-colors py-2 px-3 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-gold-900/50"
            >
              Sử dụng tài khoản mặc định
            </button>
            <p className="text-[10px] text-slate-600 text-center mt-2">
              Tài khoản mặc định: {DEFAULT_EMAIL} / {DEFAULT_PASSWORD}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

