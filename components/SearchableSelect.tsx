import { Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface Option {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (string | Option)[];
    placeholder?: string;
    required?: boolean;
    allowNew?: boolean;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Chọn...',
    required = false,
    allowNew = true,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedOptions: Option[] = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const filteredOptions = normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const showAddNew = allowNew && searchTerm.trim() !== '' &&
        !normalizedOptions.find(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={isOpen ? searchTerm : value}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setSearchTerm('');
                        setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    required={required && !value}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {value && !isOpen && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onChange('');
                                setSearchTerm('');
                            }}
                            className="text-slate-500 hover:text-slate-300"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <Search size={16} className="text-slate-500" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {filteredOptions.length > 0 ? (
                        <div className="p-1">
                            {filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${value === opt.value ? 'bg-gold-600 text-black font-bold' : 'text-slate-300 hover:bg-neutral-800'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    ) : !showAddNew && (
                        <div className="p-3 text-center text-slate-500 text-sm italic">
                            Không tìm thấy kết quả
                        </div>
                    )}

                    {showAddNew && (
                        <div className="p-1 border-t border-neutral-800">
                            <button
                                onClick={() => {
                                    onChange(searchTerm);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className="w-full text-left px-3 py-2 rounded-md text-sm text-gold-500 hover:bg-neutral-800 transition-colors flex items-center gap-2"
                            >
                                <span className="bg-gold-600 rounded-full p-0.5 text-black"><Search size={10} /></span>
                                Thêm mới: <span className="font-bold underline">"{searchTerm}"</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
