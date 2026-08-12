/**
 * Deterministic mock catalogue generator for Navkar Trading.
 * Produces 250 bilingual electronics products with realistic Doha retail
 * pricing (QAR), stock levels, SKUs, barcodes and specs.
 *
 * Nothing here is wired to a supplier feed — it exists so the shop can be
 * tested end to end. Replace or top it up from the admin panel / CSV import.
 */

export type SeedCategory = {
  slug: string;
  nameEn: string;
  nameAr: string;
  icon: string;
};

export const CATEGORIES: SeedCategory[] = [
  { slug: "laptops", nameEn: "Laptops", nameAr: "لابتوبات", icon: "laptop" },
  { slug: "mobile-phones", nameEn: "Mobile Phones", nameAr: "هواتف محمولة", icon: "smartphone" },
  { slug: "tablets", nameEn: "Tablets", nameAr: "أجهزة لوحية", icon: "tablet" },
  { slug: "mobile-accessories", nameEn: "Mobile Accessories", nameAr: "ملحقات الجوال", icon: "cable" },
  { slug: "audio", nameEn: "Audio & Headphones", nameAr: "سماعات وصوتيات", icon: "headphones" },
  { slug: "wearables", nameEn: "Smart Watches", nameAr: "ساعات ذكية", icon: "watch" },
  { slug: "computer-accessories", nameEn: "Computer Accessories", nameAr: "ملحقات الكمبيوتر", icon: "keyboard" },
  { slug: "monitors", nameEn: "Monitors & Displays", nameAr: "شاشات", icon: "monitor" },
  { slug: "storage", nameEn: "Storage & Memory", nameAr: "التخزين والذاكرة", icon: "hard-drive" },
  { slug: "networking", nameEn: "Networking", nameAr: "شبكات", icon: "wifi" },
  { slug: "gaming", nameEn: "Gaming", nameAr: "ألعاب", icon: "gamepad-2" },
  { slug: "cameras", nameEn: "Cameras & Drones", nameAr: "كاميرات ودرونز", icon: "camera" },
  { slug: "printers", nameEn: "Printers & Scanners", nameAr: "طابعات وماسحات", icon: "printer" },
  { slug: "power", nameEn: "Power & Charging", nameAr: "الطاقة والشحن", icon: "battery-charging" },
  { slug: "smart-home", nameEn: "Smart Home", nameAr: "المنزل الذكي", icon: "house" },
];

export const BRANDS = [
  "Apple", "Samsung", "HP", "Dell", "Lenovo", "ASUS", "Acer", "MSI", "Xiaomi", "Huawei",
  "Honor", "Sony", "LG", "JBL", "Anker", "Belkin", "Logitech", "Razer", "SanDisk", "WD",
  "Seagate", "Kingston", "TP-Link", "Netgear", "Canon", "Epson", "Brother", "DJI", "GoPro",
  "Bose", "Baseus", "UGREEN", "Tecno", "Nothing", "Google", "OnePlus", "Realme", "AMD",
  "Corsair", "Philips",
];

/* --------------------------------------------------------------- helpers */

/** Tiny deterministic PRNG so the same seed always builds the same catalogue. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260812);

function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function intBetween(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

/** Prices ending in 9 read better on a shelf tag. */
function priceTag(base: number) {
  const rounded = base < 100 ? Math.round(base) : Math.round(base / 5) * 5;
  return (rounded - 1).toFixed(2);
}

/* ------------------------------------------------------- product templates */

type Template = {
  category: string;
  brands: string[];
  models: string[][]; // [modelEn, modelAr]
  variants: string[][]; // [variantEn, variantAr]
  priceRange: [number, number];
  warranty: number;
  specs: (v: string) => Record<string, string>;
  blurbEn: string;
  blurbAr: string;
};

