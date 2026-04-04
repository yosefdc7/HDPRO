export const currentUser = {
  name: "RJ Dela Cuesta",
  email: "rj@rjhardware.ph",
  role: "owner",
  avatar_initials: "RJ"
};

export const stores = [
  { id: "1", store_name: "RJ Hardware & Construction Supply", branch_name: "Main Branch", address: "123 Rizal Ave, Quezon City" },
  { id: "2", store_name: "RJ Hardware & Construction Supply", branch_name: "Branch 2", address: "456 Mabini St, Caloocan" }
];

export const categories = [
  { id: "c1", name: "Cement", icon: "🏗️", color: "#78716C" },
  { id: "c2", name: "Wire & Cable", icon: "⚡", color: "#F59E0B" },
  { id: "c3", name: "Lumber", icon: "🪵", color: "#92400E" },
  { id: "c4", name: "Paint", icon: "🎨", color: "#8B5CF6" },
  { id: "c5", name: "Plumbing", icon: "🔧", color: "#0EA5E9" },
  { id: "c6", name: "Electrical", icon: "💡", color: "#EAB308" },
  { id: "c7", name: "Tools", icon: "🛠️", color: "#6B7280" },
  { id: "c8", name: "Nails & Screws", icon: "🔩", color: "#DC2626" }
];

export const products = [
  { id: "p1", category_id: "c1", name: "Portland Cement", sku: "CEM-001", barcode: "8850001001234", primary_unit: "bag", stock_quantity: 145, reorder_level: 50, cost_price: 220, selling_price: 265, is_active: true, image_placeholder: "🏗️" },
  { id: "p2", category_id: "c2", name: "THHN Wire #12 Red", sku: "WIR-012R", barcode: "8850001001235", primary_unit: "meter", stock_quantity: 2400, reorder_level: 500, cost_price: 8, selling_price: 12, is_active: true, image_placeholder: "⚡" },
  { id: "p3", category_id: "c3", name: "Coco Lumber 2x2x8", sku: "LUM-228", barcode: "8850001001236", primary_unit: "piece", stock_quantity: 85, reorder_level: 30, cost_price: 45, selling_price: 65, is_active: true, image_placeholder: "🪵" },
  { id: "p4", category_id: "c4", name: "Boysen Latex White 4L", sku: "PNT-BLW4", barcode: "8850001001237", primary_unit: "gallon", stock_quantity: 32, reorder_level: 10, cost_price: 380, selling_price: 485, is_active: true, image_placeholder: "🎨" },
  { id: "p5", category_id: "c5", name: "GI Pipe 1/2\" S40", sku: "PLM-GIP12", barcode: "8850001001238", primary_unit: "piece", stock_quantity: 60, reorder_level: 20, cost_price: 185, selling_price: 245, is_active: true, image_placeholder: "🔧" },
  { id: "p6", category_id: "c1", name: "Hollow Blocks 4\"", sku: "CEM-HB4", barcode: "8850001001239", primary_unit: "piece", stock_quantity: 800, reorder_level: 200, cost_price: 9, selling_price: 13, is_active: true, image_placeholder: "🧱" },
  { id: "p7", category_id: "c8", name: "Common Nails 3\"", sku: "NAI-COM3", barcode: "8850001001240", primary_unit: "kg", stock_quantity: 45, reorder_level: 15, cost_price: 65, selling_price: 85, is_active: true, image_placeholder: "🔩" },
  { id: "p8", category_id: "c5", name: "PVC Pipe 3/4\"", sku: "PLM-PVC34", barcode: "8850001001241", primary_unit: "piece", stock_quantity: 40, reorder_level: 15, cost_price: 55, selling_price: 78, is_active: true, image_placeholder: "🔧" },
  { id: "p9", category_id: "c7", name: "Hacksaw Blade", sku: "TOL-HSB", barcode: "8850001001242", primary_unit: "piece", stock_quantity: 5, reorder_level: 10, cost_price: 25, selling_price: 40, is_active: true, image_placeholder: "🛠️" },
  { id: "p10", category_id: "c8", name: "Roofing Nails 1.5\"", sku: "NAI-ROF15", barcode: "8850001001243", primary_unit: "kg", stock_quantity: 0, reorder_level: 10, cost_price: 75, selling_price: 95, is_active: true, image_placeholder: "🔩" },
  { id: "p11", category_id: "c6", name: "Circuit Breaker 20A", sku: "ELC-CB20", barcode: "8850001001244", primary_unit: "piece", stock_quantity: 18, reorder_level: 10, cost_price: 320, selling_price: 420, is_active: true, image_placeholder: "💡" },
  { id: "p12", category_id: "c2", name: "THHN Wire #10 Black", sku: "WIR-010B", barcode: "8850001001245", primary_unit: "meter", stock_quantity: 1800, reorder_level: 400, cost_price: 12, selling_price: 18, is_active: true, image_placeholder: "⚡" },
  { id: "p13", category_id: "c4", name: "Davies Enamel Paint (GL)", sku: "PNT-DEP-GL", barcode: "8850001001246", primary_unit: "gallon", stock_quantity: 14, reorder_level: 8, cost_price: 420, selling_price: 550, is_active: true, image_placeholder: "🎨" },
  { id: "p14", category_id: "c7", name: "Claw Hammer 16oz", sku: "TOL-CH16", barcode: "8850001001247", primary_unit: "piece", stock_quantity: 22, reorder_level: 10, cost_price: 180, selling_price: 245, is_active: true, image_placeholder: "🔨" },
  { id: "p15", category_id: "c3", name: "Plywood 1/4\" Marine", sku: "LUM-PLY14M", barcode: "8850001001248", primary_unit: "piece", stock_quantity: 30, reorder_level: 15, cost_price: 520, selling_price: 680, is_active: true, image_placeholder: "🪵" },
  { id: "p16", category_id: "c6", name: "Electrical Tape (Black)", sku: "ELC-TAP-BK", barcode: "8850001001249", primary_unit: "piece", stock_quantity: 7, reorder_level: 20, cost_price: 18, selling_price: 28, is_active: true, image_placeholder: "💡" },
  { id: "p17", category_id: "c8", name: "Concrete Nails 3\"", sku: "NAI-CON3", barcode: "8850001001250", primary_unit: "kg", stock_quantity: 0, reorder_level: 12, cost_price: 90, selling_price: 120, is_active: true, image_placeholder: "🔩" },
  { id: "p18", category_id: "c5", name: "Elbow 90° PVC 1/2\"", sku: "PLM-ELB12", barcode: "8850001001251", primary_unit: "piece", stock_quantity: 120, reorder_level: 30, cost_price: 8, selling_price: 15, is_active: true, image_placeholder: "🔧" },
  { id: "p19", category_id: "c1", name: "Mortar Mix Ready-to-Use", sku: "CEM-MRT", barcode: "8850001001252", primary_unit: "bag", stock_quantity: 55, reorder_level: 25, cost_price: 160, selling_price: 210, is_active: true, image_placeholder: "🏗️" },
  { id: "p20", category_id: "c7", name: "Measuring Tape 5M", sku: "TOL-MT5", barcode: "8850001001253", primary_unit: "piece", stock_quantity: 12, reorder_level: 8, cost_price: 95, selling_price: 135, is_active: true, image_placeholder: "📏" }
];

