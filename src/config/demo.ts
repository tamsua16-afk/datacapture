/**
 * Demo data configuration.
 * Chỉ sử dụng khi DEMO_MODE=true.
 * Không dùng trong môi trường production.
 */

export const DEMO_USERS = [
  {
    id: 'demo-staff-001',
    email: 'staff@demo.local',
    fullName: 'Nguyễn Văn An',
    role: 'WORKSHOP_STAFF' as const,
    workshopId: 'demo-workshop-001',
    password: 'demo1234',
  },
  {
    id: 'demo-manager-001',
    email: 'manager@demo.local',
    fullName: 'Trần Thị Bình',
    role: 'WORKSHOP_MANAGER' as const,
    workshopId: 'demo-workshop-001',
    password: 'demo1234',
  },
  {
    id: 'demo-accountant-001',
    email: 'accountant@demo.local',
    fullName: 'Lê Văn Cường',
    role: 'WAREHOUSE_ACCOUNTANT' as const,
    workshopId: null,
    password: 'demo1234',
  },
  {
    id: 'demo-acc-manager-001',
    email: 'accounting.manager@demo.local',
    fullName: 'Phạm Thị Dung',
    role: 'ACCOUNTING_MANAGER' as const,
    workshopId: null,
    password: 'demo1234',
  },
  {
    id: 'demo-admin-001',
    email: 'admin@demo.local',
    fullName: 'Hoàng Văn Emm',
    role: 'ADMIN' as const,
    workshopId: null,
    password: 'demo1234',
  },
  {
    id: 'demo-viewer-001',
    email: 'viewer@demo.local',
    fullName: 'Vũ Thị Phương',
    role: 'VIEWER' as const,
    workshopId: null,
    password: 'demo1234',
  },
]

export const DEMO_WORKSHOPS = [
  {
    id: 'demo-workshop-001',
    code: 'XD-DAI-MO',
    name: 'Xưởng Đại Mỗ',
    address: 'Đại Mỗ, Nam Từ Liêm, Hà Nội',
    managerName: 'Trần Thị Bình',
  },
  {
    id: 'demo-workshop-002',
    code: 'XD-HA-DONG',
    name: 'Xưởng Hà Đông',
    address: 'Hà Đông, Hà Nội',
    managerName: 'Nguyễn Minh Giang',
  },
  {
    id: 'demo-workshop-003',
    code: 'XD-DONG-ANH',
    name: 'Xưởng Đông Anh',
    address: 'Đông Anh, Hà Nội',
    managerName: 'Lê Thành Hùng',
  },
]

export const DEMO_WAREHOUSES = [
  {
    id: 'demo-wh-001',
    workshopId: 'demo-workshop-001',
    code: 'KHO-DM-NVL',
    name: 'Kho NVL Đại Mỗ',
    warehouseType: 'RAW_MATERIAL' as const,
  },
  {
    id: 'demo-wh-002',
    workshopId: 'demo-workshop-001',
    code: 'KHO-DM-TP',
    name: 'Kho Thành Phẩm Đại Mỗ',
    warehouseType: 'FINISHED_GOODS' as const,
  },
  {
    id: 'demo-wh-003',
    workshopId: 'demo-workshop-002',
    code: 'KHO-HD-NVL',
    name: 'Kho NVL Hà Đông',
    warehouseType: 'RAW_MATERIAL' as const,
  },
  {
    id: 'demo-wh-004',
    workshopId: 'demo-workshop-003',
    code: 'KHO-DA-NVL',
    name: 'Kho NVL Đông Anh',
    warehouseType: 'RAW_MATERIAL' as const,
  },
  {
    id: 'demo-wh-005',
    workshopId: 'demo-workshop-003',
    code: 'KHO-DA-CC',
    name: 'Kho CC-DC Đông Anh',
    warehouseType: 'TOOLS' as const,
  },
]