const TEMPLATES: Template[] = [
  {
    category: "laptops",
    brands: ["Apple", "HP", "Dell", "Lenovo", "ASUS", "Acer", "MSI", "Huawei"],
    models: [
      ["MacBook Air M3", "ماك بوك إير M3"],
      ["MacBook Pro 14", "ماك بوك برو ١٤"],
      ["Pavilion 15", "بافيليون ١٥"],
      ["EliteBook 840", "إيليت بوك ٨٤٠"],
      ["Inspiron 15", "إنسبايرون ١٥"],
      ["XPS 13 Plus", "إكس بي إس ١٣ بلس"],
      ["IdeaPad Slim 5", "آيديا باد سليم ٥"],
      ["ThinkPad E14", "ثينك باد E14"],
      ["Vivobook 16", "فيفوبوك ١٦"],
      ["ZenBook Duo", "زين بوك ديو"],
      ["Aspire 5", "أسباير ٥"],
      ["Katana GF66", "كاتانا GF66"],
      ["MateBook D15", "ميت بوك D15"],
    ],
    variants: [
      ["8GB / 256GB SSD", "٨ جيجا / ٢٥٦ جيجا SSD"],
      ["16GB / 512GB SSD", "١٦ جيجا / ٥١٢ جيجا SSD"],
      ["16GB / 1TB SSD", "١٦ جيجا / ١ تيرا SSD"],
      ["32GB / 1TB SSD", "٣٢ جيجا / ١ تيرا SSD"],
    ],
    priceRange: [1899, 8999],
    warranty: 12,
    specs: (v) => ({
      Display: pickOne(["13.6\" Retina", "14\" IPS", "15.6\" FHD", "16\" 2.8K OLED"]),
      Processor: pickOne(["Apple M3", "Intel Core Ultra 7", "Intel Core i5-13500H", "AMD Ryzen 7 7735U"]),
      Memory: v.split(" / ")[0],
      Storage: v.split(" / ")[1] ?? "512GB SSD",
      Graphics: pickOne(["Integrated", "NVIDIA RTX 4050 6GB", "Intel Arc", "AMD Radeon 780M"]),
      Battery: pickOne(["Up to 12 hours", "Up to 15 hours", "Up to 18 hours"]),
      OS: pickOne(["macOS", "Windows 11 Home", "Windows 11 Pro"]),
    }),
    blurbEn:
      "A dependable everyday laptop for work, study and light creative jobs, supplied with regional charger and local warranty from our Doha counter.",
    blurbAr:
      "لابتوب موثوق للعمل والدراسة والأعمال الإبداعية الخفيفة، يأتي بشاحن مطابق للمنطقة وضمان محلي من محلنا في الدوحة.",
  },
  {
    category: "mobile-phones",
    brands: ["Apple", "Samsung", "Xiaomi", "Honor", "Huawei", "Google", "OnePlus", "Realme", "Tecno", "Nothing"],
    models: [
      ["iPhone 16", "آيفون ١٦"],
      ["iPhone 16 Pro Max", "آيفون ١٦ برو ماكس"],
      ["iPhone 15", "آيفون ١٥"],
      ["Galaxy S25", "جالاكسي S25"],
      ["Galaxy S25 Ultra", "جالاكسي S25 ألترا"],
      ["Galaxy A56", "جالاكسي A56"],
      ["Galaxy Z Flip 6", "جالاكسي Z فليب ٦"],
      ["Redmi Note 14 Pro", "ريدمي نوت ١٤ برو"],
      ["Xiaomi 15", "شاومي ١٥"],
      ["Honor Magic 7", "هونر ماجيك ٧"],
      ["Nova 13", "نوفا ١٣"],
      ["Pixel 9", "بيكسل ٩"],
      ["OnePlus 13", "ون بلس ١٣"],
      ["Realme 13 Pro", "ريلمي ١٣ برو"],
      ["Camon 30", "كامون ٣٠"],
      ["Phone (2a)", "فون (2a)"],
    ],
    variants: [
      ["128GB", "١٢٨ جيجا"],
      ["256GB", "٢٥٦ جيجا"],
      ["512GB", "٥١٢ جيجا"],
      ["1TB", "١ تيرا"],
    ],
    priceRange: [549, 6499],
    warranty: 12,
    specs: (v) => ({
      Display: pickOne(["6.1\" OLED 120Hz", "6.7\" AMOLED 120Hz", "6.8\" LTPO AMOLED"]),
      Storage: v,
      RAM: pickOne(["6GB", "8GB", "12GB", "16GB"]),
      "Rear camera": pickOne(["48MP + 12MP", "50MP + 12MP + 10MP", "200MP + 12MP + 50MP"]),
      Battery: pickOne(["4500 mAh", "5000 mAh", "5500 mAh"]),
      Charging: pickOne(["20W", "45W", "67W", "80W"]),
      SIM: "Dual SIM (Nano + eSIM)",
      Network: "5G",
    }),
    blurbEn:
      "Region-spec handset with Arabic and English system language, dual-SIM support and a manufacturer warranty valid in Qatar.",
    blurbAr:
      "هاتف بمواصفات المنطقة يدعم العربية والإنجليزية وشريحتين، مع ضمان الوكيل ساري في قطر.",
  },
  {
    category: "tablets",
    brands: ["Apple", "Samsung", "Lenovo", "Xiaomi", "Huawei", "Honor"],
    models: [
      ["iPad 10.9", "آيباد ١٠٫٩"],
      ["iPad Air 11", "آيباد إير ١١"],
      ["iPad Pro 13", "آيباد برو ١٣"],
      ["Galaxy Tab S10", "جالاكسي تاب S10"],
      ["Galaxy Tab A9+", "جالاكسي تاب A9+"],
      ["Tab P12", "تاب P12"],
      ["Redmi Pad Pro", "ريدمي باد برو"],
      ["MatePad 11.5", "ميت باد ١١٫٥"],
    ],
    variants: [
      ["64GB Wi-Fi", "٦٤ جيجا واي فاي"],
      ["128GB Wi-Fi", "١٢٨ جيجا واي فاي"],
      ["256GB Wi-Fi + Cellular", "٢٥٦ جيجا واي فاي + شريحة"],
      ["512GB Wi-Fi + Cellular", "٥١٢ جيجا واي فاي + شريحة"],
    ],
    priceRange: [599, 5299],
    warranty: 12,
    specs: (v) => ({
      Display: pickOne(["10.9\" Liquid Retina", "11\" 120Hz LCD", "12.4\" AMOLED", "13\" Tandem OLED"]),
      Storage: v.split(" ")[0],
      Connectivity: v.includes("Cellular") ? "Wi-Fi 6 + 5G" : "Wi-Fi 6",
      "Stylus support": pickOne(["Yes", "Yes", "No"]),
      Battery: pickOne(["7600 mAh", "8800 mAh", "10090 mAh"]),
    }),
    blurbEn: "Tablet for study, streaming and light work, bundled with a fast charger and 12-month warranty.",
    blurbAr: "جهاز لوحي للدراسة والمشاهدة والعمل الخفيف، مع شاحن سريع وضمان ١٢ شهراً.",
  },
  {
    category: "mobile-accessories",
    brands: ["Anker", "Belkin", "Baseus", "UGREEN", "Samsung", "Apple", "Xiaomi", "Sony"],
    models: [
      ["Silicone Case", "غطاء سيليكون"],
      ["Clear MagSafe Case", "غطاء شفاف MagSafe"],
      ["Tempered Glass Protector", "واقي شاشة زجاجي"],
      ["Privacy Screen Guard", "واقي شاشة للخصوصية"],
      ["USB-C to Lightning Cable", "كيبل USB-C إلى لايتننغ"],
      ["Braided USB-C Cable 2m", "كيبل USB-C مجدول ٢م"],
      ["Car Mount Holder", "حامل جوال للسيارة"],
      ["MagSafe Wallet", "محفظة MagSafe"],
      ["Selfie Stick Tripod", "عصا سيلفي بحامل"],
      ["Phone Ring Grip", "مسكة خاتم للجوال"],
    ],
    variants: [
      ["Black", "أسود"],
      ["Clear", "شفاف"],
      ["Navy", "كحلي"],
      ["Beige", "بيج"],
    ],
    priceRange: [15, 189],
    warranty: 6,
    specs: () => ({
      Material: pickOne(["Silicone", "TPU", "Tempered glass", "Braided nylon", "Aluminium"]),
      Compatibility: pickOne(["iPhone 15/16 series", "Galaxy S24/S25 series", "Universal"]),
      Colour: pickOne(["Black", "Clear", "Navy", "Beige"]),
    }),
    blurbEn: "Everyday accessory stocked in depth at the counter — walk in and we will fit it for you.",
    blurbAr: "ملحق يومي متوفر بكميات في المحل — تفضّل بزيارتنا وسنركّبه لك.",
  },
  {
    category: "audio",
    brands: ["Apple", "Samsung", "Sony", "JBL", "Bose", "Anker", "Xiaomi", "Philips"],
    models: [
      ["AirPods Pro 2", "إيربودز برو ٢"],
      ["AirPods 4", "إيربودز ٤"],
      ["Galaxy Buds 3 Pro", "جالاكسي بادز ٣ برو"],
      ["WH-1000XM5 Headphones", "سماعة WH-1000XM5"],
      ["WF-C710N Earbuds", "سماعة WF-C710N"],
      ["Tune 770NC", "تيون 770NC"],
      ["Flip 7 Speaker", "مكبر صوت فليب ٧"],
      ["Charge 6 Speaker", "مكبر صوت تشارج ٦"],
      ["QuietComfort Ultra", "كوايت كومفورت ألترا"],
      ["Soundcore Life Q35", "ساوندكور لايف Q35"],
      ["Redmi Buds 6", "ريدمي بادز ٦"],
    ],
    variants: [
      ["Black", "أسود"],
      ["White", "أبيض"],
      ["Blue", "أزرق"],
    ],
    priceRange: [49, 1899],
    warranty: 12,
    specs: () => ({
      Type: pickOne(["True wireless earbuds", "Over-ear headphones", "Portable speaker"]),
      "Noise cancelling": pickOne(["Active (ANC)", "Active (ANC)", "None"]),
      Battery: pickOne(["6h + 24h case", "30 hours", "40 hours", "20 hours playtime"]),
      Bluetooth: pickOne(["5.3", "5.4"]),
      "Water resistance": pickOne(["IPX4", "IP67", "IPX7", "None"]),
    }),
    blurbEn: "Tested in-store before you buy — bring your phone and pair it at the counter.",
    blurbAr: "جرّبها في المحل قبل الشراء — أحضر جوالك واربطه عند الكاونتر.",
  },
  {
    category: "wearables",
    brands: ["Apple", "Samsung", "Huawei", "Xiaomi", "Honor", "Google"],
    models: [
      ["Apple Watch Series 10", "آبل واتش سيريس ١٠"],
      ["Apple Watch SE", "آبل واتش SE"],
      ["Apple Watch Ultra 2", "آبل واتش ألترا ٢"],
      ["Galaxy Watch 7", "جالاكسي واتش ٧"],
      ["Galaxy Fit 3", "جالاكسي فيت ٣"],
      ["Watch GT 5", "ووتش GT 5"],
      ["Mi Band 9", "مي باند ٩"],
      ["Honor Band 9", "هونر باند ٩"],
      ["Pixel Watch 3", "بيكسل واتش ٣"],
    ],
    variants: [
      ["40mm GPS", "٤٠ ملم GPS"],
      ["44mm GPS", "٤٤ ملم GPS"],
      ["45mm GPS + Cellular", "٤٥ ملم GPS + شريحة"],
    ],
    priceRange: [129, 3699],
    warranty: 12,
    specs: (v) => ({
      "Case size": v.split(" ")[0],
      Connectivity: v.includes("Cellular") ? "GPS + LTE" : "GPS + Bluetooth",
      Sensors: "Heart rate, SpO2, sleep, GPS",
      "Water resistance": pickOne(["5 ATM", "WR50", "10 ATM"]),
      "Battery life": pickOne(["18 hours", "2 days", "7 days", "14 days"]),
    }),
    blurbEn: "Fitness and notifications on your wrist, with straps and screen guards available in store.",
    blurbAr: "لياقتك وإشعاراتك على معصمك، مع أساور وواقيات شاشة متوفرة في المحل.",
  },
  {
    category: "computer-accessories",
    brands: ["Logitech", "Razer", "HP", "Dell", "Lenovo", "Corsair", "UGREEN", "Belkin"],
    models: [
      ["MX Master 3S Mouse", "ماوس MX Master 3S"],
      ["Wireless Combo MK270", "طقم لاسلكي MK270"],
      ["Mechanical Keyboard K70", "كيبورد ميكانيكي K70"],
      ["Arabic/English Keyboard", "كيبورد عربي/إنجليزي"],
      ["USB-C Hub 8-in-1", "هَب USB-C ٨ في ١"],
      ["Laptop Docking Station", "قاعدة توصيل للابتوب"],
      ["Laptop Stand Aluminium", "حامل لابتوب ألمنيوم"],
      ["1080p Webcam", "كاميرا ويب 1080p"],
      ["Laptop Backpack 15.6\"", "حقيبة ظهر للابتوب ١٥٫٦"],
      ["Cooling Pad", "قاعدة تبريد"],
      ["Gaming Mousepad XL", "لوحة ماوس قيمنق XL"],
    ],
    variants: [
      ["Wireless", "لاسلكي"],
      ["Wired", "سلكي"],
      ["Bluetooth", "بلوتوث"],
    ],
    priceRange: [29, 899],
    warranty: 12,
    specs: () => ({
      Connection: pickOne(["USB-C", "USB-A 2.4GHz", "Bluetooth 5.1", "Wired USB"]),
      Compatibility: "Windows, macOS, iPadOS",
      Layout: pickOne(["Arabic / English", "English (US)", "N/A"]),
    }),
    blurbEn: "Desk and laptop accessories kept in stock for shops, offices and students in Doha.",
    blurbAr: "ملحقات المكتب واللابتوب متوفرة دائماً للمحلات والمكاتب والطلاب في الدوحة.",
  },
  {
    category: "monitors",
    brands: ["Samsung", "LG", "Dell", "HP", "ASUS", "Acer", "MSI", "Philips"],
    models: [
      ["24\" IPS Monitor", "شاشة ٢٤ بوصة IPS"],
      ["27\" QHD Monitor", "شاشة ٢٧ بوصة QHD"],
      ["27\" 165Hz Gaming Monitor", "شاشة قيمنق ٢٧ بوصة ١٦٥ هرتز"],
      ["32\" 4K Monitor", "شاشة ٣٢ بوصة 4K"],
      ["34\" Ultrawide", "شاشة ٣٤ بوصة عريضة"],
      ["Portable Monitor 15.6\"", "شاشة محمولة ١٥٫٦"],
    ],
    variants: [
      ["FHD 75Hz", "FHD ٧٥ هرتز"],
      ["QHD 100Hz", "QHD ١٠٠ هرتز"],
      ["4K 60Hz", "4K ٦٠ هرتز"],
      ["QHD 165Hz", "QHD ١٦٥ هرتز"],
    ],
    priceRange: [349, 3299],
    warranty: 24,
    specs: (v) => ({
      Resolution: v.split(" ")[0],
      "Refresh rate": v.split(" ")[1] ?? "60Hz",
      Panel: pickOne(["IPS", "VA", "OLED"]),
      Ports: pickOne(["HDMI x2, DisplayPort", "HDMI, USB-C 65W PD", "HDMI x2, USB-C, USB hub"]),
      "VESA mount": "100 x 100 mm",
    }),
    blurbEn: "Display sizes for office desks and gaming setups, with dead-pixel check before handover.",
    blurbAr: "شاشات بمقاسات للمكاتب وأجهزة الألعاب، مع فحص البكسل الميت قبل التسليم.",
  },
  {
    category: "storage",
    brands: ["SanDisk", "WD", "Seagate", "Kingston", "Samsung", "Lexar"],
    models: [
      ["Ultra microSD Card", "بطاقة microSD ألترا"],
      ["Extreme Pro SD Card", "بطاقة SD إكستريم برو"],
      ["Cruzer USB Flash Drive", "فلاش USB كروزر"],
      ["Portable SSD T7", "قرص SSD محمول T7"],
      ["My Passport HDD", "قرص My Passport"],
      ["Expansion Desktop HDD", "قرص مكتبي Expansion"],
      ["NVMe Internal SSD", "قرص NVMe داخلي"],
      ["DDR4 Laptop RAM", "رام لابتوب DDR4"],
      ["DDR5 Desktop RAM", "رام مكتبي DDR5"],
    ],
    variants: [
      ["64GB", "٦٤ جيجا"],
      ["128GB", "١٢٨ جيجا"],
      ["256GB", "٢٥٦ جيجا"],
      ["512GB", "٥١٢ جيجا"],
      ["1TB", "١ تيرا"],
      ["2TB", "٢ تيرا"],
    ],
    priceRange: [25, 899],
    warranty: 24,
    specs: (v) => ({
      Capacity: v,
      Interface: pickOne(["USB 3.2 Gen 2", "microSDXC UHS-I", "SATA III", "PCIe 4.0 NVMe"]),
      "Read speed": pickOne(["150 MB/s", "540 MB/s", "1050 MB/s", "7000 MB/s"]),
      Warranty: "Manufacturer limited warranty",
    }),
    blurbEn: "Genuine media only — we do not stock re-labelled cards. Capacity verified in store on request.",
    blurbAr: "وسائط أصلية فقط — لا نبيع بطاقات معاد لصق ملصقاتها. نتحقق من السعة في المحل عند الطلب.",
  },
  {
    category: "networking",
    brands: ["TP-Link", "Netgear", "Huawei", "Xiaomi", "UGREEN", "Belkin"],
    models: [
      ["AX1500 Wi-Fi 6 Router", "راوتر واي فاي ٦ AX1500"],
      ["AX3000 Mesh System", "نظام ميش AX3000"],
      ["Wi-Fi Range Extender", "موسّع نطاق واي فاي"],
      ["8-Port Gigabit Switch", "سويتش جيجابت ٨ منافذ"],
      ["Powerline Adapter Kit", "طقم باورلاين"],
      ["USB-C to Ethernet Adapter", "محوّل USB-C إلى إيثرنت"],
      ["4G LTE Portable Router", "راوتر متنقل 4G"],
    ],
    variants: [
      ["Single unit", "قطعة واحدة"],
      ["2-pack", "قطعتان"],
      ["3-pack", "٣ قطع"],
    ],
    priceRange: [59, 1299],
    warranty: 24,
    specs: () => ({
      Standard: pickOne(["Wi-Fi 5 (AC)", "Wi-Fi 6 (AX)", "Wi-Fi 6E"]),
      Speed: pickOne(["1200 Mbps", "1500 Mbps", "3000 Mbps", "5400 Mbps"]),
      Ports: pickOne(["4x Gigabit LAN", "1x WAN + 3x LAN", "8x Gigabit"]),
      Coverage: pickOne(["Up to 100 m²", "Up to 200 m²", "Up to 350 m²"]),
    }),
    blurbEn: "Works with Ooredoo and Vodafone Qatar fibre. We can configure it for you before you leave the shop.",
    blurbAr: "يعمل مع ألياف Ooredoo وVodafone قطر. يمكننا ضبطه لك قبل مغادرة المحل.",
  },
  {
    category: "gaming",
    brands: ["Sony", "Razer", "Corsair", "MSI", "ASUS", "Logitech", "Xiaomi"],
    models: [
      ["PS5 DualSense Controller", "يد تحكم PS5 DualSense"],
      ["Gaming Headset", "سماعة قيمنق"],
      ["RGB Gaming Keyboard", "كيبورد قيمنق RGB"],
      ["Gaming Mouse 26K DPI", "ماوس قيمنق 26K DPI"],
      ["Gaming Chair", "كرسي قيمنق"],
      ["Streaming Microphone", "ميكروفون بث"],
      ["Capture Card 4K", "كرت التقاط 4K"],
      ["Controller Charging Dock", "قاعدة شحن يد التحكم"],
    ],
    variants: [
      ["Black", "أسود"],
      ["White", "أبيض"],
      ["RGB", "RGB"],
    ],
    priceRange: [89, 1899],
    warranty: 12,
    specs: () => ({
      Platform: pickOne(["PC", "PC / PS5", "PC / Console", "PS5"]),
      Connection: pickOne(["Wired USB", "2.4GHz wireless", "Bluetooth + 2.4GHz"]),
      Lighting: pickOne(["RGB", "RGB", "None"]),
    }),
    blurbEn: "Gaming gear for the counter and online — controllers tested on a live console before sale.",
    blurbAr: "معدات ألعاب في المحل وأونلاين — يتم اختبار أيدي التحكم على جهاز فعلي قبل البيع.",
  },
  {
    category: "cameras",
    brands: ["Canon", "Sony", "DJI", "GoPro", "Xiaomi"],
    models: [
      ["EOS R50 Mirrorless Kit", "كاميرا EOS R50 مع عدسة"],
      ["ZV-1F Vlog Camera", "كاميرا تدوين ZV-1F"],
      ["Osmo Pocket 3", "أوزمو بوكيت ٣"],
      ["Mini 4K Drone", "درون ميني 4K"],
      ["HERO13 Black", "هيرو١٣ بلاك"],
      ["Action Camera 4K", "كاميرا أكشن 4K"],
      ["Indoor Security Camera", "كاميرا مراقبة داخلية"],
      ["Outdoor Wi-Fi Camera", "كاميرا خارجية واي فاي"],
    ],
    variants: [
      ["Standard kit", "الطقم القياسي"],
      ["Creator combo", "طقم صنّاع المحتوى"],
      ["Fly More combo", "طقم Fly More"],
    ],
    priceRange: [149, 5499],
    warranty: 12,
    specs: () => ({
      Video: pickOne(["4K 30fps", "4K 60fps", "5.3K 60fps"]),
      Sensor: pickOne(["1/2.3\"", "1\" CMOS", "APS-C 24.2MP"]),
      Stabilisation: pickOne(["Electronic", "3-axis gimbal", "Optical"]),
      Storage: "microSD (sold separately)",
    }),
    blurbEn: "Drone and camera stock — note that drone flights in Qatar require MOTC permission.",
    blurbAr: "كاميرات ودرونز — يُرجى العلم أن تشغيل الدرون في قطر يتطلب تصريحاً من وزارة المواصلات.",
  },
  {
    category: "printers",
    brands: ["HP", "Canon", "Epson", "Brother"],
    models: [
      ["DeskJet 2720 All-in-One", "ديسك جيت 2720 متعدد"],
      ["LaserJet M141w", "ليزر جيت M141w"],
      ["PIXMA G3420 Ink Tank", "بيكسما G3420 بخزان حبر"],
      ["EcoTank L3250", "إيكو تانك L3250"],
      ["DCP-T420W Ink Tank", "DCP-T420W بخزان حبر"],
      ["Portable Photo Printer", "طابعة صور محمولة"],
      ["Document Scanner", "ماسح ضوئي للمستندات"],
    ],
    variants: [
      ["Colour", "ألوان"],
      ["Mono", "أبيض وأسود"],
      ["Wi-Fi", "واي فاي"],
    ],
    priceRange: [199, 1799],
    warranty: 12,
    specs: () => ({
      Functions: pickOne(["Print, scan, copy", "Print only", "Print, scan, copy, fax"]),
      Technology: pickOne(["Inkjet", "Ink tank", "Laser"]),
      Connectivity: pickOne(["USB, Wi-Fi", "USB, Wi-Fi, Ethernet"]),
      "Print speed": pickOne(["7.5 ppm", "20 ppm", "33 ppm"]),
    }),
    blurbEn: "Ink and toner refills stocked separately — bring your model number and we will match it.",
    blurbAr: "الأحبار والتونر متوفرة بشكل منفصل — أحضر رقم الموديل ونوفّر لك المناسب.",
  },
  {
    category: "power",
    brands: ["Anker", "Belkin", "Baseus", "UGREEN", "Samsung", "Apple", "Xiaomi"],
    models: [
      ["20W USB-C Charger", "شاحن USB-C ٢٠ واط"],
      ["65W GaN Charger", "شاحن GaN ٦٥ واط"],
      ["100W Desktop Charger", "شاحن مكتبي ١٠٠ واط"],
      ["10000mAh Power Bank", "بنك طاقة ١٠٠٠٠ مللي أمبير"],
      ["20000mAh Power Bank", "بنك طاقة ٢٠٠٠٠ مللي أمبير"],
      ["MagSafe Power Bank", "بنك طاقة MagSafe"],
      ["Wireless Charging Pad", "قاعدة شحن لاسلكي"],
      ["3-in-1 Charging Station", "محطة شحن ٣ في ١"],
      ["Car Charger 45W", "شاحن سيارة ٤٥ واط"],
      ["UPS 650VA", "جهاز UPS ٦٥٠ فولت أمبير"],
    ],
    variants: [
      ["Black", "أسود"],
      ["White", "أبيض"],
    ],
    priceRange: [19, 649],
    warranty: 18,
    specs: () => ({
      Output: pickOne(["20W", "45W", "65W", "100W", "22.5W"]),
      Ports: pickOne(["1x USB-C", "2x USB-C + 1x USB-A", "3x USB-C"]),
      "Fast charge": pickOne(["PD 3.0", "PD 3.0 + QC 4", "PPS"]),
      Plug: "UK 3-pin (Qatar standard)",
    }),
    blurbEn: "UK 3-pin plugs to match Qatari sockets — no travel adapter needed.",
    blurbAr: "قابس بريطاني ثلاثي يناسب مقابس قطر — لا حاجة لمحوّل.",
  },
  {
    category: "smart-home",
    brands: ["Xiaomi", "Philips", "TP-Link", "Samsung", "Huawei", "Google"],
    models: [
      ["Smart LED Bulb", "لمبة LED ذكية"],
      ["Smart Plug Wi-Fi", "قابس ذكي واي فاي"],
      ["Smart Light Strip 2m", "شريط إضاءة ذكي ٢م"],
      ["Robot Vacuum", "مكنسة روبوت"],
      ["Air Purifier", "منقّي هواء"],
      ["Smart Door Sensor", "حساس باب ذكي"],
      ["Smart Speaker", "مكبر صوت ذكي"],
      ["Video Doorbell", "جرس باب بكاميرا"],
    ],
    variants: [
      ["Single", "قطعة"],
      ["2-pack", "قطعتان"],
      ["4-pack", "٤ قطع"],
    ],
    priceRange: [35, 1599],
    warranty: 12,
    specs: () => ({
      Connectivity: pickOne(["Wi-Fi 2.4GHz", "Wi-Fi + Bluetooth", "Zigbee"]),
      App: pickOne(["Mi Home", "Tapo", "SmartThings", "Google Home"]),
      "Voice control": "Alexa & Google Assistant",
      Power: "220–240V, UK plug",
    }),
    blurbEn: "Set up on our shop Wi-Fi before you take it home, so you leave with it already working.",
    blurbAr: "نضبطه على شبكة المحل قبل أن تأخذه، لتخرج وهو جاهز للعمل.",
  },
];

