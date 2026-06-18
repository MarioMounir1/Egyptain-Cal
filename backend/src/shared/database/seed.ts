import 'dotenv/config';
import { pool } from './pool.js';

interface BaseFood {
  name: string;
  name_en: string | null;
  category: string;
  portionsType: 'liquid' | 'plate' | 'bakery' | 'piece' | 'street_sandwich';
  baseCals: number;
  baseProt: number;
  baseCarbs: number;
  baseFat: number;
}

const BASE_FOODS: BaseFood[] = [
  { name: 'فول بالزيت الحار', name_en: 'Fava beans with linseed oil', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 160, baseProt: 6.5, baseCarbs: 14.2, baseFat: 7.8 },
  { name: 'فول بالزيت الحلو', name_en: 'Fava beans with corn oil', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 150, baseProt: 6.5, baseCarbs: 14.2, baseFat: 6.8 },
  { name: 'فول بالزبدة', name_en: 'Fava beans with butter', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 190, baseProt: 6.5, baseCarbs: 13.5, baseFat: 11.2 },
  { name: 'فول بالسجق', name_en: 'Fava beans with sausage', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 210, baseProt: 9.8, baseCarbs: 13.0, baseFat: 13.5 },
  { name: 'فول بالبسطرمة', name_en: 'Fava beans with pastrami', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 180, baseProt: 11.5, baseCarbs: 13.2, baseFat: 9.0 },
  { name: 'فول بالبيض', name_en: 'Fava beans with eggs', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 175, baseProt: 10.2, baseCarbs: 13.0, baseFat: 8.5 },
  { name: 'فول بالصلصة', name_en: 'Fava beans with tomato sauce', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 135, baseProt: 6.0, baseCarbs: 14.5, baseFat: 5.5 },
  { name: 'طعمية سادة', name_en: 'Plain Taameya', category: 'Foul & Falafel', portionsType: 'piece', baseCals: 80, baseProt: 3.5, baseCarbs: 8.0, baseFat: 4.5 },
  { name: 'طعمية محشية', name_en: 'Stuffed Taameya', category: 'Foul & Falafel', portionsType: 'piece', baseCals: 110, baseProt: 4.0, baseCarbs: 9.5, baseFat: 6.8 },
  { name: 'طعمية بالسمسم', name_en: 'Taameya with sesame', category: 'Foul & Falafel', portionsType: 'piece', baseCals: 90, baseProt: 3.8, baseCarbs: 8.2, baseFat: 5.2 },
  { name: 'بابا غنوج', name_en: 'Baba Ghanoush', category: 'Foul & Falafel', portionsType: 'plate', baseCals: 120, baseProt: 1.8, baseCarbs: 7.2, baseFat: 9.5 },
  { name: 'مسقعة بالخل والثوم', name_en: 'Moussaka with garlic vinegar', category: 'Stews & Sides', portionsType: 'plate', baseCals: 140, baseProt: 2.2, baseCarbs: 11.0, baseFat: 10.0 },
  { name: 'مسقعة باللحمة المفرومة', name_en: 'Moussaka with minced meat', category: 'Stews & Sides', portionsType: 'plate', baseCals: 220, baseProt: 11.5, baseCarbs: 9.8, baseFat: 15.0 },
  { name: 'كشري مصري', name_en: 'Egyptian Koshary', category: 'Koshary & Pasta', portionsType: 'plate', baseCals: 190, baseProt: 6.2, baseCarbs: 36.8, baseFat: 2.1 },
  { name: 'مكرونة بالبشاميل', name_en: 'Macaroni Bechamel', category: 'Koshary & Pasta', portionsType: 'plate', baseCals: 280, baseProt: 14.0, baseCarbs: 29.5, baseFat: 12.0 },
  { name: 'طاجن مكرونة باللحمة المفرومة', name_en: 'Pasta claypot with minced meat', category: 'Koshary & Pasta', portionsType: 'plate', baseCals: 240, baseProt: 11.8, baseCarbs: 31.0, baseFat: 7.5 },
  { name: 'طاجن مكرونة بالفراخ', name_en: 'Pasta claypot with chicken', category: 'Koshary & Pasta', portionsType: 'plate', baseCals: 230, baseProt: 13.2, baseCarbs: 30.5, baseFat: 6.0 },
  { name: 'ملوخية سادة', name_en: 'Plain Molokhia', category: 'Stews & Sides', portionsType: 'plate', baseCals: 45, baseProt: 1.8, baseCarbs: 5.5, baseFat: 1.8 },
  { name: 'ملوخية بالفراخ', name_en: 'Molokhia with chicken', category: 'Stews & Sides', portionsType: 'plate', baseCals: 120, baseProt: 12.5, baseCarbs: 4.8, baseFat: 5.8 },
  { name: 'ملوخية بالأرانب', name_en: 'Molokhia with rabbit', category: 'Stews & Sides', portionsType: 'plate', baseCals: 110, baseProt: 13.0, baseCarbs: 4.5, baseFat: 4.5 },
  { name: 'بامية باللحمة', name_en: 'Bamya with beef', category: 'Stews & Sides', portionsType: 'plate', baseCals: 160, baseProt: 11.2, baseCarbs: 8.5, baseFat: 9.0 },
  { name: 'قلقاس بالسلق واللحمة', name_en: 'Taro with Swiss chard and beef', category: 'Stews & Sides', portionsType: 'plate', baseCals: 180, baseProt: 10.8, baseCarbs: 18.2, baseFat: 7.5 },
  { name: 'تورلي خضار مشكل باللحمة', name_en: 'Torly mixed vegetables with beef', category: 'Stews & Sides', portionsType: 'plate', baseCals: 140, baseProt: 9.5, baseCarbs: 10.8, baseFat: 6.8 },
  { name: 'بطاطس مطبوخة باللحمة', name_en: 'Potato stew with beef', category: 'Stews & Sides', portionsType: 'plate', baseCals: 155, baseProt: 9.8, baseCarbs: 14.5, baseFat: 6.5 },
  { name: 'بسلة بالجزر واللحمة', name_en: 'Peas with carrots and beef', category: 'Stews & Sides', portionsType: 'plate', baseCals: 150, baseProt: 10.2, baseCarbs: 12.8, baseFat: 6.2 },
  { name: 'كفتة مشوية على الفحم', name_en: 'Grilled beef Kofta', category: 'Grills & Meats', portionsType: 'piece', baseCals: 260, baseProt: 19.5, baseCarbs: 1.2, baseFat: 19.8 },
  { name: 'كباب لحم ضأن', name_en: 'Lamb Kebab', category: 'Grills & Meats', portionsType: 'piece', baseCals: 280, baseProt: 21.0, baseCarbs: 0.8, baseFat: 21.5 },
  { name: 'طرب ضأن مشوي', name_en: 'Grilled Tarb', category: 'Grills & Meats', portionsType: 'piece', baseCals: 360, baseProt: 16.5, baseCarbs: 0.5, baseFat: 32.8 },
  { name: 'شيش طاووق فراخ', name_en: 'Chicken Shish Tawook', category: 'Grills & Meats', portionsType: 'piece', baseCals: 160, baseProt: 20.2, baseCarbs: 1.8, baseFat: 8.2 },
  { name: 'حواوشي لحمة بلدي', name_en: 'Hawawshi minced beef', category: 'bakery', portionsType: 'bakery', baseCals: 480, baseProt: 21.0, baseCarbs: 45.0, baseFat: 24.0 },
  { name: 'حواوشي بالجبنة الموزاريلا', name_en: 'Hawawshi with mozzarella', category: 'bakery', portionsType: 'bakery', baseCals: 580, baseProt: 25.5, baseCarbs: 46.2, baseFat: 32.0 },
  { name: 'كبدة اسكندراني', name_en: 'Alexandrian beef liver', category: 'Street & Fast Food', portionsType: 'plate', baseCals: 190, baseProt: 18.2, baseCarbs: 4.5, baseFat: 10.8 },
  { name: 'سجق شرقي اسكندراني', name_en: 'Alexandrian Eastern sausage', category: 'Street & Fast Food', portionsType: 'plate', baseCals: 280, baseProt: 14.5, baseCarbs: 3.2, baseFat: 23.5 },
  { name: 'شاورما لحمة مصري', name_en: 'Egyptian beef Shawarma', category: 'Street & Fast Food', portionsType: 'plate', baseCals: 240, baseProt: 17.5, baseCarbs: 5.8, baseFat: 16.2 },
  { name: 'شاورما فراخ مصري', name_en: 'Egyptian chicken Shawarma', category: 'Street & Fast Food', portionsType: 'plate', baseCals: 210, baseProt: 19.0, baseCarbs: 4.2, baseFat: 13.0 },
  { name: 'ساندوتش كبدة فينو', name_en: 'Fino Liver Sandwich', category: 'Street & Fast Food', portionsType: 'street_sandwich', baseCals: 260, baseProt: 12.5, baseCarbs: 28.5, baseFat: 10.5 },
  { name: 'ساندوتش سجق فينو', name_en: 'Fino Sausage Sandwich', category: 'Street & Fast Food', portionsType: 'street_sandwich', baseCals: 310, base_prot: 10.8, baseCarbs: 27.8, baseFat: 17.2 },
  { name: 'فتة باللحمة والخل والثوم', name_en: 'Fatteh with beef and garlic vinegar', category: 'Grills & Meats', portionsType: 'plate', baseCals: 240, baseProt: 12.0, baseCarbs: 26.5, baseFat: 9.8 },
  { name: 'فرخة مشوية على الفحم', name_en: 'Charcoal grilled chicken', category: 'Grills & Meats', portionsType: 'piece', baseCals: 190, baseProt: 24.5, baseCarbs: 0.5, baseFat: 9.8 },
  { name: 'أرانب محمرة', name_en: 'Fried rabbit pieces', category: 'Grills & Meats', portionsType: 'piece', baseCals: 160, baseProt: 26.0, baseCarbs: 0.0, baseFat: 5.8 },
  { name: 'محشي ورق عنب', name_en: 'Stuffed grape leaves', category: 'Mahashi', portionsType: 'piece', baseCals: 30, baseProt: 0.6, baseCarbs: 5.5, baseFat: 0.8 },
  { name: 'محشي كرنب', name_en: 'Stuffed cabbage rolls', category: 'Mahashi', portionsType: 'piece', baseCals: 35, baseProt: 0.7, baseCarbs: 6.2, baseFat: 1.0 },
  { name: 'محشي كوسة', name_en: 'Stuffed zucchini', category: 'Mahashi', portionsType: 'piece', baseCals: 40, baseProt: 1.2, baseCarbs: 6.5, baseFat: 1.2 },
  { name: 'محشي باذنجان أسود', name_en: 'Stuffed black eggplant', category: 'Mahashi', portionsType: 'piece', baseCals: 45, baseProt: 0.8, baseCarbs: 7.8, baseFat: 1.3 },
  { name: 'محشي باذنجان أبيض', name_en: 'Stuffed white eggplant', category: 'Mahashi', portionsType: 'piece', baseCals: 45, baseProt: 0.8, baseCarbs: 7.8, baseFat: 1.3 },
  { name: 'محشي فلفل رومي', name_en: 'Stuffed bell pepper', category: 'Mahashi', portionsType: 'piece', baseCals: 55, baseProt: 1.5, baseCarbs: 9.2, baseFat: 1.5 },
  { name: 'ممبار محمر', name_en: 'Fried Mombar', category: 'Mahashi', portionsType: 'piece', baseCals: 140, baseProt: 3.8, baseCarbs: 18.5, baseFat: 5.8 },
  { name: 'شوربة لسان عصفور بالمرقة', name_en: 'Orzo soup with broth', category: 'Stews & Sides', portionsType: 'plate', baseCals: 65, baseProt: 2.2, baseCarbs: 9.8, baseFat: 1.8 },
  { name: 'شوربة عدس أصفر بالزبدة', name_en: 'Lentil soup with butter', category: 'Stews & Sides', portionsType: 'plate', baseCals: 120, baseProt: 6.2, baseCarbs: 16.5, baseFat: 3.5 },
  { name: 'أرز مصري بالشعرية والسمن', name_en: 'Egyptian rice with vermicelli and ghee', category: 'Stews & Sides', portionsType: 'plate', baseCals: 170, baseProt: 2.8, baseCarbs: 32.5, baseFat: 3.0 },
  { name: 'أرز أبيض مصري سادة', name_en: 'Plain white Egyptian rice', category: 'Stews & Sides', portionsType: 'plate', baseCals: 150, baseProt: 2.6, baseCarbs: 32.0, baseFat: 1.2 },
  { name: 'كشك مصري بالفراخ', name_en: 'Egyptian Kishk with chicken', category: 'Stews & Sides', portionsType: 'plate', baseCals: 190, baseProt: 11.5, baseCarbs: 22.0, baseFat: 6.5 },
  { name: 'أم علي بالمكسرات والقشطة', name_en: 'Umm Ali with nuts and cream', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 320, baseProt: 5.8, baseCarbs: 38.0, baseFat: 16.5 },
  { name: 'بسبوسة سادة بالسميد والشراب', name_en: 'Semolina Basbousa plain', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 290, baseProt: 3.8, baseCarbs: 48.0, baseFat: 9.5 },
  { name: 'بسبوسة بالقشطة الطازجة', name_en: 'Basbousa with fresh cream', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 350, baseProt: 4.2, baseCarbs: 49.5, baseFat: 15.5 },
  { name: 'كنافة بالجبنة النابلسية', name_en: 'Konafa with Nabulsi cheese', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 380, baseProt: 8.5, baseCarbs: 45.0, baseFat: 18.2 },
  { name: 'كنافة بالقشطة والفسدق', name_en: 'Konafa with cream and pistachio', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 360, baseProt: 4.8, baseCarbs: 46.5, baseFat: 17.0 },
  { name: 'أرز باللبن سادة', name_en: 'Roz bel Laban plain', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 140, baseProt: 3.5, baseCarbs: 25.0, baseFat: 3.0 },
  { name: 'أرز باللبن والمكسرات وجوز الهند', name_en: 'Roz bel Laban with nuts', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 190, baseProt: 4.8, baseCarbs: 28.5, baseFat: 6.5 },
  { name: 'مهلبية سادة بالفانيليا', name_en: 'Vanilla Mahalabiya plain', category: 'Sweets & Desserts', portionsType: 'piece', baseCals: 110, baseProt: 3.2, baseCarbs: 19.8, baseFat: 2.2 },
  { name: 'عصير قصب طازج', name_en: 'Fresh sugarcane juice', category: 'Beverages', portionsType: 'liquid', baseCals: 60, baseProt: 0.1, baseCarbs: 14.5, baseFat: 0.0 },
  { name: 'عصير تمر هندي بلدي', name_en: 'Tamarind juice', category: 'Beverages', portionsType: 'liquid', baseCals: 85, baseProt: 0.2, baseCarbs: 21.0, baseFat: 0.0 },
  { name: 'عصير مانجو طازج محلى', name_en: 'Fresh sweetened mango juice', category: 'Beverages', portionsType: 'liquid', baseCals: 95, baseProt: 0.5, baseCarbs: 23.5, baseFat: 0.2 },
  { name: 'سوبيا رحماني باللبن', name_en: 'Sobia milk beverage', category: 'Beverages', portionsType: 'liquid', baseCals: 130, baseProt: 2.8, baseCarbs: 24.2, baseFat: 2.5 },
  { name: 'كركديه بلدي بارد محلى', name_en: 'Cold sweetened Hibiscus tea', category: 'Beverages', portionsType: 'liquid', baseCals: 50, baseProt: 0.0, baseCarbs: 12.5, baseFat: 0.0 },
  { name: 'شاي كشري أسود', name_en: 'Black Tea', category: 'Beverages', portionsType: 'liquid', baseCals: 2, baseProt: 0.0, baseCarbs: 0.5, baseFat: 0.0 },
  { name: 'قهوة تركي سادة', name_en: 'Plain Turkish Coffee', category: 'Beverages', portionsType: 'liquid', baseCals: 5, baseProt: 0.2, baseCarbs: 0.8, baseFat: 0.1 },
  { name: 'سحلب ساخن بالمكسرات والسمسم', name_en: 'Hot Sahlab with nuts', category: 'Beverages', portionsType: 'liquid', baseCals: 150, baseProt: 3.5, baseCarbs: 26.0, baseFat: 3.5 },
  { name: 'خروب طبيعي محلى', name_en: 'Sweetened Carob juice', category: 'Beverages', portionsType: 'liquid', baseCals: 70, baseProt: 0.3, baseCarbs: 17.2, baseFat: 0.0 },
  { name: 'جبنة قريش فلاحي سادة', name_en: 'Farmer cottage cheese', category: 'Dairy & Breakfast', portionsType: 'plate', baseCals: 98, baseProt: 11.5, baseCarbs: 3.2, baseFat: 4.3 },
  { name: 'جبنة فيتا بيضاء معلبة', name_en: 'Boxed white Feta cheese', category: 'Dairy & Breakfast', portionsType: 'plate', baseCals: 260, baseProt: 14.0, baseCarbs: 4.0, baseFat: 21.0 },
  { name: 'جبنة قديمة بمش وطماطم', name_en: 'Old cheese with Mish and tomatoes', category: 'Dairy & Breakfast', portionsType: 'plate', baseCals: 210, baseProt: 12.8, baseCarbs: 5.2, baseFat: 15.5 },
  { name: 'عسل أسود بالطحينة السمسم', name_en: 'Molasses with sesame Tahini', category: 'Dairy & Breakfast', portionsType: 'plate', baseCals: 380, baseProt: 5.2, baseCarbs: 62.0, baseFat: 14.5 },
  { name: 'بيض مسلوق بلدي', name_en: 'Boiled local egg', category: 'Dairy & Breakfast', portionsType: 'piece', baseCals: 75, baseProt: 6.3, baseCarbs: 0.6, baseFat: 5.3 },
  { name: 'بيض مقلي بالسمن البلدي', name_en: 'Fried egg in local ghee', category: 'Dairy & Breakfast', portionsType: 'piece', baseCals: 110, baseProt: 6.3, baseCarbs: 0.6, baseFat: 9.2 },
  { name: 'شكشوكة مصرية بالبيض والطماطم', name_en: 'Egyptian Shakshouka', category: 'Dairy & Breakfast', portionsType: 'plate', baseCals: 140, baseProt: 7.8, baseCarbs: 6.5, baseFat: 9.5 },
  { name: 'فطير مشلتيت فلاحي', name_en: 'Farmer Feteer Meshaltet', category: 'bakery', portionsType: 'bakery', baseCals: 380, baseProt: 6.8, baseCarbs: 44.0, baseFat: 19.5 },
  { name: 'رغيف عيش بلدي رده', name_en: 'Baladi bread loaf with bran', category: 'bakery', portionsType: 'bakery', baseCals: 250, baseProt: 8.5, baseCarbs: 52.0, baseFat: 1.2 },
  { name: 'رغيف عيش فينو أبيض', name_en: 'White Fino bread loaf', category: 'bakery', portionsType: 'bakery', baseCals: 280, baseProt: 9.0, baseCarbs: 56.0, baseFat: 2.5 },
  { name: 'كشري كبير بالصلصة والعدس', name_en: 'Koshary large plate', category: 'Koshary & Pasta', portionsType: 'plate', baseCals: 190, baseProt: 6.2, baseCarbs: 36.8, baseFat: 2.1 },
  { name: 'كريب دجاج بانيه شرائح', name_en: 'Crepe chicken pane strips', category: 'Street & Fast Food', portionsType: 'street_sandwich', baseCals: 220, baseProt: 11.2, baseCarbs: 24.5, baseFat: 8.5 },
  { name: 'كريب شاورما لحمة مصري', name_en: 'Crepe beef Shawarma', category: 'Street & Fast Food', portionsType: 'street_sandwich', baseCals: 240, baseProt: 12.0, baseCarbs: 23.8, baseFat: 10.8 },
  { name: 'كريب شيكولاتة نوتيلا وموز', name_en: 'Crepe chocolate Nutella and banana', category: 'Street & Fast Food', portionsType: 'street_sandwich', baseCals: 310, baseProt: 4.5, baseCarbs: 48.0, baseFat: 11.2 },
  { name: 'ساندوتش فلافل طعمية بالخضار', name_en: 'Falafel sandwich with veggies', category: 'Foul & Falafel', portionsType: 'street_sandwich', baseCals: 260, baseProt: 8.2, baseCarbs: 38.5, baseFat: 9.0 }
];