export const DEMO_ITEMS = [
  { id: 'item-001', code: 'XM-PCB40', name: 'Xi măng PCB40', itemGroup: 'CEMENT' as const, baseUnit: 'kg', minimumStock: 5000 },
  { id: 'item-002', code: 'XM-PCB30', name: 'Xi măng PCB30', itemGroup: 'CEMENT' as const, baseUnit: 'kg', minimumStock: 3000 },
  { id: 'item-003', code: 'XM-PC40', name: 'Xi măng PC40', itemGroup: 'CEMENT' as const, baseUnit: 'kg', minimumStock: 2000 },
  { id: 'item-004', code: 'CAT-VANG', name: 'Cát vàng', itemGroup: 'SAND' as const, baseUnit: 'kg', minimumStock: 10000 },
  { id: 'item-005', code: 'CAT-DEN', name: 'Cát đen', itemGroup: 'SAND' as const, baseUnit: 'kg', minimumStock: 8000 },
  { id: 'item-006', code: 'CAT-XAY', name: 'Cát xây', itemGroup: 'SAND' as const, baseUnit: 'kg', minimumStock: 5000 },
  { id: 'item-007', code: 'DA-1X2', name: 'Đá 1x2', itemGroup: 'STONE' as const, baseUnit: 'kg', minimumStock: 15000 },
  { id: 'item-008', code: 'DA-2X4', name: 'Đá 2x4', itemGroup: 'STONE' as const, baseUnit: 'kg', minimumStock: 10000 },
  { id: 'item-009', code: 'DA-HOM', name: 'Đá hộc', itemGroup: 'STONE' as const, baseUnit: 'kg', minimumStock: 5000 },
  { id: 'item-010', code: 'THEP-D10', name: 'Thép D10', itemGroup: 'STEEL' as const, baseUnit: 'kg', minimumStock: 2000 },
  { id: 'item-011', code: 'THEP-D12', name: 'Thép D12', itemGroup: 'STEEL' as const, baseUnit: 'kg', minimumStock: 2000 },
  { id: 'item-012', code: 'THEP-D16', name: 'Thép D16', itemGroup: 'STEEL' as const, baseUnit: 'kg', minimumStock: 1500 },
  { id: 'item-013', code: 'THEP-D20', name: 'Thép D20', itemGroup: 'STEEL' as const, baseUnit: 'kg', minimumStock: 1000 },
  { id: 'item-014', code: 'THEP-HINH', name: 'Thép hình các loại', itemGroup: 'STEEL' as const, baseUnit: 'kg', minimumStock: 500 },
  { id: 'item-015', code: 'PG-01', name: 'Phụ gia 01 siêu dẻo', itemGroup: 'ADDITIVE' as const, baseUnit: 'lít', minimumStock: 200 },
  { id: 'item-016', code: 'PG-02', name: 'Phụ gia 02 chống thấm', itemGroup: 'ADDITIVE' as const, baseUnit: 'lít', minimumStock: 100 },
  { id: 'item-017', code: 'PG-03', name: 'Phụ gia 03 đông cứng', itemGroup: 'ADDITIVE' as const, baseUnit: 'lít', minimumStock: 50 },
  { id: 'item-018', code: 'TP-COC-BTR', name: 'Cọc bê tông rỗng D400', itemGroup: 'FINISHED' as const, baseUnit: 'cái', minimumStock: 100 },
  { id: 'item-019', code: 'TP-COC-BTD', name: 'Cọc bê tông đặc D300', itemGroup: 'FINISHED' as const, baseUnit: 'cái', minimumStock: 50 },
  { id: 'item-020', code: 'TP-TAM-BT', name: 'Tấm bê tông đúc sẵn', itemGroup: 'FINISHED' as const, baseUnit: 'cái', minimumStock: 20 },
  { id: 'item-021', code: 'TP-CONG-BT', name: 'Cống bê tông D600', itemGroup: 'FINISHED' as const, baseUnit: 'cái', minimumStock: 30 },
  { id: 'item-022', code: 'TP-HOT-GA', name: 'Hố ga BTCT', itemGroup: 'FINISHED' as const, baseUnit: 'cái', minimumStock: 20 },
  { id: 'item-023', code: 'NUOC', name: 'Nước thi công', itemGroup: 'OTHER' as const, baseUnit: 'm3', minimumStock: 100 },
  { id: 'item-024', code: 'DAU-CHONG-DINH', name: 'Dầu chống dính khuôn', itemGroup: 'OTHER' as const, baseUnit: 'lít', minimumStock: 50 },
  { id: 'item-025', code: 'DAY-BUOC', name: 'Dây buộc thép', itemGroup: 'OTHER' as const, baseUnit: 'kg', minimumStock: 100 },
  { id: 'item-026', code: 'DIEN-HOA', name: 'Điện hóa chất làm mềm nước', itemGroup: 'OTHER' as const, baseUnit: 'kg', minimumStock: 20 },
  { id: 'item-027', code: 'CAT-SAN-LY', name: 'Cát sàng lọc tinh', itemGroup: 'SAND' as const, baseUnit: 'kg', minimumStock: 3000 },
  { id: 'item-028', code: 'DA-DEM', name: 'Đá dăm đệm móng', itemGroup: 'STONE' as const, baseUnit: 'kg', minimumStock: 5000 },
  { id: 'item-029', code: 'THEP-LUOI', name: 'Thép lưới B40', itemGroup: 'STEEL' as const, baseUnit: 'm2', minimumStock: 500 },
  { id: 'item-030', code: 'TP-TAM-LOT', name: 'Tấm lót đường đúc sẵn', itemGroup: 'FINISHED' as const, baseUnit: 'cái', minimumStock: 50 },
  { id: 'item-031', code: 'XM-TRANG', name: 'Xi măng trắng trang trí', itemGroup: 'CEMENT' as const, baseUnit: 'kg', minimumStock: 500 },
  { id: 'item-032', code: 'PG-TRUONG-NOI', name: 'Phụ gia trương nở không co', itemGroup: 'ADDITIVE' as const, baseUnit: 'kg', minimumStock: 200 },
]

export const DEMO_ITEM_ALIASES = [
  { itemCode: 'XM-PCB40', alias: 'XM40', workshopId: null },
  { itemCode: 'XM-PCB40', alias: 'Xi mang 40', workshopId: null },
  { itemCode: 'XM-PCB40', alias: 'xi măng pcb40', workshopId: null },
  { itemCode: 'XM-PCB40', alias: 'ximang40', workshopId: null },
  { itemCode: 'CAT-VANG', alias: 'Cat vang', workshopId: null },
  { itemCode: 'CAT-VANG', alias: 'cát vàng', workshopId: null },
  { itemCode: 'CAT-DEN', alias: 'Cat den', workshopId: null },
  { itemCode: 'DA-1X2', alias: 'Đá 1 2', workshopId: null },
  { itemCode: 'DA-1X2', alias: 'da 1x2', workshopId: null },
  { itemCode: 'DA-1X2', alias: 'đá dăm 1x2', workshopId: null },
  { itemCode: 'THEP-D10', alias: 'Thep phi 10', workshopId: null },
  { itemCode: 'THEP-D10', alias: 'thép phi 10', workshopId: null },
  { itemCode: 'THEP-D10', alias: 'Fe10', workshopId: null },
  { itemCode: 'THEP-D12', alias: 'Thep phi 12', workshopId: null },
  { itemCode: 'THEP-D12', alias: 'Fe12', workshopId: null },
  { itemCode: 'PG-01', alias: 'Phu gia 01', workshopId: null },
  { itemCode: 'PG-01', alias: 'phụ gia siêu dẻo', workshopId: null },
]
