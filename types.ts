export enum OrderStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PROCESSING = 'Processing',
  DONE = 'Done',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export enum ServiceType {
  CLEANING = 'Cleaning',
  REPAIR = 'Repair',
  PLATING = 'Plating',
  DYEING = 'Dyeing',
  CUSTOM = 'Custom',
  PRODUCT = 'Product'
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  tier: 'Standard' | 'VIP' | 'VVIP';
  totalSpent: number;
  lastVisit: string;
  notes?: string;
  // New fields for extended filtering
  source?: string; // Nguồn tới (Facebook, Google,...)
  status?: string; // Trạng thái (Mới, Thân thiết,...)
  assigneeId?: string; // NV Sale phụ trách
  interactionCount?: number; // Số lần tương tác/gọi
  group?: string; // Nhóm khách hàng (có thể map với Tier hoặc riêng)
}

// Interface for tracking time and user per stage
export interface TaskHistory {
  stageId: string;
  stageName: string;
  enteredAt: number; // Timestamp when entered this stage
  leftAt?: number;   // Timestamp when left this stage
  duration?: number; // Duration in milliseconds
  performedBy: string; // User ID or Name
}

export interface TechnicalLog {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  stage: string;
}

export interface StageAssignment {
  stageId: string;
  assignedMemberIds: string[];
}

export interface ServiceItem {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  quantity: number;
  status: string;
  technicianId?: string;
  beforeImage?: string;

  afterImage?: string;
  isProduct?: boolean;
  // New fields for tracking
  serviceId?: string; // Link back to Service Catalog ID to find Workflow
  workflowId?: string; // Specific ID of the workflow this item is following
  history?: TaskHistory[];
  lastUpdated?: number;
  technicalLog?: TechnicalLog[]; // Added for persistent notes between stages
  notes?: string; // Ghi chú cho item
  assignedMembers?: string[]; // Danh sách ID nhân sự phụ trách item (chung cho cả item)
  stageAssignments?: StageAssignment[]; // Danh sách nhân sự phụ trách từng bước
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: ServiceItem[];
  totalAmount: number;
  deposit: number;
  status: OrderStatus;
  createdAt: string;
  expectedDelivery: string;
  notes?: string;
  discount?: number; // Khấu trừ (giảm giá)
  additionalFees?: number; // Phụ phí phát sinh
}

export interface CRMTask {
  id: string;
  customerId: string;
  customerName: string;
  type: 'Call Day 3' | 'Call Day 5' | 'Call Day 7' | 'Warranty Check' | 'Birthday';
  dueDate: string;
  status: 'Pending' | 'Overdue' | 'Done';
}

export interface RevenueStat {
  name: string;
  value: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Hoá chất' | 'Phụ kiện' | 'Dụng cụ' | 'Vật tư tiêu hao';
  quantity: number;
  unit: string;
  minThreshold: number;
  importPrice: number;
  supplier: string;
  lastImport: string;
  image?: string;
}

export interface Member {
  id: string;
  name: string;
  role: string; // Cho phép bất kỳ vai trò nào
  phone: string;
  email: string;
  status: 'Active' | 'Off';
  avatar?: string;
  specialty?: string;
  department?: string; // Cho phép bất kỳ phòng ban nào
}

export interface WorkflowMaterial {
  inventoryItemId: string;
  quantity: number;
}

export interface TodoStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  order: number;
}

export interface WorkflowStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  details?: string; // Chi tiết
  standards?: string; // Tiêu chuẩn
  todos?: TodoStep[]; // Danh sách các bước nhỏ trong một bước lớn
  assignedMembers?: string[]; // Danh sách ID nhân sự phụ trách bước này
}

export interface WorkflowDefinition {
  id: string;
  label: string;
  types: ServiceType[];
  description?: string;
  color: string;
  department: 'Kỹ Thuật' | 'Spa' | 'QA/QC' | 'Hậu Cần';
  materials?: WorkflowMaterial[];
  stages?: WorkflowStage[];
  assignedMembers?: string[]; // Array of member IDs
}

export interface ServiceCategory {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  parentId?: string;
  icon?: string;
  color?: string;
  children?: ServiceCategory[];
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  categoryPath?: string[]; // Đường dẫn category từ cấp 1 đến cấp 4

  price: number;
  desc: string;
  image: string;
  workflowId: string | string[]; // Có thể là một hoặc nhiều quy trình
  workflows?: { id: string; order: number; name?: string }[]; // Cấu trúc mới có thứ tự
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  desc?: string;
}

export interface CompanyConfig {
  name: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  themeColor: string;
}

export interface RoleConfig {
  id: string;
  name: string;
  permissions: {
    dashboard: boolean;
    customers: boolean;
    orders: boolean;
    inventory: boolean;
    settings: boolean;
  };
}

export interface SalaryConfig {
  roleId: string;
  baseSalary: number;
  allowance: number;
  commissionRate: {
    [key in ServiceType]?: number;
  };
}