/* ---------------------------------------------------------------- builder */

export type SeedProduct = {
  sku: string;
  barcode: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  categorySlug: string;
  brand: string;
  price: string;
  compareAtPrice: string | null;
  cost: string;
  stock: number;
  lowStockThreshold: number;
  warrantyMonths: number;
  specs: Record<string, string>;
  active: boolean;
  featured: boolean;
};

const TARGET = 250;

export function buildCatalogue(): SeedProduct[] {
  const out: SeedProduct[] = [];
  const usedSlugs = new Set<string>();
  const usedSkus = new Set<string>();

  // Round-robin across templates so every category is well populated.
  let i = 0;
  let guard = 0;
  while (out.length < TARGET && guard < TARGET * 40) {
    guard++;
    const tpl = TEMPLATES[i % TEMPLATES.length];
    i++;

    const brand = pickOne(tpl.brands);
    const [modelEn, modelAr] = pickOne(tpl.models);
    const [variantEn, variantAr] = pickOne(tpl.variants);

    const nameEn = `${brand} ${modelEn} — ${variantEn}`;
    const nameAr = `${brand} ${modelAr} — ${variantAr}`;
    const slug = slugify(nameEn);
    if (usedSlugs.has(slug)) continue;
    usedSlugs.add(slug);

    const catIndex = CATEGORIES.findIndex((c) => c.slug === tpl.category) + 1;
    const seq = String(out.length + 1).padStart(4, "0");
    const sku = `NT-${tpl.category.slice(0, 3).toUpperCase()}-${seq}`;
    if (usedSkus.has(sku)) continue;
    usedSkus.add(sku);

    const [lo, hi] = tpl.priceRange;
    const base = lo + rand() * (hi - lo);
    const price = priceTag(base);

    // ~35% of items carry a strike-through price
    const onOffer = rand() < 0.35;
    const compareAtPrice = onOffer ? priceTag(Number(price) * (1.08 + rand() * 0.25)) : null;

    // Margin: cheap accessories carry more margin than laptops
    const marginPct = Number(price) < 200 ? 0.35 + rand() * 0.15 : 0.1 + rand() * 0.12;
    const cost = (Number(price) * (1 - marginPct)).toFixed(2);

    // Stock: a handful deliberately out of stock / low so the alerts are testable
    const roll = rand();
    const stock = roll < 0.05 ? 0 : roll < 0.15 ? intBetween(1, 4) : intBetween(6, 90);

    const specs = tpl.specs(variantEn);
    const barcode = `628${String(catIndex).padStart(2, "0")}${seq}${intBetween(1000, 9999)}`.slice(0, 13);

    out.push({
      sku,
      barcode,
      slug,
      nameEn,
      nameAr,
      descEn: `${nameEn}. ${tpl.blurbEn}\n\n${Object.entries(specs)
        .map(([k, v]) => `• ${k}: ${v}`)
        .join("\n")}`,
      descAr: `${nameAr}. ${tpl.blurbAr}`,
      categorySlug: tpl.category,
      brand,
      price,
      compareAtPrice,
      cost,
      stock,
      lowStockThreshold: Number(price) > 1500 ? 2 : 5,
      warrantyMonths: tpl.warranty,
      specs,
      active: true,
      featured: rand() < 0.09,
    });
  }

  return out;
}