const PORTIONS_CONFIG = {
  liquid: [
    { nameSuffix: 'فنجان صغير', desc: 'فنجان صغير (~60ml)', mult: 0.25 },
    { nameSuffix: 'كوب صغير', desc: 'كوب صغير (~150ml)', mult: 0.6 },
    { nameSuffix: 'كوب متوسط', desc: 'كوب متوسط (~250ml)', mult: 1.0 },
    { nameSuffix: 'كوب كبير', desc: 'كوب كبير (~350ml)', mult: 1.4 },
    { nameSuffix: 'عبوة متوسطة', desc: 'عبوة متوسطة (~500ml)', mult: 2.0 },
    { nameSuffix: 'زجاجة لتر', desc: 'زجاجة لتر (~1000ml)', mult: 4.0 },
    { nameSuffix: 'عبوة عائلية', desc: 'عبوة عائلية (~2000ml)', mult: 8.0 },
  ],
  plate: [
    { nameSuffix: '100 جرام', desc: 'حصة 100 جرام', mult: 1.0 },
    { nameSuffix: 'طبق صغير', desc: 'طبق صغير (~200g)', mult: 2.0 },
    { nameSuffix: 'طبق متوسط', desc: 'طبق متوسط (~350g)', mult: 3.5 },
    { nameSuffix: 'طبق كبير', desc: 'طبق كبير (~500g)', mult: 5.0 },
    { nameSuffix: 'ربع كيلو', desc: 'ربع كيلو (~250g)', mult: 2.5 },
    { nameSuffix: 'نصف كيلو', desc: 'نصف كيلو (~500g)', mult: 5.0 },
    { nameSuffix: 'كيلو كامل', desc: 'كيلو كامل (~1000g)', mult: 10.0 },
  ],
  bakery: [
    { nameSuffix: 'ربع رغيف/قطعة', desc: 'ربع رغيف أو قطعة صغيرة', mult: 0.25 },
    { nameSuffix: 'نصف رغيف/قطعة', desc: 'نصف رغيف أو قطعة متوسطة', mult: 0.5 },
    { nameSuffix: 'رغيف صغير', desc: 'رغيف صغير أو قطعة سادة', mult: 0.7 },
    { nameSuffix: 'رغيف متوسط', desc: 'رغيف متوسط الحجم', mult: 1.0 },
    { nameSuffix: 'رغيف كبير', desc: 'رغيف كبير الحجم', mult: 1.5 },
    { nameSuffix: 'رغيفين', desc: 'حجم مضاعف رغيفين', mult: 2.0 },
    { nameSuffix: 'حجم عائلي كبير', desc: 'حجم عائلي كبير للمشاركة', mult: 6.0 },
  ],
  piece: [
    { nameSuffix: 'قطعة واحدة', desc: 'قطعة واحدة متوسطة', mult: 1.0 },
    { nameSuffix: 'قطعتين', desc: 'قطعتين متوسطة الحجم', mult: 2.0 },
    { nameSuffix: '3 قطع', desc: '3 قطع متوسطة الحجم', mult: 3.0 },
    { nameSuffix: 'نصف قطعة', desc: 'نصف قطعة متوسطة', mult: 0.5 },
    { nameSuffix: 'طبق صغير', desc: 'طبق صغير يحتوي على عدة قطع', mult: 1.5 },
    { nameSuffix: 'طبق متوسط', desc: 'طبق متوسط يحتوي على قطع عائلية', mult: 3.0 },
    { nameSuffix: 'كيلو كامل', desc: 'كيلو كامل من القطع', mult: 10.0 },
  ],
  street_sandwich: [
    { nameSuffix: 'ساندوتش صغير', desc: 'ساندوتش فينو/بلدي صغير', mult: 0.8 },
    { nameSuffix: 'ساندوتش متوسط', desc: 'ساندوتش فينو/بلدي متوسط', mult: 1.0 },
    { nameSuffix: 'ساندوتش كبير', desc: 'ساندوتش فينو/بلدي كبير', mult: 1.5 },
    { nameSuffix: 'ساندوتشين', desc: 'حصة ساندوتشين', mult: 2.0 },
    { nameSuffix: 'وجبة فردية مع بطاطس', desc: 'وجبة فردية (ساندوتش كبير وبطاطس)', mult: 2.8 },
    { nameSuffix: 'وجبة وسط عائلية', desc: 'وجبة عائلية صغيرة للوسط', mult: 4.0 },
    { nameSuffix: 'وجبة عائلية كبيرة', desc: 'وجبة عائلية للمشاركة الكبيرة', mult: 6.0 },
  ],
};

