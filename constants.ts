import { Order, OrderStatus, ServiceType, Customer, CRMTask, RevenueStat, InventoryItem, Member, ServiceCatalogItem, Product, WorkflowDefinition, WorkflowStage, CompanyConfig, RoleConfig, SalaryConfig } from './types';

// --- 3. KHO VẬN (INVENTORY) ---
export const MOCK_INVENTORY: InventoryItem[] = [];

// --- 0. QUY TRÌNH (WORKFLOWS) ---
// Updated colors for Dark Theme compatibility
export const MOCK_WORKFLOWS: WorkflowDefinition[] = [];

// --- SETTINGS MOCK DATA ---
export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  name: 'XOXO Luxury Repair',
  slogan: 'Nâng niu giá trị thời gian',
  address: '88 Đồng Khởi, Quận 1, TP. Hồ Chí Minh',
  phone: '0909 888 999',
  email: 'contact@xoxo.vn',
  website: 'www.xoxoluxury.vn',
  logoUrl: 'https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2F23b33b0b.%E1%BA%A2nh.091749.jpg',
  themeColor: '#c68a35' // Gold
};

export const MOCK_ROLES: RoleConfig[] = [];

export const MOCK_SALARIES: SalaryConfig[] = [];

// --- 1. KHÁCH HÀNG (CRM) ---
export const MOCK_CUSTOMERS: Customer[] = [];

// --- 2. NHÂN SỰ (MEMBERS) ---
export const MOCK_MEMBERS: Member[] = [];

// --- 4. DANH MỤC DỊCH VỤ (SERVICE CATALOG) ---
export const SERVICE_CATALOG: ServiceCatalogItem[] = [];

// --- 5. SẢN PHẨM BÁN KÈM (PRODUCTS) ---
export const MOCK_PRODUCTS: Product[] = [];

// --- 6. DANH SÁCH ĐƠN HÀNG (MOCK ORDERS) ---
export const MOCK_ORDERS: Order[] = [];

// --- 7. DỮ LIỆU BIỂU ĐỒ & CRM (CHART DATA & TASKS) ---
export const REVENUE_DATA: RevenueStat[] = [];

export const MOCK_CRM_TASKS: CRMTask[] = [];