export const unitConversions = [
  { id: "uc1", product_id: "p2", from_unit: "roll", to_unit: "meter", factor: 150 },
  { id: "uc2", product_id: "p1", from_unit: "pallet", to_unit: "bag", factor: 40 },
  { id: "uc3", product_id: "p5", from_unit: "bundle", to_unit: "piece", factor: 6 },
  { id: "uc4", product_id: "p7", from_unit: "box", to_unit: "kg", factor: 25 },
  { id: "uc5", product_id: "p4", from_unit: "pail", to_unit: "gallon", factor: 4 }
];

export const stockMovements = [
  { id: "sm1", type: "in", product_id: "p1", product_name: "Portland Cement", quantity: 200, unit: "bag", note: "Supplier delivery - Eagle Cement", by: "RJ", timestamp: "2026-04-04T08:30:00" },
  { id: "sm2", type: "out", product_id: "p2", product_name: "THHN Wire #12 Red", quantity: 50, unit: "meter", note: "Walk-in customer", by: "RJ", timestamp: "2026-04-04T09:15:00" },
  { id: "sm3", type: "adjustment", product_id: "p6", product_name: "Hollow Blocks 4\"", quantity: -15, unit: "piece", note: "Breakage write-off", by: "RJ", timestamp: "2026-04-03T14:00:00" },
  { id: "sm4", type: "in", product_id: "p4", product_name: "Boysen Latex White 4L", quantity: 20, unit: "gallon", note: "Restocked from Boysen distributor", by: "Maria", timestamp: "2026-04-03T10:00:00" },
  { id: "sm5", type: "out", product_id: "p3", product_name: "Coco Lumber 2x2x8", quantity: 30, unit: "piece", note: "Contractor purchase - Juan dela Cruz", by: "RJ", timestamp: "2026-04-03T11:30:00" },
  { id: "sm6", type: "out", product_id: "p5", product_name: "GI Pipe 1/2\" S40", quantity: 12, unit: "piece", note: "Walk-in customer", by: "Maria", timestamp: "2026-04-03T13:00:00" },
  { id: "sm7", type: "in", product_id: "p7", product_name: "Common Nails 3\"", quantity: 50, unit: "kg", note: "Supplier delivery - Everstrong", by: "RJ", timestamp: "2026-04-02T08:00:00" },
  { id: "sm8", type: "out", product_id: "p11", product_name: "Circuit Breaker 20A", quantity: 5, unit: "piece", note: "Electrician bulk order", by: "Maria", timestamp: "2026-04-02T09:45:00" },
  { id: "sm9", type: "adjustment", product_id: "p9", product_name: "Hacksaw Blade", quantity: -3, unit: "piece", note: "Damaged/missing inventory count", by: "RJ", timestamp: "2026-04-02T15:00:00" },
  { id: "sm10", type: "in", product_id: "p12", product_name: "THHN Wire #10 Black", quantity: 500, unit: "meter", note: "Phelps Dodge delivery", by: "RJ", timestamp: "2026-04-02T10:00:00" },
  { id: "sm11", type: "out", product_id: "p14", product_name: "Claw Hammer 16oz", quantity: 8, unit: "piece", note: "Walk-in customers", by: "Maria", timestamp: "2026-04-01T11:00:00" },
  { id: "sm12", type: "in", product_id: "p15", product_name: "Plywood 1/4\" Marine", quantity: 20, unit: "piece", note: "Supplier delivery", by: "RJ", timestamp: "2026-04-01T08:30:00" },
  { id: "sm13", type: "out", product_id: "p8", product_name: "PVC Pipe 3/4\"", quantity: 15, unit: "piece", note: "Plumber bulk order - Santos Construction", by: "Maria", timestamp: "2026-04-01T14:00:00" },
  { id: "sm14", type: "adjustment", product_id: "p1", product_name: "Portland Cement", quantity: 5, unit: "bag", note: "Physical count correction", by: "RJ", timestamp: "2026-03-31T16:00:00" },
  { id: "sm15", type: "out", product_id: "p19", product_name: "Mortar Mix Ready-to-Use", quantity: 10, unit: "bag", note: "Walk-in customer", by: "Maria", timestamp: "2026-03-31T10:30:00" },
  { id: "sm16", type: "in", product_id: "p13", product_name: "Davies Enamel Paint (GL)", quantity: 10, unit: "gallon", note: "Davies Paints delivery", by: "RJ", timestamp: "2026-03-31T09:00:00" },
  { id: "sm17", type: "out", product_id: "p20", product_name: "Measuring Tape 5M", quantity: 4, unit: "piece", note: "Walk-in customer", by: "Maria", timestamp: "2026-03-30T14:30:00" },
  { id: "sm18", type: "in", product_id: "p18", product_name: "Elbow 90° PVC 1/2\"", quantity: 100, unit: "piece", note: "Restocked from supplier", by: "RJ", timestamp: "2026-03-30T09:00:00" },
  { id: "sm19", type: "out", product_id: "p6", product_name: "Hollow Blocks 4\"", quantity: 200, unit: "piece", note: "Construction project - Dela Cruz", by: "Maria", timestamp: "2026-03-30T11:00:00" },
  { id: "sm20", type: "adjustment", product_id: "p16", product_name: "Electrical Tape (Black)", quantity: -2, unit: "piece", note: "Pilferage write-off", by: "RJ", timestamp: "2026-03-29T15:00:00" },
  { id: "sm21", type: "in", product_id: "p1", product_name: "Portland Cement", quantity: 100, unit: "bag", note: "Eagle Cement Corp delivery", by: "RJ", timestamp: "2026-03-29T08:00:00" },
  { id: "sm22", type: "out", product_id: "p2", product_name: "THHN Wire #12 Red", quantity: 100, unit: "meter", note: "Electrician contract", by: "Maria", timestamp: "2026-03-29T10:00:00" },
  { id: "sm23", type: "in", product_id: "p11", product_name: "Circuit Breaker 20A", quantity: 10, unit: "piece", note: "Electrical supplier delivery", by: "RJ", timestamp: "2026-03-28T09:30:00" },
  { id: "sm24", type: "out", product_id: "p4", product_name: "Boysen Latex White 4L", quantity: 6, unit: "gallon", note: "Painter - Reyes project", by: "Maria", timestamp: "2026-03-28T11:00:00" },
  { id: "sm25", type: "in", product_id: "p7", product_name: "Common Nails 3\"", quantity: 30, unit: "kg", note: "Everstrong Hardware Supply delivery", by: "RJ", timestamp: "2026-03-28T08:00:00" }
];

export const suppliers = [
  { id: "s1", name: "Eagle Cement Corp", contact: "Juan Reyes", phone: "02-8888-1234", email: "sales@eaglecement.com.ph", products: ["Portland Cement", "Mortar Mix"] },
  { id: "s2", name: "Phelps Dodge Philippines", contact: "Ana Santos", phone: "02-8777-5678", email: "sales@phelpsdodge.com.ph", products: ["THHN Wire #12 Red", "THHN Wire #10 Black"] },
  { id: "s3", name: "Boysen Paints", contact: "Carlo Mendoza", phone: "02-8555-9012", email: "orders@boysen.com.ph", products: ["Boysen Latex White 4L"] },
  { id: "s4", name: "Davies Paints Philippines", contact: "Leo Bautista", phone: "02-8444-3456", email: "trade@davies.com.ph", products: ["Davies Enamel Paint"] },
  { id: "s5", name: "Everstrong Hardware Supply", contact: "Pedro Cruz", phone: "0917-555-0001", email: "everstrong@gmail.com", products: ["Common Nails 3\"", "Roofing Nails", "Concrete Nails"] }
];