function computeIntRange(midpoint: number) {
  return {
    min: Math.max(0, Math.floor(midpoint * 0.95)),
    max: Math.ceil(midpoint * 1.05),
  };
}

function computeDecimalRange(midpoint: number) {
  return {
    min: Math.max(0, Number((midpoint * 0.95).toFixed(2))),
    max: Number((midpoint * 1.05).toFixed(2)),
  };
}

async function seed() {
  console.log('⚙️  [Seeding] Starting database seeding of 500+ Egyptian foods...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Remove existing seeded/verified foods to prevent duplicate keys on lower(name) GIN indices
    console.log('🧹 [Seeding] Cleaning up previous seeded food records...');
    await client.query("DELETE FROM foods WHERE source = 'manual' OR verified = true");

    let count = 0;
    const SQL = `
      INSERT INTO foods (
        name, name_en, barcode, category, serving_desc, source, verified,
        calories_min, calories_max,
        protein_min_g, protein_max_g,
        carbs_min_g, carbs_max_g,
        fat_min_g, fat_max_g
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    for (const base of BASE_FOODS) {
      const configurations = PORTIONS_CONFIG[base.portionsType];
      for (const config of configurations) {
        const name = `${base.name} - ${config.nameSuffix}`;
        const nameEn = base.name_en ? `${base.name_en} (${config.nameSuffix})` : null;

        const calMid = Math.round(base.baseCals * config.mult);
        const protMid = Number((base.baseProt * config.mult).toFixed(2));
        const carbMid = Number((base.baseCarbs * config.mult).toFixed(2));
        const fatMid = Number((base.baseFat * config.mult).toFixed(2));

        const calRange = computeIntRange(calMid);
        const protRange = computeDecimalRange(protMid);
        const carbRange = computeDecimalRange(carbMid);
        const fatRange = computeDecimalRange(fatMid);

        await client.query(SQL, [
          name,
          nameEn,
          null, // barcode
          base.category,
          config.desc,
          'manual', // source
          true,     // verified
          calRange.min,
          calRange.max,
          protRange.min,
          protRange.max,
          carbRange.min,
          carbRange.max,
          fatRange.min,
          fatRange.max,
        ]);

        count++;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ [Seeding] Success! Seeded ${count} unique food items (84 base dishes scaled to 7 sizes each) into database.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Seeding] Seeding transaction failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ [Seeding] Uncaught error during seeding:', err);
  process.exit(1);
});
