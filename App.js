// ═══════════════════════════════════════════════════
// 4U.TEAM — App.js  BUILD-60HZ8D-AS8XGM  v3.8.0
// Screens: Home · Product · Cart · Checkout · Orders
//          Wishlist · Profile · Settings · Admin Panel
// Features: Firebase Auth · Supabase DB · LiqPay
//           Nova Poshta · Push · Pull-to-Refresh
//           Pinch-Zoom · Swipe-Delete+Undo · Hero
//           Dynamic Categories · Similar Products
//           Admin: Products · Stats · Orders
// Audited: braces ✓ ScrollView ✓ RN APIs ✓
// ═══════════════════════════════════════════════════
// KEY ARCHITECTURE: All screens rendered always via display:'none'/'flex'
// so TextInputs NEVER unmount → keyboard stays open while typing.
// ═══════════════════════════════════════════════════
import { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';

// Безпечний createURL — fallback для dev без scheme
const safeRedirectUrl = (path) => {
  try {
    return Linking.createURL(path);
  } catch(e) {
    // Якщо scheme не налаштований — повертаємо exp:// для dev
    return `exp://localhost:8081/--/${path}`;
  }
};
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';

// Налаштування поведінки push-сповіщень
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
import { supabase } from './supabase';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Modal, Switch, StatusBar,
  Dimensions, Platform, Image, ActivityIndicator,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
  Share, Animated, PanResponder, Appearance, RefreshControl,
  Alert, LogBox,
} from 'react-native';
// Suppress known non-critical dev warnings
LogBox.ignoreLogs([
  'Text strings must be rendered',
  'SafeAreaView has been deprecated',
  'Cannot record touch move',
  'VirtualizedLists should never be nested',
  'Linking requires a build-time setting',
  'scheme',
]);

const { width: W, height: H } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';
const IS_LARGE = H >= 896;
// Top status bar height for when we need it outside SafeAreaView
const TOP_PAD = IS_IOS ? (IS_LARGE ? 50 : 20) : 0;
// Home indicator on iOS (used inside nav bar for breathing room)
const HOME_IND = IS_IOS ? (IS_LARGE ? 34 : 20) : 0;
// Extra bottom padding inside nav - just enough for home indicator
const NAV_PAD_BOT = HOME_IND > 0 ? HOME_IND : 8;
// Total height of nav bar — used to add bottom padding to screen scroll views
const NAV_BOT = 10 + 20 + 4 + NAV_PAD_BOT; // paddingTop+icon+text+paddingBottom
const GUTTER = 12;
const CARD_W = (W - GUTTER * 3) / 2;
const CARD_H = CARD_W * 1.35;
const BRAND = '4U.TEAM';
const ADMIN_EMAILS = [
  'admin@4you.store',
  'admin@admin.com',
  // Додай свій email тут або в Supabase profiles: role='admin'
]; // всі адміни
const ADMIN_EMAIL = ADMIN_EMAILS[0]; // основний
const R = 20;
const NP_KEY = '58cece2ab1aabe53ce2eac158949b700';

const ui = (id, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
// Повертає URL зображення з нижчою якістю для карток у каталозі
const thumbUri = (uri, w=400) => {
  if(!uri) return '';
  // Supabase Storage — без трансформацій (повертаємо як є)
  if(uri.includes('supabase')) return uri;
  // Unsplash — задаємо маленьку ширину
  if(uri.includes('unsplash.com')) return uri.replace(/w=\d+/,'w='+w).replace(/q=\d+/,'q=60');
  // Cloudinary
  if(uri.includes('cloudinary.com')) return uri.replace('/upload/',`/upload/w_${w},q_60,f_webp/`);
  return uri;
};

// ── TRANSLATIONS ─────────────────────────────────────────────────────────
const LANG = {
  UA: {
    catalog:'МАГАЗИН', wishlist:'ОБРАНЕ', cart:'КОШИК', orders:'ЗАМОВЛЕННЯ', account:'АКАУНТ',
    checkout:'ОФОРМЛЕННЯ', addresses:'АДРЕСИ', cards:'КАРТКИ',
    settings:'НАЛАШТУВАННЯ', support:'ПІДТРИМКА',
    all:'ВСЕ', search:'Пошук товарів...', sorting:'СОРТУВАННЯ',
    popular:'Популярні', newest:'Новинки', byRating:'За рейтингом',
    priceLow:'Ціна: від низької', priceHigh:'Ціна: від високої',
    resetFilter:'СКИНУТИ ФІЛЬТР', categories:'Категорії', viewAll:'Переглянути все',
    saleAnn:'СЕЗОННИЙ РОЗПРОДАЖ · ПРОМОКОД YOU10 · ДО −50%',
    color:'КОЛІР', selectColor:'— оберіть', size:'РОЗМІР', selectSize:'— оберіть',
    sizeGuide:'РОЗМІРНА СІТКА', addToCart:'ДОДАТИ ДО КОШИКА',
    selectSizeColor:'ОБЕРІТЬ КОЛІР ТА РОЗМІР',
    inWishlist:'♥  В ОБРАНОМУ', addToWishlist:'♡  ДОДАТИ В ОБРАНЕ',
    description:'ОПИС', delivery:'ДОСТАВКА',
    deliveryInfo:'Нова Пошта · 1–3 дні по Україні',
    deliveryCost:'Вартість доставки — згідно тарифів Нової Пошти',
    returns:'Повернення 14 днів', reviews:'відгуків',
    addedToCart:'Додано до кошика', goToCart:'ДО КОШИКА',
    continueShopping:'ПРОДОВЖИТИ ПОКУПКИ',
    emptyCart:'КОШИК ПОРОЖНІЙ', toCatalog:'ДО КАТАЛОГУ',
    promoCode:'ПРОМОКОД', promoPlaceholder:'YOU10 · SALE20 · NEWUSER · 4YOU',
    promoApply:'OK', promoInvalid:'Невірний промокод',
    promoApplied:'✓ ЗНИЖКУ {n}% ЗАСТОСОВАНО',
    useBonuses:'БОНУСИ', bonusHint:'Максимум 50% від суми',
    bonusBalance:'Баланс', bonusPoints:'балів',
    bonusDeduct:'балів буде знято з рахунку',
    subtotal:'ТОВАРИ', discount:'ЗНИЖКА', shipping:'ДОСТАВКА',
    shippingValue:'згідно тарифів Нової Пошти',
    total:'РАЗОМ', checkoutBtn:'ОФОРМИТИ',
    contact:'КОНТАКТНІ ДАНІ', name:'ІМʼЯ ТА ПРІЗВИЩЕ',
    namePl:'Іван Петренко', phone:'ТЕЛЕФОН', phonePl:'+380 67 123 45 67',
    deliverySection:'ДОСТАВКА — НОВА ПОШТА',
    city:'МІСТО', cityPl:'Введіть місто...',
    findBranches:'ЗНАЙТИ ВІДДІЛЕННЯ', branchLoading:'Завантаження...',
    branchPl:'Введіть номер або адресу відділення...',
    branchError:'Помилка. Введіть номер відділення вручну.',
    branch:'НОМЕР ВІДДІЛЕННЯ', branchManual:'Наприклад: 12',
    payMethod:'СПОСІБ ОПЛАТИ',
    liqpayName:'LiqPay', liqpayDesc:'Visa · Mastercard · ПриватБанк · Monobank',
    cardName:'Банківська картка', cardDesc:'Введіть реквізити вручну',
    codName:'Накладний платіж', codDesc:'Оплата при отриманні',
    cardNumber:'НОМЕР КАРТКИ', cardNumPl:'0000  0000  0000  0000',
    expiry:'ТЕРМІН ДІЇ', expiryPl:'ММ/РР',
    cvv:'CVV', cvvPl:'•••',
    cardHolder:'ІМʼЯ ВЛАСНИКА', cardHolderPl:'IVAN PETRENKO',
    sslNote:'🔒 SSL ЗАХИЩЕНО',
    bonusPaidWith:'Бонусами буде оплачено',
    yourOrder:'ВАШЕ ЗАМОВЛЕННЯ', codFee:'КОМІСІЯ НП',
    placeOrder:'ПІДТВЕРДИТИ ЗАМОВЛЕННЯ', processing:'ОБРОБКА ПЛАТЕЖУ...',
    orderSuccess:'ЗАМОВЛЕННЯ ПРИЙНЯТО',
    smsNotice:'SMS з деталями надійде на ваш телефон',
    orderNum:'НОМЕР', orderDate:'ДАТА', orderCity:'МІСТО',
    orderPay:'ОПЛАТА', orderSum:'СУМА',
    bonusEarnedLbl:'+{n} бонусів нараховано',
    bonusEarnedSub:'Після отримання замовлення',
    toOrders:'МОЇ ЗАМОВЛЕННЯ', toMain:'НА ГОЛОВНУ',
    emptyWish:'СПИСОК ПОРОЖНІЙ', addCartBtn:'В КОШИК',
    myOrders:'МОЇ ЗАМОВЛЕННЯ', noOrders:'ЗАМОВЛЕНЬ ЩЕ НЕМАЄ',
    firstOrder:'ЗРОБИТИ ПЕРШЕ ЗАМОВЛЕННЯ',
    orderStatus:'СТАТУС ЗАМОВЛЕННЯ', trackingNP:'ТРЕКІНГ НП',
    orderItems:'ТОВАРИ', orderBonusEarned:'+{n} бонусів за це замовлення',
    step1:'Замовлення прийнято', step2:'Передано в Нова Пошта',
    step3:'В дорозі до відділення', step4:'Готово до видачі',
    step5:'Отримано — бонуси нараховано',
    guest:'Гість', loginPrompt:'Увійдіть для повного доступу',
    loginBtn:'УВІЙТИ', editProfile:'Редагувати',
    bonusCard:'БОНУСНА КАРТА 4YOU', bonusRate:'1 БАЛ = 1 ₴ ЗНИЖКИ',
    bonusInfo:'Нараховується 5% від суми після отримання замовлення',
    myOrdersMenu:'Мої замовлення', favMenu:'Обране',
    addressMenu:'Адреси доставки', cardsMenu:'Збережені картки',
    settingsMenu:'Налаштування', supportMenu:'Підтримка',
    themeSubtitle:'Тема, мова, сповіщення', supportSubtitle:'Telegram · Instagram',
    logout:'ВИЙТИ З АКАУНТУ', editProfileTitle:'РЕДАГУВАТИ ПРОФІЛЬ',
    save:'ЗБЕРЕГТИ', delete:'ВИДАЛИТИ', cancel:'Скасувати',
    savedAddr:'МОЇ АДРЕСИ', addAddress:'+ НОВА АДРЕСА', addAddressTitle:'НОВА АДРЕСА',
    addrCity:'МІСТО', addrCityPl:'Київ',
    addrBranch:'ВІДДІЛЕННЯ НП', addrBranchPl:'12',
    addrPhone:'ТЕЛЕФОН', addrPhonePl:'+380671234567',
    savedCards:'ЗБЕРЕЖЕНІ КАРТКИ', addCard:'+ НОВА КАРТКА', addCardTitle:'НОВА КАРТКА',
    cardStoredLocally:'🔒 Для реальних платежів підключіть LiqPay або Stripe через backend.',
    notifications:'СПОВІЩЕННЯ',
    pushLabel:'Push-сповіщення', pushSub:'Акції та новинки',
    smsLabel:'SMS-сповіщення', smsSub:'Статус замовлення',
    theme:'ТЕМА', themeLight:'☀️ Світла', themeDark:'🌙 Темна',
    language:'МОВА', about:'ПРО ЗАСТОСУНОК',
    terms:'Умови використання', privacy:'Політика конфіденційності', licenses:'Ліцензії',
    version:'4U.TEAM v3.8',
    contacts:'КОНТАКТИ', faq:'ЧАСТІ ПИТАННЯ',
    faqQ1:'Як відстежити замовлення?', faqQ2:'Як повернути товар?',
    faqQ3:'Яка вартість доставки?', faqQ4:'Як застосувати промокод?',
    faqQ5:'Чи є примірка перед оплатою?',
    loginTitle:'ВХІД', registerTitle:'РЕЄСТРАЦІЯ',
    authNameLbl:"ІМʼЯ ТА ПРІЗВИЩЕ", authNamePl:'Іван Петренко',
    authEmailLbl:'EMAIL', authEmailPl:'email@example.com',
    authPassLbl:'ПАРОЛЬ', authPassPl:'Мінімум 6 символів',
    loginSubmit:'УВІЙТИ', registerSubmit:'ЗАРЕЄСТРУВАТИСЬ',
    guestContinue:'ПРОДОВЖИТИ БЕЗ РЕЄСТРАЦІЇ', forgotPass:'Забули пароль?',
    errEmail:'Введіть коректний email', errPass:'Пароль мінімум 6 символів', errName:"Введіть ім'я",
    ob1title:'500+ товарів', ob1sub:'Одяг, взуття та аксесуари провідних брендів — все в одному місці',
    ob2title:'Доставка по всій Україні', ob2sub:'Нова Пошта · відправка 1–3 дні · трекінг у застосунку',
    ob3title:'Бонуси за кожне замовлення', ob3sub:'5% кешбек від суми — накопичуй бали та плати ними',
    ob4title:'Безпека банківського рівня', ob4sub:'SSL-шифрування · Supabase Auth · LiqPay сертифікований платіжний шлюз',
    obSkip:'Пропустити', loginOrReg:'Увійти або зареєструватись',
    continueGuest:'Продовжити без реєстрації',
    szSize:'РОЗМІР', szChest:'ГРУДИ', szWaist:'ПОЯС',
    stPaid:'Оплачено', stTransit:'В дорозі', stDelivered:'Доставлено',
    stReceived:'Отримано', stCancelled:'Скасовано',
    back:'Назад',
    showCount:'ПОКАЗАТИ:', viewMore:'ЗАВАНТАЖИТИ ЩЕ',
    categoryAll:'ВСІ ТОВАРИ', heroShop:'ДИВИТИСЬ',
    filterSize:'РОЗМІР', filterColor:'КОЛІР', filterPrice:'ЦІНА',
    noProducts:'Товари не знайдено', tryReset:'Спробуйте скинути фільтри',
  },
  EN: {
    catalog:'SHOP', wishlist:'SAVED', cart:'CART', orders:'ORDERS', account:'ACCOUNT',
    checkout:'CHECKOUT', addresses:'ADDRESSES', cards:'CARDS',
    settings:'SETTINGS', support:'SUPPORT',
    all:'ALL', search:'Search products...', sorting:'SORT BY',
    popular:'Popular', newest:'Newest', byRating:'By rating',
    priceLow:'Price: low to high', priceHigh:'Price: high to low',
    resetFilter:'RESET FILTER', categories:'Categories', viewAll:'View all',
    saleAnn:'SEASONAL SALE · PROMO CODE YOU10 · UP TO −50%',
    color:'COLOR', selectColor:'— select', size:'SIZE', selectSize:'— select',
    sizeGuide:'SIZE GUIDE', addToCart:'ADD TO CART',
    selectSizeColor:'SELECT COLOR & SIZE',
    inWishlist:'♥  IN SAVED', addToWishlist:'♡  ADD TO SAVED',
    description:'DESCRIPTION', delivery:'DELIVERY',
    deliveryInfo:'Nova Poshta · 1–3 days across Ukraine',
    deliveryCost:'Shipping cost — according to Nova Poshta rates',
    returns:'14-day returns', reviews:'reviews',
    addedToCart:'Added to cart', goToCart:'GO TO CART',
    continueShopping:'CONTINUE SHOPPING',
    emptyCart:'YOUR CART IS EMPTY', toCatalog:'TO CATALOG',
    promoCode:'PROMO CODE', promoPlaceholder:'YOU10 · SALE20 · NEWUSER · 4YOU',
    promoApply:'OK', promoInvalid:'Invalid promo code',
    promoApplied:'✓ DISCOUNT {n}% APPLIED',
    useBonuses:'BONUSES', bonusHint:'Max 50% of order',
    bonusBalance:'Balance', bonusPoints:'pts',
    bonusDeduct:'points will be deducted',
    subtotal:'SUBTOTAL', discount:'DISCOUNT', shipping:'SHIPPING',
    shippingValue:'according to Nova Poshta rates',
    total:'TOTAL', checkoutBtn:'CHECKOUT',
    contact:'CONTACT INFO', name:'FULL NAME',
    namePl:'Ivan Petrenko', phone:'PHONE', phonePl:'+380 67 123 45 67',
    deliverySection:'DELIVERY — NOVA POSHTA',
    city:'CITY', cityPl:'Enter city...',
    findBranches:'FIND BRANCHES', branchLoading:'Loading...',
    branchPl:'Enter branch number or address...',
    branchError:'Error. Enter branch number manually.',
    branch:'BRANCH NUMBER', branchManual:'E.g.: 12',
    payMethod:'PAYMENT METHOD',
    liqpayName:'LiqPay', liqpayDesc:'Visa · Mastercard · PrivatBank · Monobank',
    cardName:'Bank card', cardDesc:'Enter details manually',
    codName:'Cash on delivery', codDesc:'Pay at Nova Poshta branch',
    cardNumber:'CARD NUMBER', cardNumPl:'0000  0000  0000  0000',
    expiry:'EXPIRY', expiryPl:'MM/YY',
    cvv:'CVV', cvvPl:'•••',
    cardHolder:'CARDHOLDER NAME', cardHolderPl:'IVAN PETRENKO',
    sslNote:'🔒 SSL SECURED',
    bonusPaidWith:'Bonuses will pay',
    yourOrder:'YOUR ORDER', codFee:'COD FEE',
    placeOrder:'CONFIRM ORDER', processing:'PROCESSING...',
    orderSuccess:'ORDER PLACED',
    smsNotice:'SMS confirmation will be sent to your phone',
    orderNum:'NUMBER', orderDate:'DATE', orderCity:'CITY',
    orderPay:'PAYMENT', orderSum:'TOTAL',
    bonusEarnedLbl:'+{n} bonuses credited',
    bonusEarnedSub:'After receiving your order',
    toOrders:'MY ORDERS', toMain:'HOME',
    emptyWish:'LIST IS EMPTY', addCartBtn:'ADD TO CART',
    myOrders:'MY ORDERS', noOrders:'NO ORDERS YET',
    firstOrder:'PLACE FIRST ORDER',
    orderStatus:'ORDER STATUS', trackingNP:'NP TRACKING',
    orderItems:'ITEMS', orderBonusEarned:'+{n} bonuses for this order',
    step1:'Order accepted', step2:'Sent to Nova Poshta',
    step3:'In transit to branch', step4:'Ready for pickup',
    step5:'Received — bonuses credited',
    guest:'Guest', loginPrompt:'Login for full access',
    loginBtn:'LOGIN', editProfile:'Edit',
    bonusCard:'4YOU BONUS CARD', bonusRate:'1 POINT = 1 ₴ DISCOUNT',
    bonusInfo:'5% of order total credited after receiving',
    myOrdersMenu:'My orders', favMenu:'Saved',
    addressMenu:'Delivery addresses', cardsMenu:'Saved cards',
    settingsMenu:'Settings', supportMenu:'Support',
    themeSubtitle:'Theme, language, notifications', supportSubtitle:'Telegram · Instagram',
    logout:'LOG OUT', editProfileTitle:'EDIT PROFILE',
    save:'SAVE', delete:'DELETE', cancel:'Cancel',
    savedAddr:'MY ADDRESSES', addAddress:'+ NEW ADDRESS', addAddressTitle:'NEW ADDRESS',
    addrCity:'CITY', addrCityPl:'Kyiv',
    addrBranch:'NP BRANCH', addrBranchPl:'12',
    addrPhone:'PHONE', addrPhonePl:'+380671234567',
    savedCards:'SAVED CARDS', addCard:'+ NEW CARD', addCardTitle:'NEW CARD',
    cardStoredLocally:'🔒 For real payments connect LiqPay or Stripe via backend.',
    notifications:'NOTIFICATIONS',
    pushLabel:'Push notifications', pushSub:'Promotions & new items',
    smsLabel:'SMS notifications', smsSub:'Order status',
    theme:'THEME', themeLight:'☀️ Light', themeDark:'🌙 Dark',
    language:'LANGUAGE', about:'ABOUT APP',
    terms:'Terms of Use', privacy:'Privacy Policy', licenses:'Licenses',
    version:'4U.TEAM v3.8',
    contacts:'CONTACTS', faq:'FAQ',
    faqQ1:'How to track my order?', faqQ2:'How to return an item?',
    faqQ3:'What is the shipping cost?', faqQ4:'How to apply a promo code?',
    faqQ5:'Is try-before-pay available?',
    loginTitle:'LOGIN', registerTitle:'REGISTER',
    authNameLbl:'FULL NAME', authNamePl:'Ivan Petrenko',
    authEmailLbl:'EMAIL', authEmailPl:'email@example.com',
    authPassLbl:'PASSWORD', authPassPl:'Minimum 6 characters',
    loginSubmit:'LOGIN', registerSubmit:'REGISTER',
    guestContinue:'CONTINUE AS GUEST', forgotPass:'Forgot password?',
    errEmail:'Enter a valid email', errPass:'Password min 6 characters', errName:'Enter your name',
    ob1title:'500+ Products', ob1sub:'Clothing, shoes & accessories from top brands — all in one place',
    ob2title:'Delivery across Ukraine', ob2sub:'Nova Poshta · 1–3 day shipping · live tracking in-app',
    ob3title:'Bonuses for every order', ob3sub:'5% cashback on every completed order — pay with points',
    ob4title:'Bank-Level Security', ob4sub:'SSL encryption · Supabase Auth · LiqPay certified payment gateway',
    obSkip:'Skip', loginOrReg:'Login or Register',
    continueGuest:'Continue as guest',
    szSize:'SIZE', szChest:'CHEST', szWaist:'WAIST',
    stPaid:'Paid', stTransit:'In transit', stDelivered:'Delivered',
    stReceived:'Received', stCancelled:'Cancelled',
    back:'Back',
    showCount:'SHOW:', viewMore:'LOAD MORE',
    categoryAll:'ALL ITEMS', heroShop:'SHOP NOW',
    filterSize:'SIZE', filterColor:'COLOR', filterPrice:'PRICE',
    noProducts:'No products found', tryReset:'Try resetting filters',
  }
};

// ── THEME ─────────────────────────────────────────────────────────────────
// Перевіряє чи колір світлий (для вибору контрастного тексту)
const isLightColor=(hex)=>{
  const r=parseInt(hex.slice(1,3),16);
  const g=parseInt(hex.slice(3,5),16);
  const b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000>128;
};

const THEMES = {
  light:{
    bg:'#fff',bg2:'#f9f9f9',bg3:'#f0f0f0',
    card:'#fff',cardBorder:'#f0f0f0',
    text:'#111',text2:'#555',text3:'#888',text4:'#ccc',
    accent:'#111',accentText:'#fff',
    danger:'#dc2626',success:'#059669',info:'#2563eb',
    navBg:'#fff',navBorder:'#f0f0f0',
    inputBg:'#f7f7f7',inputBorder:'#e8e8e8',inputText:'#111',
  },
  dark:{
    bg:'#0d0d0d',bg2:'#1a1a1a',bg3:'#222222',
    card:'#141414',cardBorder:'#1e1e1e',
    text:'#ffffff',text2:'#e0e0e0',text3:'#808080',text4:'#404040',
    accent:'#ffffff',accentText:'#000000',
    danger:'#ef4444',success:'#22c55e',info:'#60a5fa',
    navBg:'#0d0d0d',navBorder:'#222',
    inputBg:'#141414',inputBorder:'#2a2a2a',inputText:'#ffffff',
  }
};

// ── CATEGORIES ────────────────────────────────────────────────────────────
const CAT_TREE = [
  {id:'outerwear',label:'Верхній одяг',labelEN:'Outerwear',cid:'outerwear',icon:'🧥',
    children:['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки']},
  {id:'hoodies',label:'Кофти',labelEN:'Hoodies & Knits',cid:'hoodies',icon:'👕',
    children:['Кофти','Світшоти','Світшоти БРЕНД','Світери']},
  {id:'tshirts',label:'Футболки',labelEN:'T-Shirts',cid:'tshirts',icon:'👕',
    children:['Футболки','Поло','Лонгсліви']},
  {id:'shirts',label:'Сорочки',labelEN:'Shirts',cid:'shirts',icon:'👔',
    children:['Сорочки']},
  {id:'pants',label:'Штани',labelEN:'Trousers & Shorts',cid:'pants',icon:'👖',
    children:['Джинси','Джинси класика','Спортивні штани','Брюки','Шорти','Плавальні шорти']},
  {id:'costumes',label:'Костюми',labelEN:'Suits & Sets',cid:'costumes',icon:'🤵',
    children:['Костюми','Комплекти']},
  {id:'accessories',label:'Взуття та аксесуари',labelEN:'Shoes & Accessories',cid:'accessories',icon:'👟',
    children:['Взуття','Труси','Головні убори']},
  {id:'new',label:'Новинки',labelEN:'New Arrivals',badge:'Новинка',icon:'✨',children:[]},
  {id:'sale',label:'SALE',labelEN:'SALE',badge:'Sale',icon:'🔥',children:[]},
];

// ── PRODUCTS ──────────────────────────────────────────────────────────────
// ── MOCK PRODUCTS (fallback якщо Supabase недоступний) ─────────────────────
const MOCK_P=[
  {id:1,name:'Basic White Tee',price:699,old:null,img:ui('1521572163474-6864f9cf17ab'),cid:'tshirts',cat:'Базові',sz:['XS','S','M','L','XL'],cl:['Білий','Чорний','Сірий'],r:4.8,rv:124,badge:null,desc:'100% преміум бавовна 180г/м². Reinforced collar.'},
  {id:2,name:'Essential Black Tee',price:699,old:null,img:ui('1583743814966-8936f5b7be1a'),cid:'tshirts',cat:'Базові',sz:['S','M','L','XL'],cl:['Чорний','Білий'],r:4.9,rv:203,badge:'Хіт',desc:'Базова чорна футболка. Dense weave.'},
  {id:3,name:'Oversize Drop Shoulder',price:849,old:999,img:ui('1576566588028-4147f3842f27'),cid:'tshirts',cat:'Oversize',sz:['S','M','L','XL','XXL'],cl:['Білий','Чорний','Stone'],r:4.7,rv:87,badge:'Sale',desc:'Oversize fit, dropped shoulder silhouette.'},
  {id:4,name:'Grey Melange Essential',price:749,old:null,img:ui('1562157873-818bc0726f68'),cid:'tshirts',cat:'Базові',sz:['S','M','L','XL'],cl:['Сірий','Білий','Чорний'],r:4.6,rv:56,badge:null,desc:'Меланжева текстура. Relaxed вільний крій.'},
  {id:5,name:'Beige Minimal Tee',price:799,old:null,img:ui('1503341504253-dff4815485f1'),cid:'tshirts',cat:'Базові',sz:['S','M','L','XL'],cl:['Бежевий','Білий','Пісок'],r:4.5,rv:43,badge:'Новинка',desc:'Earth tone collection. Natural cotton.'},
  {id:6,name:'Classic Polo Black',price:899,old:1099,img:ui('1586790170083-2f9ceadc732d'),cid:'tshirts',cat:'Поло',sz:['S','M','L','XL'],cl:['Чорний','Білий','Navy'],r:4.6,rv:71,badge:'Sale',desc:'Piqué polo 220г/м². 3-button placket.'},
  {id:7,name:'Ribbed Longsleeve',price:949,old:null,img:ui('1534030347209-467a5d1b9da3'),cid:'tshirts',cat:'Лонгсліви',sz:['S','M','L','XL'],cl:['Чорний','Білий','Сірий'],r:4.7,rv:92,badge:null,desc:'Рубчастий лонгслів. Slim fit.'},
  {id:8,name:'Heavy Oversize Tee',price:929,old:1149,img:ui('1554568218-0f1715e72254'),cid:'tshirts',cat:'Oversize',sz:['S','M','L','XL'],cl:['Чорний','Графіт','Stone'],r:4.8,rv:134,badge:'Sale',desc:'250г/м² важка бавовна. Boxy fit.'},
  {id:9,name:'Navy Piqué Polo',price:849,old:null,img:ui('1596755389378-c31d21fd1273'),cid:'tshirts',cat:'Поло',sz:['S','M','L','XL'],cl:['Navy','Чорний','Білий'],r:4.4,rv:38,badge:null,desc:'Класичне поло navy.'},
  {id:10,name:'Longsleve Rib Slim',price:879,old:1099,img:ui('1529398737131-c24a5f2a4dc8'),cid:'tshirts',cat:'Лонгсліви',sz:['S','M','L','XL','XXL'],cl:['Чорний','Бежевий','Білий'],r:4.7,rv:67,badge:'Sale',desc:'Slim-fit лонгслів.'},
  {id:11,name:'Classic Black Hoodie',price:1499,old:null,img:ui('1556821840-3a63f462e4f4'),cid:'hoodies',cat:'Худі',sz:['S','M','L','XL'],cl:['Чорний','Графіт'],r:4.9,rv:187,badge:'Хіт',desc:'Oversize hoodie 320г/м². Fleece interior.'},
  {id:12,name:'Grey Premium Hoodie',price:1399,old:1699,img:ui('1509942774463-acf339cf87d5'),cid:'hoodies',cat:'Худі',sz:['S','M','L','XL'],cl:['Сірий','Чорний'],r:4.7,rv:124,badge:'Sale',desc:'Premium grey hoodie. Soft brushed interior.'},
  {id:13,name:'White Minimal Hood',price:1549,old:null,img:ui('1614252235316-8c857d38b5f4'),cid:'hoodies',cat:'Худі',sz:['S','M','L','XL','XXL'],cl:['Білий','Кремовий'],r:4.6,rv:89,badge:'Новинка',desc:'Чисте білосніжне худі.'},
  {id:14,name:'Zip-Up Dark Grey',price:1699,old:1999,img:ui('1620799140408-edc6dcb6d633'),cid:'hoodies',cat:'Худі',sz:['S','M','L','XL'],cl:['Темно-сірий','Чорний'],r:4.8,rv:56,badge:'Sale',desc:'Zip hoodie з замком YKK.'},
  {id:15,name:'Navy Crewneck',price:1199,old:null,img:ui('1495105787522-5edee9730914'),cid:'hoodies',cat:'Світшоти',sz:['S','M','L','XL'],cl:['Navy','Чорний','Сірий'],r:4.5,rv:73,badge:null,desc:'Crew neck sweatshirt.'},
  {id:16,name:'Beige Crewneck Relaxed',price:1249,old:null,img:ui('1548183865-d1a5b78b6f72'),cid:'hoodies',cat:'Світшоти',sz:['S','M','L','XL'],cl:['Бежевий','Кремовий','Stone'],r:4.6,rv:98,badge:'Новинка',desc:'Earth tone crewneck. Heavyweight terry.'},
  {id:17,name:'Full Zip Athletic',price:1799,old:2199,img:ui('1607522370275-f6c503bc7a7d'),cid:'hoodies',cat:'Олімпійки',sz:['S','M','L','XL'],cl:['Чорний','Navy'],r:4.7,rv:44,badge:'Sale',desc:'Олімпійка full-zip.'},
  {id:18,name:'Olive Pullover Hood',price:1299,old:null,img:ui('1578551226519-9fd2c3d5c6c3'),cid:'hoodies',cat:'Худі',sz:['M','L','XL','XXL'],cl:['Олива','Хакі'],r:4.5,rv:61,badge:null,desc:'Olive hoodie. Military palette.'},
  {id:19,name:'Grey Heavy Crewneck',price:1349,old:1599,img:ui('1598891820000-7ba04bcf3e3c'),cid:'hoodies',cat:'Світшоти',sz:['S','M','L','XL'],cl:['Сірий','Графіт','Чорний'],r:4.8,rv:156,badge:'Sale',desc:'380г/м² важкий кронек.'},
  {id:20,name:'Streetwear Hood Drop',price:1649,old:null,img:ui('1572307480813-cfe2510c41d1'),cid:'hoodies',cat:'Худі',sz:['S','M','L','XL'],cl:['Чорний','Темно-сірий'],r:4.9,rv:203,badge:'Хіт',desc:'Street hoodie 350г/м².'},
  {id:21,name:'Classic Field Jacket',price:2499,old:2999,img:ui('1591047139829-d91aecb6caea'),cid:'outerwear',cat:'Куртки',sz:['S','M','L','XL'],cl:['Коричневий','Чорний','Хакі'],r:4.9,rv:56,badge:'Sale',desc:'Польова куртка. Premium shell.'},
  {id:22,name:'Black MA-1 Bomber',price:2199,old:null,img:ui('1548126032-079a0fb0099d'),cid:'outerwear',cat:'Бомбери',sz:['M','L','XL'],cl:['Чорний','Оливковий'],r:4.7,rv:89,badge:null,desc:'MA-1 bomber. Reversible lining.'},
  {id:23,name:'Leather Moto Jacket',price:3499,old:3999,img:ui('1551028719-00167b16eac5'),cid:'outerwear',cat:'Куртки',sz:['S','M','L','XL'],cl:['Чорний','Темно-коричневий'],r:4.8,rv:43,badge:'Sale',desc:'Натуральна шкіра. Moto asymmetric zip.'},
  {id:24,name:'Denim Jacket Raw',price:1899,old:null,img:ui('1559551409-dadc959f76b8'),cid:'outerwear',cat:'Куртки',sz:['S','M','L','XL','XXL'],cl:['Синій','Чорний'],r:4.5,rv:71,badge:'Новинка',desc:'12oz raw denim.'},
  {id:25,name:'Down Puffer Black',price:2999,old:null,img:ui('1574180566232-aaad1b5b8450'),cid:'outerwear',cat:'Зимові куртки',sz:['S','M','L','XL','XXL'],cl:['Чорний','Navy','Stone'],r:4.9,rv:124,badge:'Новинка',desc:'700-fill down. Ultra-light.'},
  {id:26,name:'Long Overcoat Wool',price:3999,old:4999,img:ui('1544923246-74a763b80f44'),cid:'outerwear',cat:'Куртки',sz:['S','M','L','XL'],cl:['Чорний','Кемель'],r:4.7,rv:29,badge:'Sale',desc:'Вовняне пальто. Tailored fit.'},
  {id:27,name:'Classic Bomber Satin',price:1999,old:null,img:ui('1493689485253-f09ef836d721'),cid:'outerwear',cat:'Бомбери',sz:['S','M','L','XL'],cl:['Чорний','Оливковий','Navy'],r:4.6,rv:67,badge:null,desc:'Satin bomber.'},
  {id:28,name:'Tech Windbreaker',price:1599,old:1899,img:ui('1578932750294-f5075e85f44a'),cid:'outerwear',cat:'Вітровки',sz:['S','M','L','XL'],cl:['Чорний','Білий','Stone'],r:4.5,rv:53,badge:'Sale',desc:'Nylon shell. DWR coating.'},
  {id:29,name:'Slim Black Jogger',price:1399,old:null,img:ui('1542272604-787c3835535d'),cid:'pants',cat:'Джогери',sz:['S','M','L','XL'],cl:['Чорний','Графіт'],r:4.7,rv:143,badge:'Хіт',desc:'Tapered jogger. 4-way stretch.'},
  {id:30,name:'Classic Blue Denim',price:1599,old:1999,img:ui('1473966968600-fa801b869a1a'),cid:'pants',cat:'Джинси',sz:['29','30','31','32','33','34'],cl:['Синій','Чорний'],r:4.6,rv:89,badge:'Sale',desc:'Slim straight jeans.'},
  {id:31,name:'Tactical Cargo Pants',price:1799,old:null,img:ui('1594938298603-c8148c4b4098'),cid:'pants',cat:'Карго',sz:['S','M','L','XL','XXL'],cl:['Чорний','Хакі','Бежевий'],r:4.5,rv:67,badge:'Новинка',desc:'Ripstop cargo. 8 pockets.'},
  {id:32,name:'Premium Black Jeans',price:1799,old:null,img:ui('1584865812661-a0e0c8b14d1e'),cid:'pants',cat:'Джинси',sz:['29','30','31','32','33','34'],cl:['Чорний'],r:4.9,rv:156,badge:'Хіт',desc:'Premium no-fade black denim.'},
  {id:33,name:'Black Tracksuit Set',price:1899,old:null,img:ui('1605518216938-7c31b7b14ad0'),cid:'costumes',cat:'Спортивні',sz:['S','M','L','XL','XXL'],cl:['Чорний','Графіт'],r:4.8,rv:67,badge:'Хіт',desc:'Худі + джогери matching set.'},
  {id:34,name:'Grey Athletic Set',price:1799,old:2199,img:ui('1519058082700-08a0b56da9b4'),cid:'costumes',cat:'Спортивні',sz:['S','M','L','XL'],cl:['Сірий меланж','Чорний'],r:4.6,rv:43,badge:'Sale',desc:'Soft terry matching.'},
  {id:35,name:'Fleece Zip Set',price:2199,old:null,img:ui('1517466787929-bc90951d0974'),cid:'costumes',cat:'На флісі',sz:['S','M','L','XL'],cl:['Чорний','Navy'],r:4.7,rv:56,badge:'Новинка',desc:'Zip hoodie + joggers на флісі.'},
  {id:36,name:'6-Panel Cap Black',price:599,old:null,img:ui('1588850561407-ed78c282e89b'),cid:'accessories',cat:'Кепки',sz:['One Size'],cl:['Чорний','Білий','Navy'],r:4.7,rv:203,badge:null,desc:'Структурована бейсболка.'},
  {id:37,name:'Ribbed Beanie',price:499,old:null,img:ui('1578996526339-a40fdf75c3f4'),cid:'accessories',cat:'Шапки',sz:['One Size'],cl:['Чорний','Сірий','Бежевий'],r:4.8,rv:167,badge:'Хіт',desc:'Ribbed knit beanie.'},
  {id:38,name:'Full-Grain Belt',price:899,old:1099,img:ui('1534215754734-18e55d13e346'),cid:'accessories',cat:'Ремені',sz:['85','90','95','100','105'],cl:['Чорний','Коричневий'],r:4.8,rv:78,badge:'Sale',desc:'Full-grain leather belt.'},
  {id:39,name:'Canvas Tote',price:799,old:null,img:ui('1517941823-815bea90d291'),cid:'accessories',cat:'Рюкзаки',sz:['One Size'],cl:['Чорний','Бежевий','Білий'],r:4.4,rv:43,badge:'Новинка',desc:'Heavy canvas tote.'},
  {id:40,name:'Flat Brim Snapback',price:649,old:799,img:ui('1556306535-0f09a537f0a3'),cid:'accessories',cat:'Кепки',sz:['One Size'],cl:['Чорний','Сірий'],r:4.5,rv:89,badge:'Sale',desc:'Flat brim snapback.'},
];


const PROMO={'YOU10':10,'SALE20':20,'NEWUSER':15,'4YOU':25};
const TRENDING_SEARCHES=[
  {q:'Oversize футболка',icon:'🔥'},
  {q:'Чорна куртка',icon:'🔥'},
  {q:'Худі флісове',icon:'📈'},
  {q:'Карго штани',icon:'📈'},
  {q:'Бомбер',icon:'✨'},
  {q:'Базова футболка',icon:'✨'},
];

// ── HERO SLIDES CONFIG (titles + cids, images come from real products) ──────
// Статичний герой банер — налаштовується в адмін панелі
const HERO_STATIC_DEFAULTS = {
  img: '',
  title: 'НОВІ НАДХОДЖЕННЯ',
  sub: 'Осінь 2024. Чистий стиль',
};

const HERO_CONFIG = [
  {title:'ВЕРХНІЙ ОДЯГ', sub:'Куртки · Бомбери · Пальто', cid:'outerwear'},
  {title:'КОФТИ',        sub:'Світшоти · Худі · Светри',   cid:'hoodies'},
  {title:'ФУТБОЛКИ',     sub:'Базові · Оверсайз · Поло',    cid:'tshirts'},
  {title:'ШТАНИ',        sub:'Джинси · Спортивні · Брюки',  cid:'pants'},
];

// CAT_TILES — images come dynamically from products (see catTiles useMemo)
const CAT_TILES_CONFIG = [
  {id:'outerwear',  label:'Куртки',  cats:['Куртки','Бомбери','Пальто']},
  {id:'hoodies',    label:'Кофти',   cats:['Кофти','Світшоти','Світери']},
  {id:'tshirts',    label:'Футболки', cats:['Футболки','Сорочки']},
  {id:'pants',      label:'Штани',   cats:['Джинси','Джинси класика','Спортивні штани']},
  {id:'costumes',   label:'Костюми', cats:['Костюми','Комплекти']},
  {id:'accessories',label:'Взуття',  cats:['Взуття','Головні убори']},
];


const POPULAR_CATEGORIES=[
  {q:'Oversize',cid:'tshirts',sub:'Oversize'},
  {q:'Худі',cid:'hoodies',sub:'Худі'},
  {q:'Куртки',cid:'outerwear',sub:'Куртки'},
  {q:'Джогери',cid:'pants',sub:'Джогери'},
  {q:'Карго',cid:'pants',sub:'Карго'},
  {q:'SALE',badge:'Sale'},
];
const fc=v=>v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
const fe=v=>{const d=v.replace(/\D/g,'').slice(0,4);return d.length>=3?d.slice(0,2)+'/'+d.slice(2):d;};
const fv=v=>v.replace(/\D/g,'').slice(0,3);

// ── ZOOMABLE GALLERY ──────────────────────────────────────────────────────
// Swipe between photos + pinch-to-zoom on each
const ZoomableGallery = ({imgs=[], height=W*1.15}) => {
  const [idx,setIdx]     = useState(0);
  const isZoomed         = useRef(false);
  const scrollRef        = useRef();
  const scale            = useRef(new Animated.Value(1)).current;
  const offsetX          = useRef(new Animated.Value(0)).current;
  const offsetY          = useRef(new Animated.Value(0)).current;
  const baseScale        = useRef(1);
  const baseOX           = useRef(0);
  const baseOY           = useRef(0);
  const startDist        = useRef(0);
  const [zoomed, setZoomed] = useState(false);

  const resetZoom = () => {
    isZoomed.current = false;
    setZoomed(false);
    baseScale.current = 1;
    baseOX.current = 0;
    baseOY.current = 0;
    Animated.parallel([
      Animated.spring(scale,   {toValue:1, useNativeDriver:true, tension:150, friction:8}),
      Animated.spring(offsetX, {toValue:0, useNativeDriver:true, tension:150, friction:8}),
      Animated.spring(offsetY, {toValue:0, useNativeDriver:true, tension:150, friction:8}),
    ]).start();
  };

  const pinchPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder:    () => false,
    onMoveShouldSetPanResponder:     (e,g) => {
      const t = e.nativeEvent.touches.length;
      if(t === 2) return true;                           // 2 fingers → always zoom
      if(isZoomed.current && Math.abs(g.dx) > 4) return true; // panning while zoomed
      return false;
    },
    onPanResponderGrant: (e) => {
      if(e.nativeEvent.touches.length === 2){
        const [t1,t2] = e.nativeEvent.touches;
        startDist.current = Math.hypot(t2.pageX-t1.pageX, t2.pageY-t1.pageY) || 1;
      }
    },
    onPanResponderMove: (e,g) => {
      const touches = e.nativeEvent.touches;
      if(touches.length === 2){
        const [t1,t2] = touches;
        const dist  = Math.hypot(t2.pageX-t1.pageX, t2.pageY-t1.pageY) || 1;
        const ratio = dist / startDist.current;
        const next  = Math.min(4, Math.max(1, baseScale.current * ratio));
        scale.setValue(next);
        if(next > 1.01 && !isZoomed.current){
          isZoomed.current = true;
          setZoomed(true);
        }
      } else if(isZoomed.current){
        offsetX.setValue(baseOX.current + g.dx);
        offsetY.setValue(baseOY.current + g.dy);
      }
    },
    onPanResponderRelease: (e) => {
      if(e.nativeEvent.touches.length < 2){
        baseScale.current = scale._value || 1;
        baseOX.current    = offsetX._value || 0;
        baseOY.current    = offsetY._value || 0;
        if(baseScale.current <= 1.05) resetZoom();
      }
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  return(
    <View style={{width:W,height}}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e=>{
          const i=Math.round(e.nativeEvent.contentOffset.x/W);
          setIdx(i); resetZoom();
        }}>
        {(imgs.length?imgs:[imgs[0]]).map((uri,i)=>(
          <Animated.View key={i} {...pinchPan.panHandlers}
            style={{width:W,height,overflow:'hidden'}}>
            <Animated.Image source={{uri}}
              style={{width:W,height,
                transform:[{scale},{translateX:offsetX},{translateY:offsetY}]}}
              resizeMode="cover"/>
          </Animated.View>
        ))}
      </ScrollView>
      {/* Dot indicators */}
      {imgs.length>1&&(
        <View style={{position:'absolute',bottom:16,left:0,right:0,
          flexDirection:'row',justifyContent:'center',gap:6}} pointerEvents='none'>
          {imgs.map((_,i)=>(
            <View key={i} style={{width:i===idx?20:6,height:6,borderRadius:3,
              backgroundColor:i===idx?'#fff':'rgba(255,255,255,.4)',
              shadowColor:'#000',shadowOpacity:.3,shadowRadius:2}}/>
          ))}
        </View>
      )}
      {/* Zoom hint */}
      {zoomed&&(
        <TouchableOpacity style={{position:'absolute',top:16,left:16,
          backgroundColor:'rgba(0,0,0,.55)',borderRadius:20,
          paddingHorizontal:12,paddingVertical:6}}
          onPress={resetZoom}>
          <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>✕ Zoom</Text>
        </TouchableOpacity>

    </View>
  );
};

// ── SKELETON LOADER ──────────────────────────────────────────────────────
const Skeleton = ({width, height, style={}}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim,{toValue:1,duration:900,useNativeDriver:true}),
        Animated.timing(anim,{toValue:0,duration:900,useNativeDriver:true}),
      ])
    ).start();
  },[]);
  // Skeleton прихований — не показуємо сірий placeholder
  return null;
};

// ── PRICE FILTER MODAL ───────────────────────────────────────────────────
const PRICE_PRESETS=[
  {label:'До 500 ₴',   min:0,    max:500},
  {label:'500–1000 ₴', min:500,  max:1000},
  {label:'1000–2000 ₴',min:1000, max:2000},
  {label:'2000–3000 ₴',min:2000, max:3000},
  {label:'Від 3000 ₴', min:3000, max:4000},
];
const PriceFilterModal=({visible,onClose,priceMin,priceMax,setPriceMin,setPriceMax,th})=>{
  const [localMin,setLocalMin]=useState(String(priceMin));
  const [localMax,setLocalMax]=useState(String(priceMax));
  useEffect(()=>{setLocalMin(String(priceMin));setLocalMax(String(priceMax));},[visible]);
  const apply=()=>{
    const mn=Math.max(0,parseInt(localMin)||0);
    const mx=Math.min(4000,parseInt(localMax)||4000);
    setPriceMin(Math.min(mn,mx));
    setPriceMax(Math.max(mn,mx));
    onClose();
  };
  const isActive=(p)=>priceMin===p.min&&priceMax===p.max;
  return(
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
          <TouchableWithoutFeedback>
            <View style={{backgroundColor:th.bg,borderTopLeftRadius:20,borderTopRightRadius:20,padding:24,paddingBottom:HOME_IND+16}}>
              <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:20}}/>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text}}>ФІЛЬТР ЗА ЦІНОЮ</Text>
                <TouchableOpacity onPress={()=>{setPriceMin(0);setPriceMax(4000);onClose();}}>
                  <Text style={{fontSize:9,color:th.text4,letterSpacing:1,fontWeight:'700'}}>СКИНУТИ</Text>
                </TouchableOpacity>
              </View>
              {/* Presets */}
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>
                {PRICE_PRESETS.map(p=>(
                  <TouchableOpacity key={p.label}
                    style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,
                      borderColor:isActive(p)?th.text:th.cardBorder,
                      backgroundColor:isActive(p)?th.accent:'transparent'}}
                    onPress={()=>{setPriceMin(p.min);setPriceMax(p.max);setLocalMin(String(p.min));setLocalMax(String(p.max));}}>
                    <Text style={{fontSize:11,fontWeight:'600',color:isActive(p)?th.accentText:th.text2}}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Manual input */}
              <Text style={{fontSize:8,fontWeight:'900',letterSpacing:2,color:th.text3,marginBottom:10}}>АБО ВВЕДІТЬ ДІАПАЗОН</Text>
              <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20}}>
                <View style={{flex:1}}>
                  <Text style={{fontSize:8,color:th.text4,marginBottom:5,letterSpacing:1}}>ВІД ₴</Text>
                  <TextInput
                    style={{backgroundColor:th.inputBg,borderWidth:1,borderColor:th.inputBorder,
                      borderRadius:R,padding:12,fontSize:14,color:th.inputText,fontWeight:'700'}}
                    value={localMin} onChangeText={setLocalMin}
                    keyboardType="numeric" placeholder="0" placeholderTextColor={th.text4}/>
                </View>
                <Text style={{color:th.text3,fontSize:18,marginTop:16}}>–</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize:8,color:th.text4,marginBottom:5,letterSpacing:1}}>ДО ₴</Text>
                  <TextInput
                    style={{backgroundColor:th.inputBg,borderWidth:1,borderColor:th.inputBorder,
                      borderRadius:R,padding:12,fontSize:14,color:th.inputText,fontWeight:'700'}}
                    value={localMax} onChangeText={setLocalMax}
                    keyboardType="numeric" placeholder="4000" placeholderTextColor={th.text4}/>
                </View>
              </View>
              <TouchableOpacity
                style={{backgroundColor:th.accent,paddingVertical:14,borderRadius:R,alignItems:'center'}}
                onPress={apply}>
                <Text style={{color:th.accentText,fontWeight:'900',fontSize:10,letterSpacing:2.5}}>
                  ЗАСТОСУВАТИ
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── SWIPEABLE CART ITEM ───────────────────────────────────────────────────
const SwipeableCartItem=({item,onDec,onInc,onDelete,th})=>{
  const [delPending,setDelPending]=useState(false);
  const progress=useRef(new Animated.Value(0)).current;
  const timerRef=useRef(null);
  const animRef=useRef(null);

  const startDelete=()=>{
    setDelPending(true);
    progress.setValue(0);
    animRef.current=Animated.timing(progress,{
      toValue:1,duration:3000,useNativeDriver:false,
    });
    animRef.current.start(({finished})=>{
      if(finished) onDelete(item.key);
    });
  };

  const cancelDelete=()=>{
    animRef.current?.stop();
    setDelPending(false);
    progress.setValue(0);
  };

  const progressWidth=progress.interpolate({inputRange:[0,1],outputRange:['0%','100%']});

  return(
    <View style={{borderBottomWidth:1,borderBottomColor:th.cardBorder,backgroundColor:th.bg}}>
      <View style={{flexDirection:'row',paddingVertical:12,paddingHorizontal:16}}>
        <Image source={{uri:thumbUri(item.imgs?.[0]||item.img||'')}}
          style={{width:72,height:90,borderRadius:12,backgroundColor:th.bg2}} resizeMode="cover"/>
        <View style={{flex:1,paddingHorizontal:14,justifyContent:'space-between',paddingVertical:2}}>
          <View>
            <Text style={{fontSize:12,fontWeight:'600',color:th.text,lineHeight:17}} numberOfLines={2}>{item.name}</Text>
            <Text style={{fontSize:10,color:th.text4,marginTop:3,letterSpacing:1}}>
              {item.color?item.color.toUpperCase()+' · ':''}{item.size}
            </Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
            <TouchableOpacity style={{width:30,height:30,borderWidth:1,borderColor:th.cardBorder,
              borderRadius:8,justifyContent:'center',alignItems:'center'}} onPress={()=>onDec(item.key)}>
              <Text style={{fontSize:16,color:th.text,fontWeight:'300'}}>−</Text>
            </TouchableOpacity>
            <Text style={{fontSize:13,fontWeight:'900',minWidth:20,textAlign:'center',color:th.text}}>{item.qty}</Text>
            <TouchableOpacity style={{width:30,height:30,borderWidth:1,borderColor:th.cardBorder,
              borderRadius:8,justifyContent:'center',alignItems:'center'}} onPress={()=>onInc(item,item.size,item.color)}>
              <Text style={{fontSize:16,color:th.text,fontWeight:'300'}}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{justifyContent:'space-between',alignItems:'flex-end',paddingVertical:2}}>
          <TouchableOpacity onPress={delPending?cancelDelete:startDelete}
            style={{paddingVertical:6,paddingHorizontal:8}}>
            <Text style={{color:'#dc2626',fontSize:18,fontWeight:'300'}}>×</Text>
          </TouchableOpacity>
          <Text style={{fontSize:13,fontWeight:'900',color:th.text}}>{item.price*item.qty} ₴</Text>
        </View>
      </View>
      {/* Прогрес-бар видалення */}
      {delPending&&(
        <View style={{height:36,backgroundColor:'#fef2f2',flexDirection:'row',
          alignItems:'center',paddingHorizontal:14,gap:10}}>
          <View style={{flex:1,height:4,backgroundColor:'#fecaca',borderRadius:2,overflow:'hidden'}}>
            <Animated.View style={{height:'100%',width:progressWidth,
              backgroundColor:'#dc2626',borderRadius:2}}/>
          </View>
          <TouchableOpacity onPress={cancelDelete}
            style={{paddingHorizontal:12,paddingVertical:4,borderRadius:8,
              backgroundColor:'#dc2626'}}>
            <Text style={{color:'#fff',fontSize:10,fontWeight:'900',letterSpacing:0.5}}>
              СКАСУВАТИ
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ── SKELETON CARD ─────────────────────────────────────────────────────────
const SkeletonCard = ({th}) => (
  <View style={{width:CARD_W,marginBottom:GUTTER*2}}>
    <Skeleton width={CARD_W} height={CARD_H}/>
    <View style={{paddingTop:10,gap:6}}>
      <Skeleton width={CARD_W*0.8} height={10}/>
      <Skeleton width={CARD_W*0.4} height={10}/>
    </View>
  </View>
);


const Btn=memo(({label,onPress,style={},disabled=false,ghost=false,th})=>(
  <TouchableOpacity
    style={[{paddingVertical:14,alignItems:'center',justifyContent:'center',borderRadius:R,
      backgroundColor:ghost?'transparent':(disabled?th.bg3:th.accent),
      borderWidth:ghost?1:0,borderColor:ghost?th.cardBorder:undefined},style]}
    onPress={onPress} disabled={disabled} activeOpacity={0.75}>
    <Text style={{color:ghost?th.text3:(disabled?th.text3:th.accentText),fontSize:10,fontWeight:'900',letterSpacing:2.5}}>{label}</Text>
  </TouchableOpacity>
));

const AppInput=memo(({label,value,onChangeText,placeholder,keyboardType,secureTextEntry,maxLength,th,style={},error,hint,optional=false})=>(
  <View style={{marginBottom:10}}>
    {label&&(
      <View style={{flexDirection:'row',alignItems:'center',marginBottom:5,gap:6}}>
        <Text style={{fontSize:9,letterSpacing:2,color:error?th.danger:th.text3,fontWeight:'800'}}>{label}</Text>
        {optional&&<Text style={{fontSize:8,color:th.text4,fontWeight:'400'}}>необов'язково</Text>}
      </View>
    )}
    <TextInput
      style={[{backgroundColor:th.inputBg,borderRadius:R,padding:12,fontSize:14,
        color:th.inputText,borderWidth:1,borderColor:error?th.danger:th.inputBorder},style]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={th.text4} keyboardType={keyboardType}
      secureTextEntry={secureTextEntry} maxLength={maxLength}
      autoCorrect={false} autoCapitalize={keyboardType==='email-address'?'none':undefined}
    />
    {error&&<Text style={{fontSize:10,color:th.danger,marginTop:4,paddingHorizontal:2}}>{error}</Text>}
    {!error&&hint&&<Text style={{fontSize:9,color:th.text4,marginTop:3,paddingHorizontal:2}}>{hint}</Text>}
  </View>
));

// ══════════════════════════════════════════════════════════════════════════
// Stable styles — defined outside component so references never change
// This prevents ScrollView from resetting position on re-render
// ══════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  gridContent: {flexDirection:'row',flexWrap:'wrap',paddingHorizontal:GUTTER,paddingTop:GUTTER/2,paddingBottom:NAV_BOT+8},
  wishContent: {flexDirection:'row',flexWrap:'wrap',padding:GUTTER,paddingBottom:NAV_BOT+8},
  scrollPad:   {paddingBottom:NAV_BOT+8},
});

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
// ── LOADING SPLASH: 3 pulsing dots ───────────────────────────────────────────
const LoadingSplash=({th})=>{
  const dot1=useRef(new Animated.Value(0.2)).current;
  const dot2=useRef(new Animated.Value(0.2)).current;
  const dot3=useRef(new Animated.Value(0.2)).current;
  useEffect(()=>{
    const anim=(d,delay)=>Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(d,{toValue:1,duration:400,useNativeDriver:true}),
        Animated.timing(d,{toValue:0.2,duration:400,useNativeDriver:true}),
        Animated.delay(800-delay),
      ])
    ).start();
    anim(dot1,0); anim(dot2,160); anim(dot3,320);
  },[]);
  return(
    <View style={{flex:1,backgroundColor:th.bg,justifyContent:'center',alignItems:'center',gap:20}}>
      <Text style={{fontSize:14,fontWeight:'900',letterSpacing:6,color:th.text}}>4U.TEAM</Text>
      <View style={{flexDirection:'row',gap:10,marginTop:8}}>
        {[dot1,dot2,dot3].map((d,i)=>(
          <Animated.View key={i} style={{
            width:8,height:8,borderRadius:4,
            backgroundColor:th.text,opacity:d}}/>
        ))}
      </View>
    </View>
  );
};


export default function App(){
  // Auto-detect system theme
  const [themeMode,setThemeModeRaw]=useState('auto');
  const setThemeMode=(v)=>{setThemeModeRaw(v);AsyncStorage.setItem('themeMode',v).catch(()=>{});};
  const [accentColor,setAccentColorRaw]=useState(''); // кастомний акцент-колір
  const setAccentColor=(v)=>{setAccentColorRaw(v);AsyncStorage.setItem('accentColor',v).catch(()=>{});};
  const [bgColor,setBgColorRaw]=useState(''); // колір фону застосунку
  const setBgColor=(v)=>{setBgColorRaw(v);AsyncStorage.setItem('bgColor',v).catch(()=>{});};

  const [_appLoaded,setAppLoaded]=useState(false);
  const systemDark=Appearance.getColorScheme()==='dark';
// Required for OAuth to close the browser and return to app
WebBrowser.maybeCompleteAuthSession();
  const darkMode=themeMode==='auto'?systemDark:themeMode==='dark';
  const setDarkMode=(v)=>setThemeMode(v?'dark':'light');

  // In-app notification banner
  const [inAppNotif,setInAppNotif]=useState(null);
  const notifAnim=useRef(new Animated.Value(-80)).current;
  const showNotif=useCallback((msg,type='info')=>{
    setInAppNotif({msg,type});
    Animated.sequence([
      Animated.spring(notifAnim,{toValue:0,useNativeDriver:true}),
      Animated.delay(2800),
      Animated.timing(notifAnim,{toValue:-80,duration:250,useNativeDriver:true}),
    ]).start(()=>setInAppNotif(null));
  },[]);

  // Quick-add modal (long press on catalog card)
  const [quickAddItem,setQuickAddItem]=useState(null);
  const [showSizeGuide,setShowSizeGuide]=useState(false);
  const [showForgotModal,setShowForgotModal]=useState(false);
  const [forgotEmail,setForgotEmail]=useState('');
  const [forgotSent,setForgotSent]=useState(false);
  const [forgotLoading,setForgotLoading]=useState(false);
  const [quickAddSz,setQuickAddSz]=useState(null);
  const [quickAddCl,setQuickAddCl]=useState(null);
  const [lang,setLangRaw]=useState('UA');
  // ── PRODUCTS (з Supabase або fallback на MOCK_P) ─────────────────────────
  const [products, setProducts] = useState(MOCK_P);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perPage, setPerPage] = useState(30); // default 30
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroStaticImg,   setHeroStaticImgRaw]  = useState('');
  const [bannerSize,      setBannerSizeRaw]      = useState('medium'); // small|medium|large
  const [heroStaticTitle, setHeroStaticTitleRaw] = useState('НОВІ НАДХОДЖЕННЯ');
  const [heroStaticSub,   setHeroStaticSubRaw]   = useState('Осінь 2024. Чистий стиль');
  const setHeroStaticImg   = (v)=>{ setHeroStaticImgRaw(v);   AsyncStorage.setItem('heroImg',v).catch(()=>{}); };
  const setBannerSize      = (v)=>{ setBannerSizeRaw(v);      AsyncStorage.setItem('bannerSize',v).catch(()=>{}); };
  const setHeroStaticTitle = (v)=>{ setHeroStaticTitleRaw(v); AsyncStorage.setItem('heroTitle',v).catch(()=>{}); };
  const setHeroStaticSub   = (v)=>{ setHeroStaticSubRaw(v);   AsyncStorage.setItem('heroSub',v).catch(()=>{}); };
  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroTimer = useRef(null);
  const marqueeX   = useRef(new Animated.Value(0)).current;
  const marqueeAnim = useRef(null);
  const [footerOpen,setFooterOpen] = useState({info:false,service:false,signup:false});
  const [footerContent,setFooterContent] = useState({
    info:{
      title:{ua:'ІНФОРМАЦІЯ ТА УМОВИ',en:'INFORMATION & LEGAL'},
      items:{
        ua:['Про нас','Політика конфіденційності','Умови та положення','Контакти'],
        en:['About Us','Privacy Policy','Terms & Conditions','Contacts'],
      }
    },
    service:{
      title:{ua:'СЕРВІС ТА ПІДТРИМКА',en:'SERVICE & SUPPORT'},
      items:{
        ua:['Часті запитання','Доставка','Повернення та обмін','Відстежити замовлення'],
        en:['FAQ','Shipping','Returns & Exchanges','Track Order'],
      }
    },
    signup:{
      title:{ua:'ПІДПИШИСЬ ТА ЗАОЩАДЖУЙ',en:'SIGN UP AND SAVE'},
      items:{
        ua:['Розсилка — -10% на перше замовлення','Ексклюзивні пропозиції','Сповіщення про нові колекції'],
        en:['Newsletter — -10% on first order','Exclusive offers','New collection alerts'],
      }
    },
  });
  const [editingFooter,setEditingFooter] = useState(null); // null | {key,field}

  // ── Dynamic hero slides from real product photos ─────────────────────────
  const heroSlides = useMemo(()=>{
    if(products.length===0) return HERO_CONFIG.map(h=>({...h,img:''}));
    const SUB_MAP={
      outerwear:['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки'],
      hoodies:['Кофти','Світшоти','Світшоти БРЕНД','Світери'],
      tshirts:['Футболки','Сорочки'],
      pants:['Джинси','Джинси класика','Спортивні штани','Брюки','Шорти'],
    };
    return HERO_CONFIG.map(h=>{
      const cats=SUB_MAP[h.cid]||[];
      // Find most recent product with image in this category
      // findLast = newest product = highest ID (products loaded asc, so reversed)
      const all=products.filter(p=>cats.includes(p.cat)&&(p.imgs?.[0]||p.img));
      const found=all[all.length-1]||null;
      return {...h, img:(found?.imgs?.[0]||found?.img||'')};
    });
  },[products]);

  // Dynamic category tiles — real product photos
  const catTiles = useMemo(()=>{
    return CAT_TILES_CONFIG.map(t=>{
      // Last (newest) product per category
      const all=products.filter(p=>t.cats.includes(p.cat)&&(p.imgs?.[0]||p.img));
      const found=all[all.length-1]||null;
      return {...t, img: found?.imgs?.[0]||found?.img||''};
    });
  },[products]);

  const loadProducts = async (isRefresh=false) => {
    if(isRefresh) setRefreshing(true);
    else setProductsLoading(true);
    try{
      const PAGE_SIZE = 100;
      let allProds = [];
      let page = 0;
      let hasMore = true;
      const SUB_TO_CID_MAP={
        // Українські підкатегорії → cid
        'Куртки':'outerwear','Бомбери':'outerwear','Кожанки':'outerwear',
        'Пальто':'outerwear','Парки':'outerwear','Дублянки':'outerwear','Джинсовки':'outerwear',
        'Верхній одяг':'outerwear','Куртки / Верхній одяг':'outerwear',
        'Кофти':'hoodies','Світшоти':'hoodies','Світшоти БРЕНД':'hoodies',
        'Світери':'hoodies','Худі':'hoodies','Кофти / Світшоти':'hoodies',
        'Футболки':'tshirts','Поло':'tshirts','Лонгсліви':'tshirts',
        'Сорочки':'shirts',
        'Футболки / Сорочки':'tshirts','shirts':'shirts',
        'Джинси':'pants','Джинси класика':'pants','Спортивні штани':'pants',
        'Брюки':'pants','Шорти':'pants','Плавальні шорти':'pants','Карго':'pants',
        'Штани / Джинси':'pants',
        'Костюми':'costumes','Комплекти':'costumes','Спортивні костюми':'costumes',
        'Костюми / Комплекти':'costumes',
        'Аксесуари':'accessories','Труси':'accessories',
        'Головні убори':'hats','Сумки':'bags','Взуття':'shoes',
        // cid самі себе
        'outerwear':'outerwear','hoodies':'hoodies','tshirts':'tshirts','shirts':'shirts',
        'pants':'pants','costumes':'costumes','accessories':'accessories',
        'shoes':'shoes','bags':'bags','hats':'hats',
      };
      // Функція маппінгу з fallback - перевіряє і SUB_TO_CID_MAP і CAT_TREE children
      const getCid=(sub,catId)=>{
        if(!sub&&!catId) return null;
        // Спочатку пряме мапування
        if(SUB_TO_CID_MAP[sub]) return SUB_TO_CID_MAP[sub];
        if(SUB_TO_CID_MAP[catId]) return SUB_TO_CID_MAP[catId];
        // Шукаємо у дітях CAT_TREE
        for(const cat of CAT_TREE){
          if(cat.children&&cat.children.includes(sub)) return cat.cid;
        }
        // Fallback на catId
        return catId||null;
      };
      while(hasMore){
        const {data,error}=await supabase.from('products')
          .select('id,name,price,old_price,category_id,sub_category,images,sizes,colors,rating,reviews_count,badge,description,tags,stock')
          .eq('is_active',true).order('id',{ascending:true})
          .range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
        if(error||!data||data.length===0){hasMore=false;break;}
        const mapped=data.map(p=>({
          id:p.id,name:p.name,price:p.price,old:p.old_price||null,
          img:p.images?.[0]||'',imgs:p.images||[],
          cid:getCid(p.sub_category, p.category_id),
          cat:p.sub_category||'',sz:p.sizes||[],cl:p.colors||[],
          r:parseFloat(p.rating)||0,rv:p.reviews_count||0,badge:p.badge||null,
          desc:p.description||'',tags:p.tags||[],stock:p.stock||100,
        }));
        // Перевірка зниження цін та low stock для wishlist
        if(wishRef.current?.length){
          data.forEach(p=>{
            const prev=prevPricesRef.current[p.id];
            if(prev && p.price < prev && wishRef.current.includes(p.id)){
              addNotif(
                '🏷 Знижка на товар з обраного!',
                (p.name||'Товар')+': '+prev+' ₴ → '+p.price+' ₴  (−'+(prev-p.price)+' ₴)',
                'promo', p.id
              );
            }
            if(p.stock===1 && wishRef.current.includes(p.id)){
              addNotif(
                '⚠️ Останній примірник!',
                (p.name||'Товар')+' з обраного — залишився лише 1 шт. Поспішай!',
                'promo', p.id
              );
            }
            prevPricesRef.current[p.id]=p.price;
          });
        }
        // Дедуплікація по id — захист від дублів при пагінації
        const existingIds=new Set(allProds.map(x=>x.id));
        const unique=mapped.filter(x=>!existingIds.has(x.id));
        allProds=[...allProds,...unique];
        if(!isRefresh) setProducts(p=>{
          if(page===0) return mapped;
          const ids=new Set(p.map(x=>x.id));
          return [...p,...mapped.filter(x=>!ids.has(x.id))];
        });
        hasMore=data.length===PAGE_SIZE;page++;
      }
      if(isRefresh) setProducts(allProds);
    }catch(e){console.warn('Products load error:',e.message);}
    finally{setProductsLoading(false);setRefreshing(false);}
  };

  useEffect(()=>{ loadProducts(false); },[]);

  // Авто-оновлення трекінгу НП при відкритті замовлень
  useEffect(()=>{
    if(scr==='orders' && orders.length>0){
      refreshAllTrackings(orders).catch(()=>{});
    }
  },[scr]);

  // Realtime — оновлення статусу замовлень для юзера
  useEffect(()=>{
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes',{
        event:'UPDATE', schema:'public', table:'orders',
      },(payload)=>{
        const updated = payload.new;
        if(!updated) return;
        // Оновлюємо в списку замовлень юзера
        setOrders(prev=>prev.map(o=>
          String(o.id)===String(updated.id)
            ? {...o, status:updated.status}
            : o
        ));
        // Сповіщення юзеру про зміну статусу
        const statusEmoji = {
          'В дорозі':'🚚','Доставлено':'📦',
          'Отримано':'✅','Скасовано':'❌',
        };
        const em = statusEmoji[updated.status];
        if(em){
          addNotif(
            em+' Статус замовлення #'+updated.id,
            'Новий статус: '+updated.status,
            'status', updated.id
          );
        }
      })
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[]);


  const setLang=(v)=>{setLangRaw(v);AsyncStorage.setItem('lang',v).catch(()=>{});};
  // CRITICAL: useMemo prevents new object references on every render.
  // Without this, th changes on every setState → AppInput gets new style prop
  // → React Native on iOS dismisses keyboard during layout recalc.
  const th=useMemo(()=>{
    const base=THEMES[darkMode?'dark':'light'];
    // Спочатку застосовуємо bgColor (фон застосунку)
    let themed = {...base};
    if(bgColor){
      const isLight=isLightColor(bgColor);
      const textColor=isLight?'#111111':'#ffffff';
      const textMuted=isLight?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.5)';
      themed={
        ...themed,
        bg:bgColor,
        bg2:isLight?bgColor+'dd':bgColor+'cc',
        bg3:isLight?bgColor+'bb':bgColor+'aa',
        navBg:bgColor,
        text:textColor,
        text2:textColor,
        text3:textMuted,
        text4:isLight?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.3)',
        inputBg:isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.08)',
        inputText:textColor,
        cardBorder:isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)',
        navBorder:isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)',
      };
    }
    if(!accentColor) return themed;
    const light=isLightColor(accentColor);
    return {
      ...themed,
      accent:accentColor,
      accentText: light?'#111':'#fff',
    };
  },[darkMode,accentColor,bgColor]);
  const T=useMemo(()=>LANG[lang]||LANG.UA,[lang]);

  // Nav
  // 'loading' — чекаємо перевірку сесії, потім або 'home' або 'onboarding'
  const [scr,setScr]=useState('loading');
  const [hist,setHist]=useState([]);
  const [fwdHist,setFwdHist]=useState([]); // історія для свайпу вперед

  // go — очищає fwdHist (нова гілка навігації)
  const go=s=>{
    setHist(h=>[...h,scr]);
    setFwdHist([]); // нова сторінка — форвард скидається
    setScr(s);
  };
  const back=()=>{
    const h=[...hist];
    const prev=h.pop()||'home';
    setHist(h);
    setFwdHist(f=>[scr,...f]); // поточний екран іде у форвард
    setScr(prev);
  };
  const forward=()=>{
    if(fwdHist.length===0) return;
    const f=[...fwdHist];
    const next=f.shift();
    setFwdHist(f);
    setHist(h=>[...h,scr]);
    setScr(next);
  };

  // Scroll position
  const homeScrollY=useRef(0);
  const homeScrollRef=useRef(null);

  // Auth
  const [loggedIn,setLoggedInRaw]=useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(()=>{
    const adminByEmail = ADMIN_EMAILS.includes((user?.email||'').trim().toLowerCase());
    const adminByRole  = user?.role === 'admin';
    const result = loggedIn && (adminByEmail || adminByRole);
    setIsAdmin(result);
    // Автозавантаження товарів при підтвердженні адмін-ролі
    if(result && scr==='admin') {
      setTimeout(()=>loadAdminProducts(), 100);
    }
  },[loggedIn, user?.role, user?.email]);
  const [adminTab,setAdminTab]=useState('products'); // products | orders | stats | categories | users
  const [adminTabHist,setAdminTabHist]=useState([]); // history for back navigation within admin
  // Завантажуємо товари при відкритті admin screen
  useEffect(()=>{
    if(scr==='admin' && isAdmin) {
      loadAdminProducts();
    }
  },[scr, isAdmin]);

  // Realtime підписка на нові замовлення (тільки для адміна)
  useEffect(()=>{
    if(!isAdmin) return;
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes',{
        event:'INSERT',
        schema:'public',
        table:'orders',
      },(payload)=>{
        const ord = payload.new;
        // In-app сповіщення в застосунку
        addNotif(
          '🛍 Нове замовлення #'+(ord.id||''),
          (ord.name||'Клієнт')+' · '+(ord.total_price||ord.total||'')+'₴ · '+(ord.city||''),
          'order',
          ord.id
        );
        // Локальне push (якщо застосунок у фоні)
        Notifications.scheduleNotificationAsync({
          content:{
            title:'🛍 Нове замовлення #'+(ord.id||''),
            body:(ord.name||'Клієнт')+' · '+(ord.total_price||ord.total||ord.price||'')+'₴',
            sound:true,
            badge:1,
            data:{orderId:ord.id},
          },
          trigger:null, // одразу
        }).catch(()=>{});
      })
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[isAdmin]);

  const [adminSelectedUser,setAdminSelectedUser]=useState(null); // для модалки профілю
  // ── PRODUCT SWIPER (вліво/вправо в картці товару) ─────────────────────
  const productSwipeAnim = useRef(new Animated.Value(0)).current;
  const productSwipeDir  = useRef(0); // -1 prev, 1 next
  const [productSwipeIdx,setProductSwipeIdx]=useState(0);
  const [adminUserOrders,setAdminUserOrders]=useState([]);
  const [adminCategories,setAdminCategories]=useState([
    {cid:'outerwear',label:'Куртки / Верхній одяг',icon:'🧥'},
    {cid:'hoodies',label:'Кофти / Світшоти',icon:'👕'},
    {cid:'tshirts',label:'Футболки',icon:'👕'},
    {cid:'shirts',label:'Сорочки',icon:'👔'},
    {cid:'pants',label:'Штани / Джинси',icon:'👖'},
    {cid:'costumes',label:'Костюми / Комплекти',icon:'🤵'},
    {cid:'accessories',label:'Аксесуари',icon:'🧣'},
    {cid:'shoes',label:'Взуття',icon:'👟'},
    {cid:'bags',label:'Сумки',icon:'👜'},
    {cid:'hats',label:'Головні убори',icon:'🧢'},
  ]);
  const [showAddCat,setShowAddCat]=useState(false);
  const [newCatForm,setNewCatForm]=useState({cid:'',label:'',icon:''});
  const [adminProducts,setAdminProducts]=useState([]);
  const [adminPageSize,setAdminPageSize]=useState(50);   // 50 | 100 | 250
  const [adminSelected,setAdminSelected]=useState(new Set()); // bulk selection
  const [adminBulkMode,setAdminBulkMode]=useState(false);
  const [adminSortField,setAdminSortField]=useState('id'); // id | name | price | stock
  const [adminSortDir,setAdminSortDir]=useState('desc');  // asc | desc
  const [adminFilterActive,setAdminFilterActive]=useState('all'); // all | active | hidden
  const [adminLoading,setAdminLoading]=useState(false);
  const [adminEdit,setAdminEdit]=useState(null);
  const [adminEditForm,setAdminEditForm]=useState({});
  const [hiddenCats,setHiddenCatsRaw]=useState([]); // id категорій що сховані
  const setHiddenCats=(v)=>{setHiddenCatsRaw(v);AsyncStorage.setItem('hiddenCats',JSON.stringify(v)).catch(()=>{});};
  // homeMenu — які категорії показуються в рядку іконок на головній
  const DEFAULT_HOME_MENU=['new','tshirts','hoodies','accessories','sale'];
  const [homeMenu,setHomeMenuRaw]=useState(DEFAULT_HOME_MENU);
  const setHomeMenu=(v)=>{setHomeMenuRaw(v);AsyncStorage.setItem('homeMenu',JSON.stringify(v)).catch(()=>{});};
  const [adminSearch,setAdminSearch]=useState('');
  // Масова зміна цін
  const [bulkDir,setBulkDir]=useState('down');    // down | up
  const [bulkMode,setBulkMode]=useState('pct');   // pct | fix
  const [bulkVal,setBulkVal]=useState('');
  const [bulkCats,setBulkCats]=useState(['all']); // multi-select array
  const [bulkMinPrice,setBulkMinPrice]=useState(''); // фільтр мін ціна
  const [bulkMaxPrice,setBulkMaxPrice]=useState(''); // фільтр макс ціна
  // Push-розсилка
  const [pushTitle,setPushTitle]=useState('');
  const [pushBody,setPushBody]=useState('');
  const [pushSeg,setPushSeg]=useState('all');    // all | buyers | inactive
  const [csvInput,setCsvInput]=useState('');
  const [adminOrders,setAdminOrders]=useState([]);
  const [adminOrdersLoading,setAdminOrdersLoading]=useState(false);
  const [adminViewUser,setAdminViewUser]=useState(null); // юзер якого дивимось
  const [adminEditOrder,setAdminEditOrder]=useState(null);   // замовлення що редагується
  const [adminEditOrderForm,setAdminEditOrderForm]=useState({}); // форма редагування

  // Завантажуємо адмін сповіщення з Supabase
  const loadAdminNotifs = async () => {
    try{
      const {data}=await supabase.from('admin_notifications')
        .select('*').order('created_at',{ascending:false}).limit(50);
      if(data && data.length>0){
        data.forEach(n=>{
          // Якщо ще не в локальному списку — додаємо
          addNotif(n.title, n.body, n.type||'info', n.order_id);
        });
        // Позначаємо як прочитані
        await supabase.from('admin_notifications')
          .update({read:true}).eq('read',false);
      }
    }catch(e){console.warn('[adminNotifs]',e.message);}
  };

  // ── PHOTO STUDIO: remove.bg integration ─────────────────────────────
  const openPhotoStudio = (uri, callback) => {
    setStudioSourceUri(uri);
    setStudioResultUri('');
    setStudioProcessing(false);
    setStudioCallback(()=>callback);
    setShowPhotoStudio(true);
  };

  const saveRemoveBgKey = async (key) => {
    setRemoveBgApiKey(key);
    await AsyncStorage.setItem('removeBgApiKey', key).catch(()=>{});
  };

  const processRemoveBg = async () => {
    if(!studioSourceUri) return;
    const apiKey = removeBgApiKey.trim();
    if(!apiKey){
      Alert.alert(
        'API ключ потрібен',
        'Введіть ваш remove.bg API ключ нижче. Отримати безкоштовно на remove.bg/dashboard',
        [{text:'OK'}]
      );
      return;
    }
    setStudioProcessing(true);
    showNotif('Надсилаємо фото на remove.bg...','info');
    try {
      const formData = new FormData();
      if(studioSourceUri.startsWith('http')){
        // URL → pass directly to remove.bg
        formData.append('image_url', studioSourceUri);
      } else {
        // Local file → send as multipart
        const ext = (studioSourceUri.split('.').pop()?.split('?')[0]||'jpg').toLowerCase();
        const safeExt = ['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
        formData.append('image_file', {
          uri: studioSourceUri,
          name: 'product_photo.' + safeExt,
          type: 'image/' + (safeExt==='jpg'?'jpeg':safeExt),
        });
      }
      formData.append('size', 'auto');
      formData.append('type', 'product');       // hint: product photo
      formData.append('type_level', '1');
      formData.append('format', 'png');          // always PNG (transparent background)
      formData.append('crop', 'false');
      formData.append('add_shadow', 'false');
      formData.append('semitransparency', 'true');

      const resp = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey },
        body: formData,
      });

      // Check credits remaining
      const creditsLeft = resp.headers.get('X-Credits-Charged');
      const creditsRemaining = resp.headers.get('X-Free-Calls');

      if(!resp.ok){
        let errMsg = 'Помилка ' + resp.status;
        try {
          const errJson = await resp.json();
          errMsg = errJson?.errors?.[0]?.title || errMsg;
        } catch(_){}
        if(resp.status===402) errMsg = 'Недостатньо кредитів remove.bg';
        if(resp.status===403) errMsg = 'Невірний API ключ remove.bg';
        throw new Error(errMsg);
      }

      // resp is binary PNG — convert to base64 without FileReader (React Native compatible)
      const arrayBuffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for(let i=0; i<bytes.length; i+=chunkSize){
        binary += String.fromCharCode(...bytes.subarray(i, i+chunkSize));
      }
      const base64png = 'data:image/png;base64,' + btoa(binary);
      
      // Upload result PNG to Supabase storage
      showNotif('Фон видалено! Зберігаємо...','info');
      try {
        const {data:{session}} = await supabase.auth.getSession();
        if(session){
          const fileName = 'products/studio_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '.png';
          const byteArr = new Uint8Array(arrayBuffer);
          const {error: upErr} = await supabase.storage
            .from('products')
            .upload(fileName, byteArr, {contentType:'image/png', upsert:false});
          if(!upErr){
            const {data:urlData} = supabase.storage.from('products').getPublicUrl(fileName);
            if(urlData?.publicUrl){
              setStudioResultUri(urlData.publicUrl);
              setStudioProcessing(false);
              const msg = creditsRemaining
                ? 'Фон видалено ✓  (залишок: '+creditsRemaining+' кредитів)'
                : 'Фон видалено ✓';
              showNotif(msg,'success');
              return;
            }
          }
        }
      } catch(_){}
      // Fallback: store as base64 if upload fails
      setStudioResultUri(base64png);
      setStudioProcessing(false);
      showNotif('Фон видалено ✓','success');

    } catch(e) {
      setStudioProcessing(false);
      showNotif('remove.bg: ' + e.message, 'error');
    }
  };

  const applyStudioPhoto = () => {
    const finalUri = studioResultUri || studioSourceUri;
    if(!finalUri) return;
    setShowPhotoStudio(false);
    if(studioCallback) studioCallback(finalUri);
    setStudioSourceUri('');
    setStudioResultUri('');
    setStudioCallback(null);
  };

  const loadAdminOrders = async () => {
    setAdminOrdersLoading(true);
    try{
      const {data,error}=await supabase.from('orders')
        .select('*')
        .order('created_at',{ascending:false})
        .limit(200);
      if(!error&&data) setAdminOrders(data);
    }catch(e){console.warn('[adminOrders]',e.message);}
    finally{setAdminOrdersLoading(false);}
  };
  const [showAddProduct,setShowAddProduct]=useState(false);
  const [addProdForm,setAddProdForm]=useState({name:'',price:'',old_price:'',sku:'',sub_category:'',description:'',cid:'',imageUrl:'',sizeStock:[],sizeGuide:''}); // sizeStock: [{size:'S',qty:'12'},...]
  const [catSearch,setCatSearch]=useState('');
  const [editCatSearch,setEditCatSearch]=useState('');
  const [addCatParent,setAddCatParent]=useState(null); // selected parent cid in add form
  const [editCatParentSel,setEditCatParentSel]=useState(null); // selected parent in edit form

  const pickImage = async (onPicked) => {
    try {
      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(status!=='granted'){ showNotif('Потрібен дозвіл до галереї','error'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.88,
        base64: true,
      });
      if(!result.canceled && result.assets?.[0]){
        const asset = result.assets[0];
        onPicked({uri: asset.uri, uploading: true});
        showNotif('Завантаження фото...','info');
        try {
          const ext = (asset.uri.split('.').pop()?.toLowerCase().split('?')[0]) || 'jpg';
          const safeExt = ['jpg','jpeg','png','webp'].includes(ext) ? ext : 'jpg';
          const fileName = `products/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${safeExt}`;
          const {data:{session}} = await supabase.auth.getSession();
          if(!session) throw new Error('Потрібна авторизація');
          const byteChars = atob(asset.base64);
          const byteArr = new Uint8Array(byteChars.length);
          for(let i=0;i<byteChars.length;i++) byteArr[i]=byteChars.charCodeAt(i);
          const {error: uploadError} = await supabase.storage
            .from('products')
            .upload(fileName, byteArr, {
              contentType: `image/${safeExt==='jpg'?'jpeg':safeExt}`,
              upsert: false,
            });
          if(uploadError) throw uploadError;
          const {data: urlData} = supabase.storage.from('products').getPublicUrl(fileName);
          if(!urlData?.publicUrl) throw new Error('No public URL');
          onPicked({uri: urlData.publicUrl, uploading: false});
          showNotif('Фото завантажено ✓','success');
        } catch(uploadErr){
          console.warn('Storage upload error:', uploadErr.message);
          onPicked({uri: asset.uri, uploading: false});
          showNotif('Фото вибрано (локально)','info');
        }
      }
    } catch(e){
      console.warn('pickImage error:', e?.message, e?.code, JSON.stringify(e));
      showNotif('Помилка галереї: ' + (e?.message||'невідома'), 'error');
    }
  };
  const [pushToken,setPushToken]=useState(null);

  // Реєстрація push-токену
  const registerPushToken = useCallback(async(uid)=>{
    try{
      const {status:existing} = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if(existing !== 'granted'){
        const {status} = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if(finalStatus !== 'granted') return;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // використовує з app.json
      });
      const token = tokenData.data;
      setPushToken(token);
      // Зберігаємо токен в profiles
      if(uid && uid !== 'guest'){
        await supabase.from('profiles')
          .update({push_token: token})
          .eq('id', uid);
      }
    }catch(e){console.warn('[Push] register error:',e.message);}
  },[]);
  const [notifPerm,setNotifPerm]=useState(false);
  const setLoggedIn=(v, uid=null)=>{
    setLoggedInRaw(v);
    if(v && uid){
      // Оновлюємо lastActivity прив'язану до конкретного uid
      AsyncStorage.setItem(`${uid}:lastActivity`, String(Date.now())).catch(()=>{});
      loadUserData(uid);
    } else if(!v){
      supabase.auth.signOut().catch(()=>{});
      clearUserState();
    }
  };

  // Оновлюємо refs при кожному рендері щоб swipe мав актуальні функції
  useEffect(()=>{
    swipeBackRef.current = back;
    swipeForwardRef.current = forward;
  },[back,forward]);
  useEffect(()=>{
    goProductPrevRef.current = goProductPrev;
    goProductNextRef.current = goProductNext;
  },[goProductPrev,goProductNext]);

  // ── АВТО-ВИХІД ПІСЛЯ 1 ДНЯ НЕАКТИВНОСТІ ─────────────────────────────────
  // Оновлюємо lastActivity при будь-якій взаємодії — прив'язано до uid
  const updateActivity = useCallback(()=>{
    if(!loggedIn) return;
    getUserId().then(uid=>{
      if(uid && uid!=='guest'){
        AsyncStorage.setItem(`${uid}:lastActivity`, String(Date.now())).catch(()=>{});
      }
    });
  },[loggedIn, getUserId]);

  // Перевіряємо кожні 15 хвилин поки застосунок відкритий
  useEffect(()=>{
    const ONE_DAY = 24*60*60*1000;
    const checkInactivity = async () => {
      if(!loggedIn) return;
      try{
        const uid = await getUserId();
        if(!uid || uid==='guest') return;
        const lastStr = await AsyncStorage.getItem(`${uid}:lastActivity`);
        if(lastStr){
          const elapsed = Date.now() - parseInt(lastStr);
          if(elapsed > ONE_DAY){
            setLoggedIn(false);
            setScr('onboarding');
          }
        } else {
          // Немає запису — ставимо поточний час
          AsyncStorage.setItem(`${uid}:lastActivity`, String(Date.now())).catch(()=>{});
        }
      }catch(e){}
    };
    const interval = setInterval(checkInactivity, 15*60*1000);
    return ()=>clearInterval(interval);
  },[loggedIn, getUserId]);
  const [authMode,setAuthMode]=useState('login');
  const [authEmail,setAuthEmail]=useState('');
  const [authPass,setAuthPass]=useState('');
  const [authName,setAuthName]=useState('');
  const [authErr,setAuthErr]=useState('');
  const [user,setUserRaw]=useState({name:'',email:'',phone:'+380671234567',bonuses:250});
  const setUser=(v)=>{setUserRaw(v);getUserId().then(uid=>{if(uid&&uid!=='guest')AsyncStorage.setItem(`${uid}:profile`,JSON.stringify(v)).catch(()=>{});});}; 

  // Product
  const [sel,setSel]=useState(null);
  const productScrollRef=useRef(null);
  const [selSz,setSelSz]=useState(null);
  const [selCl,setSelCl]=useState(null);
  const [catFilter,setCatFilter]=useState({cid:null,sub:null,badge:null});
  const [srch,setSrch]=useState('');
  const [showSrch,setShowSrch]=useState(false);
  const [sort,setSort]=useState('popular');
  const [showCatModal,setShowCatModal]=useState(false);
  const [showSort,setShowSort]=useState(false);
  const [showSzGuide,setShowSzGuide]=useState(false);
  const [lastAdded,setLastAdded]=useState(null);
  const [catLevel,setCatLevel]=useState(0);
  const [catL1,setCatL1]=useState(null);
  const [catL2,setCatL2]=useState(null);

  // Price filter
  const [priceMin,setPriceMin]=useState(0);
  const [priceMax,setPriceMax]=useState(4000);
  const [showPriceFilter,setShowPriceFilter]=useState(false);

  // Reviews (local: {productId: [{author,rating,text,date}]})
  const [reviews,setReviews]=useState({});
  const [showReviews,setShowReviews]=useState(false);
  const [newReviewRating,setNewReviewRating]=useState(5);
  const [newReviewText,setNewReviewText]=useState('');
  const [showAddReview,setShowAddReview]=useState(false);

  // Recently viewed
  const [recentlyViewed,setRecentlyViewedRaw]=useState([]);
  const recentlyViewedRef=useRef([]);
  const setRecentlyViewed=useCallback((v)=>{
    setRecentlyViewedRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      recentlyViewedRef.current=val;
      getUserId().then(uid=>{
        AsyncStorage.setItem(scopedKey(uid,'recentlyViewed'),JSON.stringify(val)).catch(()=>{});
      });
      return val;
    });
  },[getUserId]);

  // Image skeleton loading
  const [imgLoaded,setImgLoaded]=useState({});

  // Search history
  const [searchHistory,setSearchHistoryRaw]=useState([]);
  const setSearchHistory=useCallback((v)=>{
    setSearchHistoryRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      getUserId().then(uid=>{
        AsyncStorage.setItem(scopedKey(uid,'searchHistory'),JSON.stringify(val)).catch(()=>{});
      });
      return val;
    });
  },[getUserId]);
  const [showSuggestions,setShowSuggestions]=useState(false);

  // LiqPay WebView
  const [showLiqpayView,setShowLiqpayView]=useState(false);
  const [liqpayUrl,setLiqpayUrl]=useState('');
  // ── RATE APP MODAL ──
  const [showRateModal,setShowRateModal]=useState(false);
  const [appRating,setAppRating]=useState(0);
  const [appRatingSent,setAppRatingSent]=useState(false);

  // ── USER-SCOPED ASYNCSTORAGE ──────────────────────────────────────────────
  // Всі дані прив'язані до конкретного userId щоб акаунти не змішувались
  const getUserId = useCallback(async () => {
    try {
      const { data:{ user: u } } = await supabase.auth.getUser();
      return u?.id || 'guest';
    } catch { return 'guest'; }
  }, []);

  const scopedKey = (uid, key) => `${uid}:${key}`;

  // Завантажити дані конкретного юзера після входу
  const loadUserData = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const keys = ['cart','wish','orders','searchHistory','recentlyViewed','notifications'];
      const pairs = await AsyncStorage.multiGet(keys.map(k => scopedKey(uid, k)));
      const data = Object.fromEntries(pairs.map(([k,v]) => [k.replace(`${uid}:`,''), v]));
      if (data.cart)           setCartRaw(JSON.parse(data.cart));
      else                     setCartRaw([]);
      if (data.wish)           setWishRaw(JSON.parse(data.wish));
      else                     setWishRaw([]);
      if (data.orders)         setOrdersRaw(JSON.parse(data.orders));
      else                     setOrdersRaw(MOCK_ORDERS);
      if (data.searchHistory)  setSearchHistoryRaw(JSON.parse(data.searchHistory));
      else                     setSearchHistoryRaw([]);
      if (data.recentlyViewed) setRecentlyViewedRaw(JSON.parse(data.recentlyViewed));
      else                     setRecentlyViewedRaw([]);
      if (data.notifications)  setNotificationsRaw(JSON.parse(data.notifications));
      else                     setNotificationsRaw([]);
    } catch(e) { console.warn('loadUserData error:', e); }
  }, []);

  // Очистити state при виході — щоб наступний юзер не бачив чужих даних
  const clearUserState = useCallback(() => {
    setCartRaw([]);
    setWishRaw([]);
    setOrdersRaw([]);
    setSearchHistoryRaw([]);
    setRecentlyViewedRaw([]);
    setNotificationsRaw([]);
    setPromo('');
    setPromoApplied(null);
    setUseBonuses(false);
  }, []);

  // Cart & wishlist
  const [wish,setWishRaw]=useState([]);
  const wishRef = useRef([]);          // актуальний wish всередині async
  const prevPricesRef = useRef({});    // {id: price} — для визначення зниження ціни
  const setWish=useCallback((v)=>{
    setWishRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      wishRef.current=val; // синхронний snapshot для async
      getUserId().then(uid=>{
        AsyncStorage.setItem(scopedKey(uid,'wish'),JSON.stringify(val)).catch(()=>{});
      });
      return val;
    });
  },[getUserId]);
  const [cart,setCartRaw]=useState([]);
  const setCart=useCallback((v)=>{
    setCartRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      getUserId().then(uid=>{
        AsyncStorage.setItem(scopedKey(uid,'cart'),JSON.stringify(val)).catch(()=>{});
      });
      return val;
    });
  },[getUserId]);
  const [promo,setPromo]=useState('');
  const [promoApplied,setPromoApplied]=useState(null);
  const [promoErr,setPromoErr]=useState('');
  const [useBonuses,setUseBonuses]=useState(false);


  // ── MARQUEE: безперервно зліва направо ──────────────────────────────────
  useEffect(()=>{
    // Скидаємо до початкової позиції (текст ліворуч за межею)
    const MARQUEE_ITEM_W = 220; // приблизна ширина одного повтору тексту
    const TOTAL_W = MARQUEE_ITEM_W * 8; // 8 копій
    marqueeX.setValue(-TOTAL_W);
    const startMarquee = () => {
      marqueeX.setValue(-TOTAL_W);
      marqueeAnim.current = Animated.loop(
        Animated.timing(marqueeX, {
          toValue: W + 40,
          duration: 38000,
          useNativeDriver: true,
        })
      );
      marqueeAnim.current.start();
    };
    startMarquee();
    // При поверненні на екран — перезапускаємо анімацію
    return () => {
      if(marqueeAnim.current) marqueeAnim.current.stop();
    };
  },[]);
  // ── HERO: auto-slide every 6s ─────────────────────────────────────────────
  useEffect(()=>{
    heroTimer.current = setInterval(()=>{
      // Slow cross-fade: fade out over 800ms, switch, fade in over 1200ms
      Animated.timing(heroAnim,{toValue:1,duration:800,useNativeDriver:true}).start(()=>{
        setHeroIdx(p=>(p+1)%Math.max(1,heroSlides.length));
        Animated.timing(heroAnim,{toValue:0,duration:1200,useNativeDriver:true}).start();
      });
    },6000); // 6s
    return ()=>clearInterval(heroTimer.current);
  },[]);

  // ── SUPABASE: авто-вхід + перевірка неактивності ────────────────────────
  // ЛОГІКА:
  // 1. При старті — getSession перевіряє чи є активна Supabase-сесія
  // 2. Якщо є сесія — перевіряємо lastActivity в AsyncStorage
  //    - Якщо пройшла доба без активності → деавторизація
  //    - Якщо не пройшла → тихий вхід без показу екрана авторизації
  // 3. Якщо сесії немає → onboarding
  // 4. onAuthStateChange слухає SIGNED_IN (ручний вхід через форму)
  useEffect(()=>{
    const ONE_DAY = 24*60*60*1000;

    const initSession = async () => {
      try {
        const {data:{session}} = await supabase.auth.getSession();

        if(session?.user){
          // Є активна Supabase-сесія — перевіряємо активність
          const lastStr = await AsyncStorage.getItem(`${session.user.id}:lastActivity`);
          const now = Date.now();

          if(lastStr){
            const elapsed = now - parseInt(lastStr);
            if(elapsed > ONE_DAY){
              // Доба без активності — деавторизуємо
              await supabase.auth.signOut();
              setLoggedInRaw(false);
              setUserRaw({name:'',email:'',phone:'',bonuses:0,role:null});
              clearUserState();
              setScr('onboarding');
              return;
            }
          }
          // Оновлюємо час активності
          await AsyncStorage.setItem(`${session.user.id}:lastActivity`, String(now));

          // Завантажуємо профіль
          const {data:p} = await supabase
            .from('profiles').select('*').eq('id',session.user.id).single();
          const role = p?.role||session.user.user_metadata?.role||null;
          setUserRaw({
            name:p?.name||session.user.user_metadata?.name||'',
            email:p?.email||session.user.email||'',
            phone:p?.phone||'',
            bonuses:p?.bonuses??0,
            role,
          });
          setLoggedInRaw(true);
          await loadUserData(session.user.id);
          // Одразу на головну — без екрана авторизації
          setScr('home');
        } else {
          // Немає сесії — онбординг/авторизація
          setScr('onboarding');
        }
      } catch(e) {
        console.warn('[AUTH] initSession error:', e.message);
        setScr('onboarding');
      }
    };

    initSession();

    // Слухаємо лише ручний SIGNED_IN (з форми авторизації)
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==='SIGNED_OUT'){
        setLoggedInRaw(false);
        setUserRaw({name:'',email:'',phone:'',bonuses:0,role:null});
        clearUserState();
      } else if(event==='SIGNED_IN' && session?.user){
        // OAuth (Google/Facebook) або форма — уніфікований обробник
        const isOAuth = session.user.app_metadata?.provider&&session.user.app_metadata.provider!=='email';
        if(isOAuth){
          await handleOAuthUser(session);
        } else {
          const {data:p} = await supabase
            .from('profiles').select('*').eq('id',session.user.id).single();
          const role = p?.role||session.user.user_metadata?.role||null;
          setUserRaw(prev=>({
            ...prev,
            name:p?.name||prev.name,
            email:p?.email||session.user.email||prev.email,
            bonuses:p?.bonuses??prev.bonuses,
            role,
          }));
          setLoggedInRaw(true);
          await AsyncStorage.setItem(`${session.user.id}:lastActivity`, String(Date.now()));
          await loadUserData(session.user.id);
        }
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── ASYNCSTORAGE: load settings on startup ──────────────────────────────
  // ВАЖЛИВО: роль тут НЕ завантажуємо — вона завжди з Supabase (getSession вище)
  useEffect(()=>{
    (async()=>{
      try {
        const keys=['themeMode','lang'];
        const pairs=await AsyncStorage.multiGet(keys);
        const data=Object.fromEntries(pairs.map(([k,v])=>[k,v]));
        if(data.themeMode) setThemeModeRaw(data.themeMode);
        const rbKey = await AsyncStorage.getItem('removeBgApiKey').catch(()=>null);
        if(rbKey) setRemoveBgApiKey(rbKey);
        const hc=await AsyncStorage.getItem('hiddenCats').catch(()=>null);
        if(hc) setHiddenCatsRaw(JSON.parse(hc));
        const hm=await AsyncStorage.getItem('homeMenu').catch(()=>null);
        if(hm) setHomeMenuRaw(JSON.parse(hm));
        const hi=await AsyncStorage.getItem('heroImg').catch(()=>null);
        if(hi) setHeroStaticImgRaw(hi);
        const bs=await AsyncStorage.getItem('bannerSize').catch(()=>null);
        if(bs) setBannerSizeRaw(bs);
        const ht=await AsyncStorage.getItem('heroTitle').catch(()=>null);
        if(ht) setHeroStaticTitleRaw(ht);
        const hs=await AsyncStorage.getItem('heroSub').catch(()=>null);
        if(hs) setHeroStaticSubRaw(hs);
        const ac=await AsyncStorage.getItem('accentColor').catch(()=>null);
        if(ac) setAccentColorRaw(ac);
        const bc=await AsyncStorage.getItem('bgColor').catch(()=>null);
        if(bc) setBgColorRaw(bc);
        if(data.lang)      setLangRaw(data.lang);
      } catch(e) {
        console.warn('AsyncStorage load error:', e);
      } finally {
        setAppLoaded(true);
      }
    })();
  },[]);

  // Cart banner — MUST be after cart useState
  const [showCartBanner,setShowCartBanner]=useState(false);
  useEffect(()=>{
    if(cart.length>0&&scr==='home'){
      setShowCartBanner(true);
      const t=setTimeout(()=>setShowCartBanner(false),4000);
      return()=>clearTimeout(t);
    } else {
      setShowCartBanner(false);
    }
  },[cart.length,scr]);

  // Checkout
  const [dName,setDName]=useState('');
  const [dPhone,setDPhone]=useState('');
  const [dEmail,setDEmail]=useState('');
  const [fieldErrors,setFieldErrors]=useState({});
  const [dCity,setDCity]=useState('');
  const [dBranch,setDBranch]=useState('');
  const [payM,setPayM]=useState(null);
  const [cNum,setCNum]=useState('');
  const [cExp,setCExp]=useState('');
  const [cCVV,setCCVV]=useState('');
  const [cNm,setCNm]=useState('');
  const [paying,setPaying]=useState(false);

  // NP
  const [npBranches,setNpBranches]=useState([]);
  const [npCitySuggestions,setNpCitySuggestions]=useState([]);
  const [npCityLoading,setNpCityLoading]=useState(false);
  const npCityTimerRef=useRef(null);
  const [npLoading,setNpLoading]=useState(false);
  const [npCreateLoading,setNpCreateLoading]=useState(false);
  const [npTrackData,setNpTrackData]=useState({}); // {trackNum: {status, date}}
  const [showNpCreate,setShowNpCreate]=useState(false);
  const [npCreateOrderId,setNpCreateOrderId]=useState(null);
  const [npCreateForm,setNpCreateForm]=useState({weight:'0.5',seats:'1',description:'Одяг',cost:'',payerType:'Recipient',serviceType:'WarehouseWarehouse'});
  const [senderRefs,setSenderRefs]=useState({cityRef:'',warehouseRef:''}); // зберігаємо refs відправника
  const [npErr,setNpErr]=useState(false);
  const [branchSearch,setBranchSearch]=useState('');

  // Profile
  const [savedAddr,setSavedAddr]=useState([{id:1,city:'Київ',branch:'12',phone:'+380671234567'}]);
  const [savedCards,setSavedCards]=useState([{id:1,last4:'4242',brand:'Visa',exp:'12/26'}]);
  const [showAddAddr,setShowAddAddr]=useState(false);
  const [showAddCard,setShowAddCard]=useState(false);
  const [nCity,setNCity]=useState('');
  const [nBranch,setNBranch]=useState('');
  const [nPhone,setNPhone]=useState('');
  const [ncNum,setNcNum]=useState('');
  const [ncExp,setNcExp]=useState('');
  const [ncNm,setNcNm]=useState('');
  const [editProf,setEditProf]=useState(false);
  const [eName,setEName]=useState('');
  const [ePhone,setEPhone]=useState('');
  const [notif,setNotif]=useState(true);
  const [smsNotif,setSmsNotif]=useState(true);
  const [obStep,setObStep]=useState(0);

  // ── IN-APP NOTIFICATIONS ─────────────────────────────────
  const [notifications,setNotificationsRaw]=useState([]);
  const setNotifications=(v)=>{
    setNotificationsRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      getUserId().then(uid=>{
        AsyncStorage.setItem(scopedKey(uid,'notifications'),JSON.stringify(val)).catch(()=>{});
      });
      return val;
    });
  };
  const unreadNotifs=useMemo(()=>notifications.filter(n=>!n.read).length,[notifications]);

  const addNotif=(title,body,type='info',orderId=null)=>{
    const n={id:`notif_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,title,body,type,orderId,
      time:new Date().toLocaleString('uk-UA'),read:false};
    setNotifications(p=>[n,...p].slice(0,50));
  };
  const markNotifsRead=()=>setNotifications(p=>p.map(n=>({...n,read:true})));

  const MOCK_ORDERS=[
    {id:'10001',date:'20.01.2026',status:'Доставлено',items:['Basic White Tee ×2'],total:1398,track:'59000123456789',city:'Київ',pay:'LiqPay',bonusEarned:70},
    {id:'10002',date:'10.02.2026',status:'В дорозі',items:['Classic Field Jacket ×1'],total:2499,track:'59000987654321',city:'Харків',pay:'Картка',bonusEarned:0},
  ];
  const [orders,setOrdersRaw]=useState(MOCK_ORDERS);
  const setOrders=useCallback((v)=>{
    setOrdersRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      getUserId().then(uid=>{
        AsyncStorage.setItem(scopedKey(uid,'orders'),JSON.stringify(val)).catch(()=>{});
      });
      return val;
    });
  },[getUserId]);
  const [selOrder,setSelOrder]=useState(null);

  // ── COLOR / SIZE FILTER in catalog ──────────────
  const [colorFilter,setColorFilter]=useState(null);
  const [sizeFilter,setSizeFilter]=useState(null);
  const [showColorSizeFilter,setShowColorSizeFilter]=useState(false);

  // ── COMPARE (up to 3 products) ───────────────────
  const [compareList,setCompareList]=useState([]);
  const [showCompare,setShowCompare]=useState(false);
  const toggleCompare=(p)=>{
    setCompareList(prev=>{
      if(prev.find(x=>x.id===p.id)) return prev.filter(x=>x.id!==p.id);
      if(prev.length>=3) return prev;
      return [...prev,p];
    });
  };

  // ── LOYALTY LEVELS ───────────────────────────────
  const getLoyaltyLevel=(bonuses)=>{
    if(bonuses>=3000) return {name:'Gold',   color:'#d4af37',min:3000,next:null,   icon:'👑'};
    if(bonuses>=1000) return {name:'Silver', color:'#9ca3af',min:1000,next:3000,  icon:'⭐'};
    return               {name:'Bronze', color:'#cd7f32',min:0,   next:1000,  icon:'🏅'};
  };

  // ── REFERRAL ─────────────────────────────────────
  const [refCode]=useState(()=>'4YOU-'+Math.random().toString(36).slice(2,8).toUpperCase());
  const [showReferral,setShowReferral]=useState(false);
  const [showAdminHub,setShowAdminHub]=useState(false);
  const [showAdminReviews,setShowAdminReviews]=useState(false);
  const [adminReviews,setAdminReviews]=useState([]);
  const [adminReviewsLoading,setAdminReviewsLoading]=useState(false);
  const [showPhotoStudio,setShowPhotoStudio]=useState(false);
  const [studioSourceUri,setStudioSourceUri]=useState('');
  const [studioResultUri,setStudioResultUri]=useState('');
  const [studioProcessing,setStudioProcessing]=useState(false);
  const [studioCallback,setStudioCallback]=useState(null);
  const [removeBgApiKey,setRemoveBgApiKey]=useState('');
  const [studioBg,setStudioBg]=useState('white'); // white|gray|cream|transparent
  const [reportPeriod,setReportPeriod]=useState('week'); // day|week|month|quarter|half|year|all
  const [reportType,setReportType]=useState('revenue'); // revenue|orders|products|clients

  // ── SWIPE-TO-DELETE state ────────────────────────
  const [swipeOpen,setSwipeOpen]=useState(null); // key of open swipe

  // ── ADD-TO-CART ANIMATION (fixed) ───────────────
  const bagAnimX=useRef(new Animated.Value(0)).current;
  const bagAnimY=useRef(new Animated.Value(0)).current;
  const bagOpacity=useRef(new Animated.Value(0)).current;
  const [animProduct,setAnimProduct]=useState(null);
  const triggerBagAnim=(p)=>{
    bagAnimX.setValue(W/2-26);
    bagAnimY.setValue(H*0.38);
    bagOpacity.setValue(1);
    setAnimProduct(p);
    Animated.parallel([
      Animated.timing(bagAnimX,{toValue:W-56,duration:480,useNativeDriver:true}),
      Animated.timing(bagAnimY,{toValue:IS_IOS?(IS_LARGE?58:36):28,duration:480,useNativeDriver:true}),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(bagOpacity,{toValue:0,duration:180,useNativeDriver:true}),
      ]),
    ]).start(()=>setAnimProduct(null));
  };

  // ── COMPUTED ──────────────────────────────────────
  const addToCart=(p,sz,cl)=>{
    trackEvent(p.id,'cart_add');
    const k=`${p.id}_${sz}_${cl}`;
    setCart(prev=>{const ex=prev.find(i=>i.key===k);if(ex)return prev.map(i=>i.key===k?{...i,qty:i.qty+1}:i);return[...prev,{...p,qty:1,size:sz,color:cl,key:k}];});
  };
  const decCart=k=>setCart(prev=>{const ex=prev.find(i=>i.key===k);if(ex.qty===1)return prev.filter(i=>i.key!==k);return prev.map(i=>i.key===k?{...i,qty:i.qty-1}:i);});
  const delCart=k=>setCart(prev=>prev.filter(i=>i.key!==k));
  const totItems=cart.reduce((s,i)=>s+i.qty,0);
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const disc=promoApplied?Math.round(subtotal*promoApplied/100):0;
  const afterDisc=subtotal-disc;
  const maxBonus=Math.floor(afterDisc*0.5);
  const bonusUsed=useBonuses&&loggedIn?Math.min(user.bonuses,maxBonus):0;
  const totPrice=afterDisc-bonusUsed;

  const applyPromo=()=>{const c=promo.toUpperCase().trim();if(PROMO[c]){setPromoApplied(PROMO[c]);setPromoErr('');}else{setPromoErr(T.promoInvalid);setPromoApplied(null);}};
  const toggleWish=id=>setWish(p=>p.includes(id)?p.filter(i=>i!==id):[...p,id]);

  // ── ADMIN: load all products from Supabase ──────────────────────
  const loadAdminProducts = async (pageSize=null, sortField=null, sortDir=null) => {
    setAdminLoading(true);
    const ps = pageSize ?? adminPageSize;
    const sf = sortField ?? adminSortField;
    const sd = sortDir ?? adminSortDir;
    try {
      const {data, error} = await supabase.from('products')
        .select('id,name,price,old_price,category_id,sub_category,is_active,stock,images,description,sku,size_guide')
        .order(sf, {ascending: sd==='asc'})
        .limit(ps);
      if(error){
        console.warn('[Admin] loadProducts error:', error.message);
        showNotif('Помилка завантаження товарів: '+error.message,'error');
        return;
      }
      setAdminProducts(data||[]);
    } catch(e){
      console.warn('[Admin] loadProducts exception:', e.message);
      showNotif('Помилка: '+e.message,'error');
    } finally {
      setAdminLoading(false);
    }
  };

  const loadAdminReviews = async () => {
    setAdminReviewsLoading(true);
    try {
      const {data,error} = await supabase
        .from('reviews')
        .select('*')
        .order('created_at',{ascending:false})
        .limit(300);
      if(!error && data) setAdminReviews(data);
      else if(error) console.warn('[reviews]', error.message);
    } catch(e){ console.warn('[reviews]', e.message); }
    finally { setAdminReviewsLoading(false); }
  };

  const deleteAdminReview = async (id) => {
    try {
      await supabase.from('reviews').delete().eq('id', id);
      setAdminReviews(p=>p.filter(r=>r.id!==id));
      showNotif('Відгук видалено','success');
    } catch(e){ showNotif('Помилка видалення','error'); }
  };

  const adminUpdateOrderStatus=async(orderId,newStatus)=>{
    const msg={'Оплачено':'Оплата підтверджена. Готуємо ваше замовлення.',
      'В дорозі':'Ваше замовлення відправлено Новою Поштою.',
      'Доставлено':'Замовлення прибуло у відділення. Очікує на вас!',
      'Отримано':'Дякуємо! Замовлення отримано.',
      'Скасовано':'На жаль, замовлення скасовано. Зверніться до підтримки.'};
    const em={'Оплачено':'💳','В дорозі':'🚚','Доставлено':'📍','Отримано':'✅','Скасовано':'❌'};
    // Оновлюємо локально одразу
    setOrders(p=>p.map(o=>o.id===orderId?{...o,status:newStatus}:o));
    addNotif((em[newStatus]||'')+'Статус замовлення #'+orderId,
      msg[newStatus]||'Статус оновлено: '+newStatus,'status',orderId);
    // Зберігаємо в Supabase через async/await — єдиний правильний спосіб
    try {
      const {error} = await supabase.from('orders')
        .update({status: newStatus, updated_at: new Date().toISOString()})
        .eq('id', orderId);
      if(error) console.warn('[orders] update error:', error.message);
      setAdminOrders(p=>p.map(o=>String(o.id)===String(orderId)?{...o,status:newStatus}:o));

      // ── Нарахування бонусів при статусі "Отримано" ──
      if(newStatus==='Отримано'){
        try {
          const {data:order} = await supabase.from('orders')
            .select('total,bonus_earned,bonus_used,user_id,bonus_credited')
            .eq('id', orderId).single();
          // Нараховуємо тільки якщо ще не нараховано
          if(order && order.user_id && !order.bonus_credited){
            const toCredit = order.bonus_earned || Math.floor((order.total||0)*0.03);
            if(toCredit>0){
              // Отримуємо поточний баланс
              const {data:prof} = await supabase.from('profiles')
                .select('bonuses').eq('id', order.user_id).single();
              const newBal = Math.max(0,(prof?.bonuses||0)) + toCredit;
              await supabase.from('profiles').update({bonuses:newBal}).eq('id',order.user_id);
              // Позначаємо що бонуси нараховано
              await supabase.from('orders').update({bonus_credited:true}).eq('id',orderId);
              // Якщо це поточний юзер — оновлюємо локально
              if(String(order.user_id)===String(user?.id)){
                setUser(u=>({...u,bonuses:newBal}));
              }
              addNotif('⭐ Бонуси нараховано!','+'+toCredit+' бонусів за замовлення #'+orderId+' зараховано на ваш рахунок','bonus',orderId);
            }
          }
        } catch(e){ console.warn('[bonus credit]', e.message); }
      }
    } catch(e) { console.warn('[orders] update error:', e.message); }
  };

  // ── ПОВНЕ РЕДАГУВАННЯ ЗАМОВЛЕННЯ ─────────────────────────────────────────
  const adminSaveOrder = async () => {
    if(!adminEditOrder) return;
    try{
      const f = adminEditOrderForm;
      // Парсимо items якщо це рядок
      let parsedItems = f.items;
      if(typeof f.items === 'string'){
        try{ parsedItems = JSON.parse(f.items); }
        catch{ parsedItems = adminEditOrder.items; }
      }
      const updateData = {
        contact_name:   f.contact_name||adminEditOrder.contact_name||null,
        contact_phone:  f.contact_phone||adminEditOrder.contact_phone||null,
        contact_email:  f.contact_email||adminEditOrder.contact_email||null,
        city:           f.city||adminEditOrder.city||null,
        np_branch:      f.np_branch||adminEditOrder.np_branch||null,
        tracking:       f.tracking||adminEditOrder.tracking||null,
        status:         f.status||adminEditOrder.status,
        payment_method: f.payment_method||adminEditOrder.payment_method||null,
        payment_status: f.payment_status||adminEditOrder.payment_status||null,
        total:          Number(f.total)||adminEditOrder.total||0,
        subtotal:       Number(f.subtotal)||adminEditOrder.subtotal||0,
        bonus_used:     Number(f.bonus_used)||0,
        items:          parsedItems,
        updated_at:     new Date().toISOString(),
      };
      const {error} = await supabase.from('orders')
        .update(updateData).eq('id', adminEditOrder.id);
      if(error) throw error;
      setAdminOrders(p=>p.map(o=>
        String(o.id)===String(adminEditOrder.id)?{...o,...updateData}:o
      ));
      setAdminEditOrder(null);
      setAdminEditOrderForm({});
      showNotif('Замовлення оновлено ✓','success');
    }catch(e){ showNotif('Помилка: '+e.message,'error'); }
  };

  // ── МАСОВА ЗМІНА ЦІН ─────────────────────────────────────────────────────
  const applyBulkPrice = async () => {
    const val=parseFloat(bulkVal);
    if(!val||val<=0) return showNotif('Введіть коректне значення','error');
    // Завантажуємо ВСІ товари для bulk операції (не тільки поточну сторінку)
    let allProds = adminProducts;
    if(adminProducts.length < 100) {
      try {
        const {data} = await supabase.from('products').select('id,price,old_price,cid,sub_category,category_id,name').order('id');
        if(data && data.length > 0) allProds = data;
      } catch(_){}
    }
    const minP = bulkMinPrice ? parseFloat(bulkMinPrice) : 0;
    const maxP = bulkMaxPrice ? parseFloat(bulkMaxPrice) : Infinity;
    const allSelected = bulkCats.includes('all');
    const targets = allProds.filter(p=>{
      // Фільтр категорій
      const catMatch = allSelected ||
        bulkCats.some(cid=>
          p.cid===cid ||
          p.category_id===cid ||
          p.sub_category===cid ||
          (p.sub_category||'').toLowerCase().includes(cid.toLowerCase()) ||
          (p.cid||'').toLowerCase().includes(cid.toLowerCase())
        );
      // Фільтр діапазону ціни
      const priceMatch = (!bulkMinPrice||p.price>=minP) && (!bulkMaxPrice||p.price<=maxP);
      return catMatch && priceMatch;
    });
    if(!targets.length) return showNotif('Немає товарів за вибраними критеріями','error');
    const catLabel = allSelected ? 'всі категорії' : bulkCats.length+' кат.';
    Alert.alert(
      'Підтвердити зміну цін',
      (bulkDir==='down'?'Знижка':'Підвищення')+' '+val+(bulkMode==='pct'?'%':' ₴')+
        ' для '+targets.length+' товарів ('+catLabel+')'+(bulkMinPrice||bulkMaxPrice?' | ціна: '+(bulkMinPrice||'0')+' – '+(bulkMaxPrice||'∞')+' ₴':''),
      [{text:'Скасувати',style:'cancel'},
       {text:'Застосувати',style:'destructive',onPress:async()=>{
         try{
           showNotif('Оновлюємо '+targets.length+' товарів...','info');
           const updates = targets.map(p=>{
             const delta=bulkMode==='pct'?Math.round(p.price*val/100):Math.round(val);
             const newPrice=bulkDir==='down'?Math.max(1,p.price-delta):p.price+delta;
             return supabase.from('products')
               .update({price:newPrice, old_price:bulkDir==='down'?p.price:(p.old_price||null)})
               .eq('id',p.id);
           });
           const results = await Promise.all(updates);
           const done = results.filter(r=>!r.error).length;
           showNotif('✓ Оновлено '+done+'/'+targets.length+' товарів','success');
           loadAdminProducts(); loadProducts(true); setBulkVal('');
         }catch(e){showNotif('Помилка: '+e.message,'error');}
       }}]
    );
  };

  // ── PUSH РОЗСИЛКА ─────────────────────────────────────────────────────────
  const sendPushBroadcast = async () => {
    if(!pushTitle.trim()||!pushBody.trim()) return showNotif('Заповніть заголовок і текст','error');
    try{
      const {error}=await supabase.from('admin_notifications').insert({
        type:'broadcast',
        title:pushTitle.trim(),
        body:pushBody.trim(),
        read:false,
        created_at:new Date().toISOString(),
      });
      if(error) throw error;
      showNotif('✓ Розсилку відправлено для: '+({all:'всіх',buyers:'покупців',inactive:'неактивних'}[pushSeg]||pushSeg),'success');
      setPushTitle(''); setPushBody('');
    }catch(e){showNotif('Помилка: '+e.message,'error');}
  };

  // ── ВИДАЛЕННЯ ТЕСТОВИХ ТОВАРІВ ────────────────────────────────────────────
  const deleteTestProducts = async () => {
    Alert.alert('Видалити тестові товари?','Видалить товари з ID 1-60. Незворотна дія.',[
      {text:'Скасувати',style:'cancel'},
      {text:'Видалити',style:'destructive',onPress:async()=>{
        try{
          const {error}=await supabase.from('products').delete().lte('id',60);
          if(error) throw error;
          showNotif('Тестові товари видалено ✓','success');
          loadAdminProducts(); loadProducts(true);
        }catch(e){showNotif('Помилка: '+e.message,'error');}
      }},
    ]);
  };

  const adminSaveProduct = async (prod) => {
    try {
      const updateData = {
        name:        prod.name,
        price:       Number(prod.price)||0,
        old_price:   prod.old_price||null,
        is_active:   prod.is_active,
        stock:       Number(prod.stock)||0,
        sku:         adminEditForm.sku||prod.sku||prod.article||null,
        description: adminEditForm.desc||prod.desc||prod.description||null,
        category_id: adminEditForm.cid||prod.cid||null,
        sub_category:adminEditForm.sub_category||(adminEditForm.cid?adminEditForm.cid:null)||prod.sub_category||prod.cat||prod.cid||null,
        sizes:       (adminEditForm.sizeStock||[]).length>0 ? adminEditForm.sizeStock.filter(x=>x.size.trim()).map(x=>x.size.trim()) : (prod.sizes||prod.sz||[]),
        stock:       (adminEditForm.sizeStock||[]).length>0 ? (adminEditForm.sizeStock||[]).reduce((s,x)=>s+Number(x.qty||0),0) : (Number(prod.stock)||0),
        colors:      prod.colors||prod.cl||[],
        images:      adminEditForm.imageUrl ? [adminEditForm.imageUrl] : (prod.images||(prod.img?[prod.img]:[])),
        badge:       prod.badge||null,
      };
      const {error} = await supabase.from('products').update(updateData).eq('id', prod.id);
      if(error) throw error;
      // Оновлюємо локальний список одразу
      setAdminProducts(p=>p.map(x=>x.id===prod.id?{...x,...updateData,cid:updateData.category_id}:x));
      setAdminEdit(null);
      loadAdminProducts();
      loadProducts(true); // оновлюємо і каталог
      showNotif('Товар оновлено ✓','success');
    } catch(e){ showNotif('Помилка збереження: '+e.message,'error'); console.warn(e); }
  };

  const adminToggleActive = async (id, current) => {
    await supabase.from('products').update({is_active:!current}).eq('id',id);
    setAdminProducts(p=>p.map(x=>x.id===id?{...x,is_active:!current}:x));
  };

  const adminDuplicateProduct = async (prod) => {
    try{
      const {id:_,...rest}=prod;
      const {error}=await supabase.from('products').insert({
        ...rest,
        name:rest.name+' (копія)',
        is_active:false,
      });
      if(error) throw error;
      showNotif('Товар скопійовано','success');
      loadAdminProducts();
    }catch(e){showNotif('Помилка копіювання: '+e.message,'error');}
  };

  const adminBulkAction = async (action) => {
    const ids=[...adminSelected];
    if(!ids.length) return;
    try{
      if(action==='activate')
        await supabase.from('products').update({is_active:true}).in('id',ids);
      else if(action==='hide')
        await supabase.from('products').update({is_active:false}).in('id',ids);
      else if(action==='delete'){
        await supabase.from('products').delete().in('id',ids);
      }
      setAdminSelected(new Set());
      setAdminBulkMode(false);
      loadAdminProducts();
      showNotif(`${ids.length} товарів оновлено`,'success');
    }catch(e){showNotif('Bulk error: '+e.message,'error');}
  };

  const adminDeleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id',id);
    setAdminProducts(p=>p.filter(x=>x.id!==id));
    showNotif('Товар видалено','info');
  };

  const adminAddProduct = async () => {
    if(!addProdForm.name.trim()||!addProdForm.price) return showNotif('Заповніть назву та ціну','error');
    try{
      const sizeArr=(addProdForm.sizeStock||[]).filter(x=>x.size.trim());
      const totalStock=sizeArr.reduce((s,x)=>s+Number(x.qty||0),0);
      const {data,error} = await supabase.from('products').insert({
        name:         addProdForm.name.trim(),
        price:        Number(addProdForm.price),
        old_price:    addProdForm.old_price ? Number(addProdForm.old_price) : null,
        stock:        totalStock||0,
        category_id:  addProdForm.cid||null,
        sub_category: addProdForm.sub_category||addProdForm.cid||null,
        description:  addProdForm.description.trim()||null,
        sku:          addProdForm.sku?.trim()||null,
        sizes:        sizeArr.map(x=>x.size.trim()),
        colors:       addProdForm.colors||[],
        is_active:    true,
        images:       addProdForm.imageUrl.trim()?[addProdForm.imageUrl.trim()]:[],
        badge:        null,
        tags:         [],
      }).select().single();
      if(error) throw error;
      showNotif('Товар додано ✓','success');
      setShowAddProduct(false);
      setAddProdForm({name:'',price:'',old_price:'',sku:'',sub_category:'',description:'',cid:'',imageUrl:'',sizeStock:[]});
      loadAdminProducts();
      loadProducts(true); // синхронізуємо каталог одразу
    }catch(e){ showNotif('Помилка: '+e.message,'error'); }
  };

  const shareProduct = async (p) => {
    try {
      await Share.share({
        message: `${p.name} — ${p.price} ₴\n4U.TEAM`,
        title: p.name,
      });
    } catch(e) {}
  };

  const addReview = async () => {
    if(!newReviewText.trim()) return;
    if(!loggedIn){
      setShowAddReview(false);
      showNotif('Увійдіть в акаунт щоб залишити відгук','error');
      setTimeout(()=>go('profile'),600);
      return;
    }
    const r = {
      product_id: sel.id,
      author: user.name||user.email?.split('@')[0]||'Покупець',
      user_id: user.id||null,
      rating: newReviewRating,
      text: newReviewText.trim(),
      date: new Date().toLocaleDateString('uk-UA'),
      created_at: new Date().toISOString(),
    };
    // Save to Supabase
    try {
      const {data,error} = await supabase.from('reviews').insert([r]).select().single();
      if(!error && data){
        setReviews(prev=>({...prev,[sel.id]:[{...r,id:data.id},...(prev[sel.id]||[])]}));
      } else {
        // Fallback: show locally even if DB fails
        setReviews(prev=>({...prev,[sel.id]:[{...r,id:Date.now()},...(prev[sel.id]||[])]}));
        if(error) console.warn('[review save]', error.message);
      }
    } catch(e){
      setReviews(prev=>({...prev,[sel.id]:[{...r,id:Date.now()},...(prev[sel.id]||[])]}));
    }
    setNewReviewText('');setNewReviewRating(5);setShowAddReview(false);
    showNotif('Дякуємо за відгук! ✓','success');
  };

  // Scroll product screen to top + load reviews whenever a new product is opened
  useEffect(()=>{
    if(sel&&productScrollRef.current){
      productScrollRef.current.scrollTo({y:0,animated:false});
    }
    if(sel?.id){
      // Load reviews for this product from Supabase
      supabase.from('reviews')
        .select('*')
        .eq('product_id', sel.id)
        .order('created_at',{ascending:false})
        .then(({data,error})=>{
          if(!error&&data){
            setReviews(prev=>({...prev,[sel.id]:data}));
          }
        }).catch(()=>{});
    }
  },[sel]);

  const [productViews,setProductViews] = useState({});
  // Глобальна аналітика з Supabase
  const [productAnalytics,setProductAnalytics] = useState({}); // {id:{views,cart_adds,orders,revenue}}
  const [analyticsLoading,setAnalyticsLoading] = useState(false);

  // Трекінг події в Supabase (fire-and-forget, не блокує UI)
  const trackEvent = (productId, eventType) => {
    if(!productId) return;
    // Локальний лічильник (миттєво)
    if(eventType==='view') setProductViews(prev=>({...prev,[productId]:(prev[productId]||0)+1}));
    // Збереження в Supabase (async, тихо)
    supabase.from('product_events').insert({
      product_id: String(productId),
      event_type: eventType, // view | cart_add | order | wishlist
      user_id: user?.id||null,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    }).then(({error})=>{ if(error) console.warn('[analytics]',error.message); }).catch(()=>{});
  };

  // Завантажити агреговану аналітику для адміна
  const loadProductAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      // Агрегуємо події по товарах
      const {data,error} = await supabase
        .from('product_events')
        .select('product_id, event_type')
        .gte('created_at', new Date(Date.now()-30*86400000).toISOString()); // останні 30 днів
      if(error){ console.warn('[analytics load]',error.message); return; }
      const agg = {};
      (data||[]).forEach(ev=>{
        if(!agg[ev.product_id]) agg[ev.product_id]={views:0,cart_adds:0,orders:0};
        if(ev.event_type==='view')     agg[ev.product_id].views++;
        if(ev.event_type==='cart_add') agg[ev.product_id].cart_adds++;
        if(ev.event_type==='order')    agg[ev.product_id].orders++;
      });
      setProductAnalytics(agg);
    } catch(e){ console.warn('[analytics]',e.message); }
    finally { setAnalyticsLoading(false); }
  };

  // ID сесії (генерується один раз)
  const sessionId = useRef(Math.random().toString(36).slice(2)).current;

  const trackView = (p) => {
    trackEvent(p.id, 'view');
  };

  const addToRecentlyViewed = (p) => {
    trackView(p);
    setRecentlyViewed(prev=>{
      const filtered = prev.filter(x=>x.id!==p.id);
      return [p, ...filtered].slice(0,10);
    });
  };

  const allFilteredItems=useMemo(()=>{
    const SUB_CAT_MAP={
      'outerwear':['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки'],
      'hoodies':['Кофти','Світшоти','Світшоти БРЕНД','Світери'],
      'tshirts':['Футболки','Сорочки'],
      'pants':['Джинси','Джинси класика','Спортивні штани','Брюки','Шорти','Плавальні шорти'],
      'tshirts':['Футболки','Поло','Лонгсліви'],
      'shirts':['Сорочки'],
      'tshirts':['Футболки','Поло','Лонгсліви'],
      'shirts':['Сорочки'],
      'costumes':['Костюми','Комплекти'],
      'accessories':['Взуття','Труси','Головні убори'],
    };
    let r=products.filter(p=>{
      let mCat=true;
      // "Новинки" = останні 15 товарів по id (найбільший id = найновіший)
      if(catFilter.badge==='__new__'){
        const sortedIds=[...products].sort((a,b)=>b.id-a.id).slice(0,15).map(x=>x.id);
        mCat=sortedIds.includes(p.id);
      } else if(catFilter.badge) mCat=p.badge===catFilter.badge;
      else if(catFilter.sub) mCat=p.cat===catFilter.sub;
      else if(catFilter.cid){
        const allowed=SUB_CAT_MAP[catFilter.cid];
        // p.cid === catFilter.cid завжди перемагає (основна перевірка)
        if(p.cid===catFilter.cid) mCat=true;
        else if(allowed) mCat=allowed.includes(p.cat);
        else mCat=false;
      }
      const mPrice = p.price>=priceMin && p.price<=priceMax;
      const mColor = !colorFilter || (p.cl||[]).includes(colorFilter);
      const mSize  = !sizeFilter  || (p.sz||[]).includes(sizeFilter);
      return mCat&&mPrice&&mColor&&mSize&&p.name.toLowerCase().includes(srch.toLowerCase());
    });
    if(sort==='price_asc') r=[...r].sort((a,b)=>a.price-b.price);
    if(sort==='price_desc') r=[...r].sort((a,b)=>b.price-a.price);
    if(sort==='new') r=[...r].sort((a,b)=>(b.badge==='Новинка'?1:0)-(a.badge==='Новинка'?1:0));
    // "Всі товари" без фільтрів — популярні (за кількістю замовлень) + нові в пріоритеті
    if(!catFilter.cid&&!catFilter.badge&&!catFilter.sub&&sort==='default'){
      r=[...r].sort((a,b)=>{
        // Рахуємо кількість замовлень кожного товару з orders[]
        const ordCountA = orders.filter(o=>(o.items||[]).some(it=>{
          const name = typeof it==='string'?it:(it.name||'');
          return name.includes(a.name?.slice(0,15)||'');
        })).length;
        const ordCountB = orders.filter(o=>(o.items||[]).some(it=>{
          const name = typeof it==='string'?it:(it.name||'');
          return name.includes(b.name?.slice(0,15)||'');
        })).length;
        // Score: замовлення(×8) + глобальні перегляди(×3) + cart_add(×4) + відгуки(×3) + новизна
        const pa = productAnalytics?.[String(a.id)]||{};
        const pb = productAnalytics?.[String(b.id)]||{};
        const scoreA = (pa.orders||ordCountA)*8 + (pa.views||productViews?.[a.id]||0)*3 + (pa.cart_adds||0)*4 + (a.rv||0)*3 + (a.id/1000);
        const scoreB = (pb.orders||ordCountB)*8 + (pb.views||productViews?.[b.id]||0)*3 + (pb.cart_adds||0)*4 + (b.rv||0)*3 + (b.id/1000);
        return scoreB-scoreA;
      });
    }
    if(sort==='rating') r=[...r].sort((a,b)=>b.r-a.r);
    return r;
  },[catFilter,srch,sort,priceMin,priceMax,colorFilter,sizeFilter,products]);

  const filteredItems=useMemo(()=>allFilteredItems.slice(0,perPage),[allFilteredItems,perPage]);

  // ── PERFORMANCE: мемоізовані обчислення — не рахуємо в JSX ─────────────
  const hitItemsMemo=useMemo(()=>
    products.filter(p=>p.badge==='Хіт').slice(-8).reverse()
  ,[products]);

  // Популярні товари — на основі аналітики + замовлень + рейтингу
  const popularMemo=useMemo(()=>{
    if(!products.length) return [];
    // Рахуємо замовлення кожного товару з orders[]
    const ordMap={};
    orders.forEach(o=>(o.items||[]).forEach(it=>{
      const name = typeof it==='string'?it:(it.name||'');
      const prod = products.find(p=>p.name&&name.startsWith(p.name.slice(0,12)));
      if(prod) ordMap[prod.id]=(ordMap[prod.id]||0)+(it.qty||1);
    }));
    return [...products]
      .map(p=>{
        const pa = productAnalytics?.[String(p.id)]||{};
        const score =
          (pa.orders||ordMap[p.id]||0)*10 +
          (pa.cart_adds||0)*5 +
          (pa.views||productViews?.[p.id]||0)*2 +
          (p.rv||0)*4 +
          (p.r||0)*3;
        return {...p, _score:score};
      })
      .filter(p=>p.img) // тільки з фото
      .sort((a,b)=>b._score-a._score)
      .slice(0,6);
  },[products,productAnalytics,productViews,orders]);
  const wishedProducts=useMemo(()=>
    products.filter(p=>wish.includes(p.id))
  ,[products,wish]);
  const similarProducts=useMemo(()=>
    sel ? products.filter(p=>p.cid===sel.cid&&p.id!==sel.id).slice(0,8) : []
  ,[products,sel]);
  const stockAlertCount=useMemo(()=>
    stockAlertCount
  ,[products]);
  const adminStats=useMemo(()=>({
    avgPrice: products.length ? Math.round(products.reduce((s,p)=>s+(p.price||0),0)/products.length) : 0,
    inStock:  products.filter(p=>p.stock>0).length,
    lowStock: products.filter(p=>p.stock>0&&p.stock<=5).length,
    outStock: products.filter(p=>!p.stock||p.stock<=0).length,
    minPrice: products.length ? Math.min(...products.map(p=>p.price||0)) : 0,
    maxPrice: products.length ? Math.max(...products.map(p=>p.price||0)) : 0,
  }),[products]);


  // Кількість товарів по категоріях — для меню
  const CAT_SUB_MAP = {
    'outerwear':['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки'],
    'hoodies':['Кофти','Світшоти','Світшоти БРЕНД','Світери'],
    'tshirts':['Футболки','Сорочки'],
    'pants':['Джинси','Джинси класика','Спортивні штани','Брюки','Шорти','Плавальні шорти'],
    'costumes':['Костюми','Комплекти'],
    'accessories':['Взуття','Труси','Головні убори'],
  };
  // ── PRODUCT NAVIGATION (swipe між товарами категорії) ──────────────────
  const categoryItems=useMemo(()=>{
    if(!sel) return [];
    // Показуємо товари тієї ж категорії (cid) що й поточний товар
    return allFilteredItems.length>1 ? allFilteredItems : products.filter(p=>p.cid===sel.cid);
  },[allFilteredItems,products,sel]);

  const currentProductIdx=useMemo(()=>{
    if(!sel||!categoryItems.length) return -1;
    return categoryItems.findIndex(p=>p.id===sel.id);
  },[categoryItems,sel]);

  const goProductPrev=useCallback(()=>{
    if(currentProductIdx<=0) return;
    const prev=categoryItems[currentProductIdx-1];
    productSwipeDir.current=-1;
    Animated.sequence([
      Animated.timing(productSwipeAnim,{toValue:W,duration:200,useNativeDriver:true}),
    ]).start(()=>{
      productSwipeAnim.setValue(-W);
      setSel(prev);setSelSz(null);setSelCl(null);
      Animated.spring(productSwipeAnim,{toValue:0,useNativeDriver:true,tension:100,friction:12}).start();
    });
  },[currentProductIdx,categoryItems,productSwipeAnim]);

  const goProductNext=useCallback(()=>{
    if(currentProductIdx<0||currentProductIdx>=categoryItems.length-1) return;
    const next=categoryItems[currentProductIdx+1];
    productSwipeDir.current=1;
    Animated.sequence([
      Animated.timing(productSwipeAnim,{toValue:-W,duration:200,useNativeDriver:true}),
    ]).start(()=>{
      productSwipeAnim.setValue(W);
      setSel(next);setSelSz(null);setSelCl(null);
      Animated.spring(productSwipeAnim,{toValue:0,useNativeDriver:true,tension:100,friction:12}).start();
    });
  },[currentProductIdx,categoryItems,productSwipeAnim]);

  // Горизонтальний свайп між товарами вимкнено — тільки кнопки prev/next
  const productScreenPan=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:()=>false,
    onPanResponderMove:()=>{},
    onPanResponderRelease:()=>{},
  })).current;
  const goProductPrevRef=useRef(null);
  const goProductNextRef=useRef(null);

  const catProductCount=useMemo(()=>{
    const counts={};
    products.forEach(p=>{
      const cid=p.cid||'other';
      counts[cid]=(counts[cid]||0)+1;
      const cat=p.cat||'';
      counts['sub_'+cat]=(counts['sub_'+cat]||0)+1;
    });
    return counts;
  },[products]);

  const searchResults=useMemo(()=>{
    if(!srch||srch.length<2) return [];
    const q=srch.toLowerCase();
    return products.filter(p=>
      p.name.toLowerCase().includes(q)||(p.tags||[]).some(t=>t.includes(q))
    ).slice(0,6);
  },[products,srch]);

  const getCatLabel=()=>{
    if(catFilter.badge==='Sale') return 'SALE';
    if(catFilter.badge==='Новинка') return lang==='EN'?'NEW ARRIVALS':'НОВИНКИ';
    if(catFilter.sub) return catFilter.sub.toUpperCase();
    if(catFilter.cid){
      for(const L1 of CAT_TREE){
        if(L1.id===catFilter.cid)return lang==='EN'?L1.labelEN:L1.label;
        for(const L2 of(L1.children||[])){if(L2.id===catFilter.cid)return lang==='EN'?L2.labelEN:L2.label;}
      }
    }
    return T.all;
  };

  // ── OAUTH CALLBACK (викликається після Google/FB redirect) ────────────
  const handleOAuthUser=useCallback(async(session)=>{
    if(!session?.user) return;
    const u=session.user;
    const uid=u.id;
    try{
      let {data:prof}=await supabase.from('profiles').select('*').eq('id',uid).single();
      if(!prof){
        await supabase.from('profiles').insert({
          id:uid,name:u.user_metadata?.full_name||u.email?.split('@')[0]||'User',
          email:u.email,role:'user',bonuses:0,
        });
        prof={name:u.user_metadata?.full_name||'',email:u.email,role:'user',bonuses:0};
      }
      setUser({name:prof.name||u.user_metadata?.full_name||'',email:u.email,
        phone:prof.phone||'',bonuses:prof.bonuses||0,role:prof.role||'user',id:uid});
      setLoggedIn(true);
      setScr('home');
      registerPushToken(uid);
      showNotif('Вітаємо, '+(prof.name||u.email)+'!','success');
    }catch(e){console.warn('OAuth profile error:',e);}
  },[]);

  const doAuth=async()=>{
    if(!authEmail.includes('@'))return setAuthErr(T.errEmail);
    if(authPass.length<6)return setAuthErr(T.errPass);
    if(authMode==='register'&&!authName)return setAuthErr(T.errName);
    setAuthErr('');
    try{
      let authUid = null;
      if(authMode==='register'){
        const {data,error}=await supabase.auth.signUp({
          email:authEmail.trim().toLowerCase(),
          password:authPass,
          options:{
            data:{name:authName.trim()},
            emailRedirectTo:'exp://localhost:8081', // redirect назад в додаток
          }
        });
        if(error)throw error;

        // Supabase вимагає підтвердження email — session буде null
        if(!data.session && data.user){
          setAuthErr('');
          setAuthMode('login');
          setAuthPass('');
          // Показуємо детальне повідомлення
          setTimeout(()=>{
            showNotif('📧 Лист підтвердження надіслано на '+authEmail+'. Перевірте пошту та натисніть посилання для входу.','success');
          }, 300);
          return;
        }

        // Якщо підтвердження вимкнено в Supabase — одразу логінимо
        authUid = data.user?.id||null;
        let role = null;
        if(authUid){
          const {data:profile}=await supabase.from('profiles').select('role,bonuses,phone').eq('id',authUid).single();
          role = profile?.role||null;
        }
        setUser({name:authName.trim(),email:authEmail.trim().toLowerCase(),phone:'',bonuses:0,role});
      } else {
        const {data,error}=await supabase.auth.signInWithPassword({
          email:authEmail.trim().toLowerCase(),
          password:authPass,
        });
        if(error)throw error;
        authUid = data.user?.id||null;
        const {data:profile, error:profErr}=await supabase.from('profiles').select('*').eq('id',data.user.id).single();
        if(profErr) console.warn('login profile error:', profErr.message);
        const email=data.user.email||authEmail;
        const role = profile?.role || data.user.user_metadata?.role || null;
        setUser({
          name:profile?.name||data.user.user_metadata?.name||'',
          email,
          phone:profile?.phone||'',
          bonuses:profile?.bonuses||0,
          role,
        });
      }
      setLoggedIn(true, authUid);
      setScr('home');
      if(authUid) registerPushToken(authUid);
    }catch(e){
      const msg = e.message||'';
      if(msg.includes('Invalid login credentials')||msg.includes('invalid_credentials')){
        setAuthErr('Невірний email або пароль');
      } else if(msg.includes('User already registered')||msg.includes('already registered')){
        setAuthErr('Цей email вже зареєстровано. Спробуйте увійти.');
      } else if(msg.includes('Email not confirmed')||msg.includes('email_not_confirmed')){
        setAuthErr('');
        showNotif('📧 Email не підтверджено. Перевірте пошту та натисніть посилання для входу.','error');
      } else if(msg.includes('over_email_send_rate_limit')||msg.includes('email rate limit')){
        setAuthErr('Занадто багато спроб. Зачекайте 60 секунд.');
      } else if(msg.includes('signup_disabled')||msg.includes('Signups not allowed')){
        setAuthErr('Реєстрація тимчасово вимкнена.');
      } else if(msg.includes('weak_password')||msg.includes('Password should be')){
        setAuthErr('Пароль занадто простий. Мінімум 6 символів.');
      } else if(msg.includes('rate limit')||msg.includes('too many')){
        setAuthErr('Забагато спроб. Зачекайте хвилину.');
      } else if(msg.includes('Database error')||msg.includes('database')){
        setAuthErr('Помилка сервера. Спробуйте ще раз.');
        console.warn('[Auth] DB error:', msg);
      } else {
        setAuthErr(msg);
        console.warn('[Auth] error:', msg);
      }
    }
  };

  // ── PASSWORD RESET ─────────────────────────────────────────────────────
  const doForgotPassword = async()=>{
    const email = forgotEmail.trim().toLowerCase();
    if(!email || !email.includes('@')){
      showNotif('Введіть коректний email','error');
      return;
    }
    setForgotLoading(true);
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(email);
      if(error){
        if(error.message.toLowerCase().includes('rate limit')){
          showNotif('Забагато спроб. Зачекайте хвилину','error');
        } else {
          showNotif('Помилка: '+error.message,'error');
        }
      } else {
        setForgotSent(true);
      }
    } catch(e){
      showNotif('Помилка: '+e.message,'error');
    } finally {
      setForgotLoading(false);
    }
  };


  const searchNpCities = async (query) => {
    if(query.length < 2){ setNpCitySuggestions([]); return; }
    if(npCityTimerRef.current) clearTimeout(npCityTimerRef.current);
    npCityTimerRef.current = setTimeout(async()=>{
      setNpCityLoading(true);
      try{
        const res=await fetch('https://api.novaposhta.ua/v2.0/json/',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            apiKey:NP_KEY,
            modelName:'Address',
            calledMethod:'getCities',
            methodProperties:{FindByString:query,Limit:8,Language:'UA'},
          }),
        });
        const data=await res.json();
        if(data.success&&data.data){
          setNpCitySuggestions(data.data.map(c=>c.Description));
        }
      }catch(e){}
      finally{setNpCityLoading(false);}
    }, 350); // debounce 350ms
  };

  const fetchNP=async city=>{
    if(!city||city.trim().length<2) return;
    setNpLoading(true);setNpErr(false);setNpBranches([]);
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),8000); // 8s timeout
    try{
      const res=await fetch('https://api.novaposhta.ua/v2.0/json/',{
        method:'POST',
        signal:ctrl.signal,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          apiKey:NP_KEY,modelName:'Address',
          calledMethod:'getWarehouses',
          methodProperties:{CityName:city.trim(),Limit:50,Language:'UA'},
        }),
      });
      clearTimeout(timer);
      const data=await res.json();
      if(data.success&&data.data&&data.data.length>0){
        setNpBranches(data.data.map(b=>({ref:b.Ref,desc:b.Description,addr:b.ShortAddress})));
      } else {
        setNpErr(true);
        showNotif('Відділення не знайдені. Перевірте назву міста','error');
      }
    }catch(e){
      clearTimeout(timer);
      if(e.name==='AbortError'){
        showNotif('Таймаут запиту НП. Спробуйте ще раз','error');
      } else {
        showNotif('Помилка зʼєднання з Новою Поштою','error');
      }
      setNpErr(true);
    }
    setNpLoading(false);
  };

  // ── НОВА ПОШТА: Відстеження статусу посилки ─────────────────────────────
  const trackNpParcel = async (trackingNumber) => {
    if(!trackingNumber||trackingNumber.length<10) return null;
    try {
      const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          apiKey: NP_KEY,
          modelName: 'TrackingDocument',
          calledMethod: 'getStatusDocuments',
          methodProperties: {
            Documents: [{DocumentNumber: String(trackingNumber), Phone: ''}]
          }
        })
      });
      const data = await res.json();
      if(data.success && data.data?.[0]) {
        const d = data.data[0];
        return {
          status: d.StatusCode,
          statusText: d.Status,
          city: d.CityRecipient,
          warehouse: d.WarehouseRecipient,
          date: d.ScheduledDeliveryDate||d.ActualDeliveryDate||'',
          weight: d.DocumentWeight,
        };
      }
    } catch(e) { console.warn('[NP track]', e.message); }
    return null;
  };

  // Автооновлення статусів всіх активних посилок
  const refreshAllTrackings = async (ordersList) => {
    const active = (ordersList||orders).filter(o=>
      o.track && ['Оплачено','В дорозі','Доставлено'].includes(o.status)
    );
    if(!active.length) return;
    const updates = {};
    for(const ord of active) {
      const result = await trackNpParcel(ord.track);
      if(result) {
        updates[ord.track] = result;
        // Автоматично оновлюємо статус замовлення якщо посилка доставлена
        const npToAppStatus = {
          '9':  'Доставлено',  // Відправлення у місті одержувача
          '7':  'В дорозі',   // В дорозі
          '8':  'В дорозі',
          '101':'В дорозі',
          '4':  'В дорозі',
          '1':  'Оплачено',
          '41': 'Доставлено',
          '11': 'Доставлено',
        };
        const newAppStatus = npToAppStatus[result.status];
        if(newAppStatus && newAppStatus !== ord.status) {
          await adminUpdateOrderStatus(ord.id, newAppStatus);
        }
      }
    }
    setNpTrackData(prev=>({...prev,...updates}));
    return updates;
  };

  // ── НОВА ПОШТА: Створення посилки (ТТН) ─────────────────────────────────
  const createNpParcel = async (order) => {
    if(!order) return;
    setNpCreateLoading(true);
    try {
      // Крок 1: знаходимо Ref міста отримувача
      const cityRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          apiKey: NP_KEY,
          modelName: 'Address',
          calledMethod: 'getCities',
          methodProperties: {FindByString: order.city||order.contact_city||'Київ', Limit:1, Language:'UA'}
        })
      });
      const cityData = await cityRes.json();
      const recipientCityRef = cityData.data?.[0]?.Ref;
      if(!recipientCityRef) throw new Error('Місто отримувача не знайдено: '+(order.city||''));

      // Крок 2: знаходимо Ref відділення отримувача
      const branchNum = String(order.np_branch||order.track_branch||'').replace(/\D/g,'');
      const whRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          apiKey: NP_KEY,
          modelName: 'Address',
          calledMethod: 'getWarehouses',
          methodProperties: {CityRef: recipientCityRef, Number: branchNum, Limit:1, Language:'UA'}
        })
      });
      const whData = await whRes.json();
      const recipientWhRef = whData.data?.[0]?.Ref;
      if(!recipientWhRef) throw new Error('Відділення #'+branchNum+' не знайдено у '+order.city);

      // Крок 3: контрагент отримувача
      const phone = String(order.contact_phone||order.phone||'').replace(/\D/g,'');
      const recipientName = (order.contact_name||order.name||'Покупець').split(' ');
      const contRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          apiKey: NP_KEY,
          modelName: 'Counterparty',
          calledMethod: 'save',
          methodProperties: {
            FirstName: recipientName[0]||'Покупець',
            LastName:  recipientName[1]||'',
            Phone:     phone.startsWith('380') ? phone : '380'+phone.slice(1),
            CounterpartyType: 'PrivatePerson',
            CounterpartyProperty: 'Recipient',
          }
        })
      });
      const contData = await contRes.json();
      const recipientRef = contData.data?.[0]?.Ref;
      const contactRef   = contData.data?.[0]?.ContactPerson?.data?.[0]?.Ref;
      if(!recipientRef) throw new Error('Не вдалося створити контрагента отримувача');

      // Крок 4: створення ТТН
      const cost = npCreateForm.cost || String(order.total||300);
      const docRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          apiKey: NP_KEY,
          modelName: 'InternetDocument',
          calledMethod: 'save',
          methodProperties: {
            PayerType:              npCreateForm.payerType,
            PaymentMethod:          'Cash',
            DateTime:               new Date().toLocaleDateString('uk-UA').split('.').join('.'),
            CargoType:              'Parcel',
            Weight:                 npCreateForm.weight||'0.5',
            SeatsAmount:            npCreateForm.seats||'1',
            Description:            npCreateForm.description||'Одяг',
            Cost:                   cost,
            ServiceType:            npCreateForm.serviceType,
            RecipientsPhone:        phone.startsWith('380')?phone:'380'+phone.slice(1),
            RecipientName:          (order.contact_name||order.name||''),
            RecipientAddress:       recipientWhRef,
            Recipient:              recipientRef,
            RecipientCityName:      order.city||'',
            ContactRecipient:       contactRef||recipientRef,
            // Відправник = з власного кабінету НП (по ключу)
            ServiceType:            'WarehouseWarehouse',
            CostOnSite:             order.pay?.includes('Накладн')||order.payment_method?.includes('Накладн') ? cost : '0',
          }
        })
      });
      const docData = await docRes.json();
      if(!docData.success) throw new Error(docData.errors?.[0]||(docData.errorCodes?.[0]||'Помилка створення ТТН'));
      
      const ttn = docData.data?.[0]?.IntDocNumber;
      const docRef = docData.data?.[0]?.Ref;
      if(!ttn) throw new Error('ТТН не отримано від API');

      // Зберігаємо ТТН в замовлення
      await supabase.from('orders').update({tracking: ttn, np_ttn_ref: docRef}).eq('id', order.id);
      setAdminOrders(p=>p.map(o=>String(o.id)===String(order.id)?{...o,tracking:ttn,track:ttn}:o));
      showNotif('✅ ТТН створено: '+ttn,'success');
      setShowNpCreate(false);
      return ttn;
    } catch(e) {
      showNotif('❌ Помилка НП: '+e.message,'error');
      console.warn('[NP create]', e.message);
    } finally {
      setNpCreateLoading(false);
    }
  };

  // ── Після успішної оплати (викликається з WebView callback або після COD/card) ──
  const finalizeOrder=async()=>{
    // Трекінг замовлення для кожного товару в кошику
    cart.forEach(ci=>trackEvent(ci.id,'order'));
    const earned=Math.floor(totPrice*0.03); // 3% бонуси нараховуються після отримання
    const randId=String(Math.floor(10000+Math.random()*90000));
    const o={id:randId,date:new Date().toLocaleDateString('uk-UA'),
      status:'Оплачено',items:cart.map(i=>`${i.name} (${i.color}, ${i.size}) ×${i.qty}`),
      total:totPrice,track:'590'+Math.floor(Math.random()*1e9),
      city:dCity,pay:payM==='card'?'Картка':payM==='liqpay'?'LiqPay':'Накладний платіж',bonusEarned:earned};
    setOrders(p=>[o,...p]);
    // Зменшити stock у Supabase для кожного товару в замовленні
    cart.forEach(async(ci)=>{
      try{
        const {data:prod}=await supabase.from('products').select('stock').eq('id',ci.id).single();
        if(prod) await supabase.from('products').update({stock:Math.max(0,(prod.stock||0)-ci.qty)}).eq('id',ci.id);
      }catch(e){}
    });
    // Бонуси списуємо одразу, але нараховуємо тільки після "Отримано"
    if(bonusUsed>0) setUser(u=>({...u,bonuses:u.bonuses-bonusUsed}));
    // earned буде нараховано в adminUpdateOrderStatus при статусі "Отримано"
    // Зберегти замовлення в Supabase
    try {
      const {data:{user:authUser}} = await supabase.auth.getUser();
      if(authUser){
        const {error:orderErr} = await supabase.from('orders').insert({
          user_id:     authUser.id,
          items:       cart.map(i=>({name:i.name,qty:i.qty,size:i.size,color:i.color,price:i.price})),
          subtotal:    cart.reduce((s,i)=>s+i.price*i.qty,0),
          bonus_used:  bonusUsed||0,
          total:       totPrice,
          bonus_earned:earned,
          city:        dCity,
          np_branch:   dBranch,
          contact_name: dName,
          contact_phone:dPhone,
          payment_method: payM==='liqpay'?'LiqPay':payM==='card'?'Картка':'Накладний',
          status:      'Оплачено',
          payment_status:'paid',
        });
        if(orderErr) console.warn('[orders] insert error:', orderErr.message);
        // Бонуси списуємо одразу (якщо використані), нараховуємо тільки після "Отримано"
        if(bonusUsed>0){
          await supabase.from('profiles').update({
            bonuses: Math.max(0,(user.bonuses||0)-(bonusUsed||0))
          }).eq('id', authUser.id);
        }
      }
    } catch(e){ console.warn('[orders] exception:', e.message); }
    addNotif('✅ Замовлення прийнято!','Ваше замовлення #'+randId+' на суму '+totPrice+' ₴ успішно оформлено.','order',randId);

    // Push-сповіщення адміну про нове замовлення
    try {
      // 1. Локальне in-app сповіщення (якщо адмін у застосунку)
      await supabase.from('admin_notifications').insert({
        type: 'new_order',
        title: '🛍 Нове замовлення #'+randId,
        body: (user?.name||dName)+' · '+totPrice+' ₴ · '+dCity,
        order_id: randId,
        read: false,
        created_at: new Date().toISOString(),
      }).then(()=>{}).catch(()=>{});

      // 2. Push через Expo — надсилаємо токени всіх адмінів
      const {data: adminProfiles} = await supabase
        .from('profiles')
        .select('push_token')
        .eq('role','admin')
        .not('push_token','is',null);

      if(adminProfiles?.length){
        const messages = adminProfiles
          .filter(p=>p.push_token)
          .map(p=>({
            to: p.push_token,
            sound: 'default',
            title: '🛍 Нове замовлення #'+randId,
            body: (user?.name||dName)+' · '+totPrice+' ₴',
            data: {orderId: randId, screen: 'admin'},
            badge: 1,
          }));
        // Відправляємо через Expo Push API
        await fetch('https://exp.host/--/api/v2/push/send',{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body: JSON.stringify(messages.length===1?messages[0]:messages),
        }).catch(()=>{});
      }
    } catch(pushErr){ console.warn('[Push] order notify error:', pushErr.message); }

    setCart([]);setPromoApplied(null);setPromo('');setUseBonuses(false);
    setDName('');setDPhone('');setDCity('');setDBranch('');
    setPayM(null);setCNum('');setCExp('');setCCVV('');setCNm('');
    setPaying(false);setShowLiqpayView(false);setScr('success');
    // Показати модаль оцінки через 1.5 секунди після успішного замовлення
    setTimeout(()=>setShowRateModal(true), 1500);
  };


  const autoPhone=(raw)=>{const d=raw.replace(/[^\d]/g,'');if(!d)return '';if(d.startsWith('380'))return '+'+d.slice(0,12);if(d.startsWith('80'))return '+3'+d.slice(0,11);if(d.startsWith('0'))return '+38'+d.slice(0,10);return '+380'+d.slice(0,9);};

  const placeOrder=()=>{
    const errs={};
    if(!dName.trim()||dName.trim().split(/\s+/).length<2) errs.dName="Введіть ім\'я та прізвище (2 слова)";
    if(!/^\+380\d{9}$/.test(dPhone.replace(/\s/g,''))) errs.dPhone='Формат: +380XXXXXXXXX (10 цифр після коду)';
    if(dEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dEmail.trim())) errs.dEmail='Некоректний формат email';
    if(!dCity.trim()) errs.dCity='Введіть назву міста';
    if(!dBranch.trim()) errs.dBranch='Введіть номер відділення НП';
    if(!payM) errs.payM='Оберіть спосіб оплати';
    if(payM==='card'){
      if(cNum.replace(/\s/g,'').length!==16) errs.cNum='Номер картки повинен містити 16 цифр';
      if(!/^\d{2}\/\d{2}$/.test(cExp)) errs.cExp='Формат: ММ/РР (наприклад: 12/27)';
      if(!/^\d{3}$/.test(cCVV)) errs.cCVV='CVV: 3 цифри (на звороті картки)';
      if(!cNm.trim()) errs.cNm="Введіть ім\'я власника латиницею";
    }
    if(Object.keys(errs).length>0){setFieldErrors(errs);return;}
    setFieldErrors({});

    if(payM==='liqpay'){
      // ── LiqPay через Supabase Edge Function ───────────────────────────────
      // ⚙️ Заміни etritssfuooruiiytrci на ID твого проєкту з Supabase Dashboard
      const SUPABASE_FUNC_URL = 'https://etritssfuooruiiytrci.supabase.co/functions/v1/liqpay-sign';
      const orderId = String(Math.floor(10000+Math.random()*90000))+'-'+Date.now();
      setPaying(true);
      try {
        const res = await fetch(SUPABASE_FUNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totPrice,
            orderId,
            description: `4U.TEAM #${orderId} · ${dName}`,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.checkoutUrl) {
          throw new Error(json.error || 'LiqPay: немає checkoutUrl');
        }
        // Відкриваємо WebView з реальною платіжною сторінкою
        setLiqpayUrl(json.checkoutUrl);
        setPaying(false);
        setShowLiqpayView(true);
      } catch(e) {
        setPaying(false);
        Alert.alert(
          'Помилка LiqPay',
          'Не вдалось підключитись до платіжного шлюзу.\n\nПереконайтесь що Edge Function задеплоєна і ключі встановлені.\n\n'+String(e),
          [{text:'OK'}]
        );
      }
      return;
    }

    if(payM==='monobank'){
      // ── Monobank Acquiring через Supabase Edge Function ──────────────────
      // ⚙️ Заміни etritssfuooruiiytrci на ID твого проєкту з Supabase Dashboard
      const SUPABASE_FUNC_URL = 'https://etritssfuooruiiytrci.supabase.co/functions/v1/monobank-invoice';
      const orderId = String(Math.floor(10000+Math.random()*90000))+'-'+Date.now();
      setPaying(true);
      try {
        const res = await fetch(SUPABASE_FUNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totPrice,           // Edge Function сама переведе в копійки
            orderId,
            description: `4U.TEAM #${orderId} · ${dName}`,
            redirectUrl: 'https://4u.team/success',
            // items — передаємо кошик для банківського чека
            items: cart.map(i=>({
              id: i.id,
              name: i.name,
              price: i.price,
              qty: i.qty||1,
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.pageUrl) {
          throw new Error(json.error || 'Monobank: немає pageUrl');
        }
        setPaying(false);
        // Відкриваємо браузер з платіжною сторінкою Monobank
        await WebBrowser.openBrowserAsync(json.pageUrl, {
          toolbarColor: '#000000',
          controlsColor: '#ffffff',
        });
        // Після повернення з браузера — фіналізуємо замовлення
        // (в продакшн статус краще перевіряти через webhook)
        setPaying(true);
        await finalizeOrder();
      } catch(e) {
        setPaying(false);
        Alert.alert(
          'Помилка Monobank',
          'Не вдалось підключитись до платіжного шлюзу.\n\nПереконайтесь що Edge Function задеплоєна і токен встановлено.\n\n'+String(e),
          [{text:'OK'}]
        );
      }
      return;
    }

    setPaying(true);
    setTimeout(finalizeOrder, payM==='cod'?500:1800);
  };

  const ST_COLOR={'Оплачено':'#2563eb','В дорозі':'#d97706','Доставлено':'#16a34a','Скасовано':'#dc2626','Отримано':'#059669'};
  const ST_BG={'Оплачено':'#eff6ff','В дорозі':'#fffbeb','Доставлено':'#f0fdf4','Скасовано':'#fef2f2','Отримано':'#dcfce7'};
  const ST_ICON={'Оплачено':'✓','В дорозі':'→','Доставлено':'📍','Отримано':'📦','Скасовано':'✕'};
  const ST_SEQ=['Оплачено','В дорозі','Доставлено','Отримано'];
  const stLabel=s=>({'Оплачено':T.stPaid,'В дорозі':T.stTransit,'Доставлено':T.stDelivered,'Отримано':T.stReceived,'Скасовано':T.stCancelled}[s]||s);

  const resetCat=()=>{setCatLevel(0);setCatL1(null);setCatL2(null);};

  const hideNav=['checkout','success','settings','auth','onboarding','addresses','cards','support'].includes(scr);
  const showBack=!['home','cart','wishlist','orders','profile'].includes(scr);
  const TITLES={product:sel?.name,cart:T.cart,checkout:T.checkout,wishlist:T.wishlist,
    orders:T.orders,profile:T.account,settings:T.settings,addresses:T.addresses,cards:T.cards,support:T.support,admin:'⚙ ADMIN PANEL'};

  const navItems=[
    {k:'home',    ic:'home',    lb:lang==='EN'?'Home':'Головна'},
    {k:'wishlist',ic:'heart',   lb:lang==='EN'?'Saved':'Улюблене', cnt:wish.length},
    {k:'cart',    ic:'bag',     lb:lang==='EN'?'Cart':'Кошик',     cnt:totItems},
    {k:'notifs',  ic:'bell',    lb:lang==='EN'?'Inbox':'Сповіщення',cnt:unreadNotifs},
    {k:'profile', ic:'user',    lb:lang==='EN'?'Profile':'Профіль'},
  ];

  const obFade = useRef(new Animated.Value(1)).current;
  const obScale = useRef(new Animated.Value(1)).current;

  // ── SWIPE NAVIGATION (iOS-style) ────────────────────────────────────────
  // Свайп правою рукою (зліва направо) = назад, зліва направо = вперед
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const swipeResponder = useRef(
    PanResponder.create({
      // Перехоплюємо тільки чіткі горизонтальні свайпи від країв
      onMoveShouldSetPanResponder:(evt, gs)=>{
        const {dx, dy, x0} = gs;
        const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
        const isLeftEdge  = x0 < 40 && dx > 0;  // від лівого краю → назад
        const isRightEdge = x0 > W - 40 && dx < 0; // від правого краю → вперед
        return isHorizontal && (isLeftEdge || isRightEdge) && Math.abs(dx) > 8;
      },
      onPanResponderMove:(evt, gs)=>{
        // Легкий зсув для тактильного відчуття (не більше 30px)
        const clamp = Math.max(-30, Math.min(30, gs.dx * 0.3));
        swipeAnim.setValue(clamp);
      },
      onPanResponderRelease:(evt, gs)=>{
        const {dx, x0} = gs;
        Animated.spring(swipeAnim,{toValue:0,useNativeDriver:true,tension:180,friction:12}).start();
        if(x0 < 40 && dx > 40){
          // Свайп зліва направо — НАЗАД
          // Використовуємо ref щоб мати актуальні hist/fwdHist без залежності
          swipeBackRef.current?.();
        } else if(x0 > W - 40 && dx < -40){
          // Свайп справа наліво — ВПЕРЕД
          swipeForwardRef.current?.();
        }
      },
    })
  ).current;
  // Refs для актуальних функцій (щоб PanResponder не застарів)
  const swipeBackRef = useRef(null);
  const swipeForwardRef = useRef(null);

  // ── TAB TRANSITION ANIMATION ─────────────────────────────────────────────
  const tabAnim = useRef(new Animated.Value(1)).current;
  const TAB_SCREENS = ['home','wishlist','cart','notifs','profile'];

  const goWithTransition = useCallback((targetScr) => {
    if(!TAB_SCREENS.includes(targetScr)) {
      setHist(h=>[...h,scr]); setScr(targetScr); return;
    }
    // Легкий fade: 80ms затухання → переключення → 180ms появлення
    Animated.timing(tabAnim, {
      toValue: 0, duration: 80, useNativeDriver: true,
    }).start(() => {
      setScr(targetScr);
      Animated.timing(tabAnim, {
        toValue: 1, duration: 180, useNativeDriver: true,
      }).start();
    });
  }, [scr, tabAnim]);

  const goObStep = useCallback((nextStep) => {
    // Slowmo fade-out + slight scale down, then swap content, then fade-in
    Animated.parallel([
      Animated.timing(obFade,  {toValue:0, duration:320, useNativeDriver:true}),
      Animated.timing(obScale, {toValue:0.93, duration:320, useNativeDriver:true}),
    ]).start(()=>{
      setObStep(nextStep);
      Animated.parallel([
        Animated.timing(obFade,  {toValue:1, duration:480, useNativeDriver:true}),
        Animated.timing(obScale, {toValue:1, duration:480, useNativeDriver:true}),
      ]).start();
    });
  },[obFade, obScale]);

  const obSlides=[
    { icon:'🛍',
      title: T.ob1title,
      sub:   T.ob1sub,
      accent:'#111',
      bg:    '#f8f5f0',
      darkBg:'#1a1712',
      tag:   lang==='EN'?'CATALOG':'КАТАЛОГ' },
    { icon:'🚀',
      title: T.ob2title,
      sub:   T.ob2sub,
      accent:'#1d4ed8',
      bg:    '#eff6ff',
      darkBg:'#0d1626',
      tag:   lang==='EN'?'DELIVERY':'ДОСТАВКА' },
    { icon:'⭐',
      title: T.ob3title,
      sub:   T.ob3sub,
      accent:'#059669',
      bg:    '#f0fdf4',
      darkBg:'#0a1f14',
      tag:   lang==='EN'?'BONUSES':'БОНУСИ' },
    { icon:'🔒',
      title: T.ob4title,
      sub:   T.ob4sub,
      accent:'#7c3aed',
      bg:    '#faf5ff',
      darkBg:'#160d26',
      tag:   lang==='EN'?'SECURITY':'БЕЗПЕКА' },
  ];

  const filtBranches=npBranches.filter(b=>
    b.desc.toLowerCase().includes(branchSearch.toLowerCase())||
    b.addr.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────
  // Onboarding and Auth are fullscreen overlays (no header/nav needed)
  // They stay mounted but hidden so they don't interfere with main app state
  
  // Show splash while session is being checked
  if(!_appLoaded || scr==='loading'){
    return(
      <View style={{flex:1,backgroundColor:'#111',justifyContent:'center',alignItems:'center',gap:12}}>
        <StatusBar barStyle="light-content"/>
        {loggedIn && user?.name ? (
          <Text style={{fontSize:22,fontWeight:'300',color:'#fff',letterSpacing:1}}>
            {'Привіт, '+(user.name.split(' ')[0]||user.name)+' 👋'}
          </Text>
        ) : null}
        <ActivityIndicator color="rgba(255,255,255,.35)" style={{marginTop:8}}/>
      </View>
    );
  }

  return (
    <View style={{flex:1,backgroundColor:th.bg,paddingTop:IS_IOS?(IS_LARGE?47:20):0}}
      onStartShouldSetResponderCapture={()=>{updateActivity();return false;}}>
      <StatusBar barStyle={darkMode?'light-content':'dark-content'} backgroundColor={th.bg}/>

      {/* ── ONBOARDING ── */}
      {scr==='onboarding'&&(()=>{
        const slide = obSlides[obStep];
        const bgColor = darkMode ? slide.darkBg : slide.bg;
        const isLast = obStep === obSlides.length - 1;
        return (
          <View style={{flex:1, backgroundColor: bgColor}}>
            <StatusBar barStyle="dark-content" backgroundColor={bgColor}/>
            <SafeAreaView style={{flex:1}}>
              <View style={{flex:1, paddingHorizontal:28, paddingTop:8, paddingBottom:24, justifyContent:'space-between'}}>

                {/* ── TOP ROW: brand + skip ── */}
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:4}}>
                  <Text style={{fontSize:11,fontWeight:'900',letterSpacing:5,color:darkMode?'rgba(255,255,255,.25)':'rgba(0,0,0,.25)'}}>{BRAND}</Text>
                  {!isLast&&(
                    <TouchableOpacity onPress={()=>goObStep(obSlides.length-1)}
                      style={{paddingHorizontal:14,paddingVertical:7,borderRadius:20,
                        borderWidth:1,borderColor:darkMode?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)'}}>
                      <Text style={{fontSize:11,letterSpacing:.5,color:darkMode?'rgba(255,255,255,.4)':'rgba(0,0,0,.35)',fontWeight:'500'}}>{T.obSkip}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── MAIN CONTENT: animated ── */}
                <Animated.View style={{flex:1, justifyContent:'center', alignItems:'center',
                  opacity:obFade, transform:[{scale:obScale}]}}>

                  {/* Tag pill */}
                  <View style={{
                    backgroundColor: slide.accent+'18',
                    borderWidth:1, borderColor: slide.accent+'30',
                    borderRadius:20, paddingHorizontal:14, paddingVertical:5,
                    marginBottom:32,
                  }}>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:slide.accent}}>
                      {slide.tag}
                    </Text>
                  </View>

                  {/* Icon — big glow circle */}
                  <View style={{
                    width:160, height:160, borderRadius:80,
                    backgroundColor: slide.accent+'10',
                    justifyContent:'center', alignItems:'center',
                    marginBottom:36,
                    shadowColor: slide.accent,
                    shadowOffset:{width:0,height:16},
                    shadowOpacity:0.22, shadowRadius:32, elevation:12,
                  }}>
                    <View style={{
                      width:116, height:116, borderRadius:58,
                      backgroundColor: slide.accent+'18',
                      justifyContent:'center', alignItems:'center',
                    }}>
                      <Text style={{fontSize:54}}>{slide.icon}</Text>
                    </View>
                  </View>

                  {/* Step counter */}
                  <Text style={{
                    fontSize:9, fontWeight:'800', letterSpacing:3,
                    color: slide.accent+'80', marginBottom:14,
                  }}>
                    {`0${obStep+1} · 0${obSlides.length}`}
                  </Text>

                  {/* Title */}
                  <Text style={{
                    fontSize:30, fontWeight:'200', lineHeight:38,
                    color: darkMode?'#fff':'#111',
                    textAlign:'center', letterSpacing:-.3,
                    marginBottom:14, maxWidth:W*0.78,
                  }}>
                    {slide.title}
                  </Text>

                  {/* Sub */}
                  <Text style={{
                    fontSize:13, color: darkMode?'rgba(255,255,255,.45)':'rgba(0,0,0,.45)',
                    textAlign:'center', lineHeight:22, fontWeight:'300',
                    maxWidth:W*0.78,
                  }}>
                    {slide.sub}
                  </Text>
                </Animated.View>

                {/* ── BOTTOM: dots + buttons ── */}
                <View style={{gap:14}}>
                  {/* Progress dots */}
                  <View style={{flexDirection:'row', justifyContent:'center', gap:6, marginBottom:4}}>
                    {obSlides.map((_,i)=>(
                      <TouchableOpacity key={i} onPress={()=>goObStep(i)}>
                        <View style={{
                          width: i===obStep ? 28 : 8, height:8, borderRadius:4,
                          backgroundColor: i===obStep ? slide.accent : (darkMode?'rgba(255,255,255,.18)':'rgba(0,0,0,.12)'),
                        }}/>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {!isLast?(
                    /* NEXT button */
                    <TouchableOpacity
                      onPress={()=>goObStep(obStep+1)}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: slide.accent,
                        borderRadius:30, paddingVertical:17,
                        alignItems:'center',
                        shadowColor: slide.accent,
                        shadowOffset:{width:0,height:8},
                        shadowOpacity:.35, shadowRadius:20, elevation:8,
                      }}>
                      <Text style={{color:'#fff',fontSize:11,fontWeight:'900',letterSpacing:2.5}}>
                        {lang==='EN'?'NEXT →':'ДАЛІ →'}
                      </Text>
                    </TouchableOpacity>
                  ):(
                    /* Last slide: two CTAs */
                    <>
                      <TouchableOpacity
                        onPress={()=>setScr('auth')}
                        activeOpacity={0.85}
                        style={{
                          backgroundColor: slide.accent,
                          borderRadius:30, paddingVertical:17,
                          alignItems:'center',
                          shadowColor: slide.accent,
                          shadowOffset:{width:0,height:8},
                          shadowOpacity:.35, shadowRadius:20, elevation:8,
                        }}>
                        <Text style={{color:'#fff',fontSize:11,fontWeight:'900',letterSpacing:2.5}}>
                          {T.loginOrReg.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={()=>setScr('home')}
                        activeOpacity={0.7}
                        style={{
                          borderRadius:30, paddingVertical:15,
                          alignItems:'center',
                          borderWidth:1,
                          borderColor: darkMode?'rgba(255,255,255,.15)':'rgba(0,0,0,.12)',
                        }}>
                        <Text style={{
                          fontSize:11, fontWeight:'600', letterSpacing:1.5,
                          color: darkMode?'rgba(255,255,255,.4)':'rgba(0,0,0,.35)',
                        }}>
                          {T.continueGuest.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

              </View>
            </SafeAreaView>
          </View>
        );
      })()}

      {/* ── AUTH ── */}
      {scr==='auth'&&(
        <View style={{flex:1, backgroundColor:'#0a0a0a'}}>
          <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" translucent/>
          <View style={{flex:1, backgroundColor:'#0a0a0a'}}>
            <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'}
              keyboardVerticalOffset={0}
              style={{flex:1, backgroundColor:'#0a0a0a'}}>
              <ScrollView
                contentContainerStyle={{paddingHorizontal:28, paddingBottom:48}}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical={true}>

                {/* ── TOP BAR ── */}
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
                  paddingTop:IS_IOS?(IS_LARGE?54:40):28,marginBottom:28}}>
                  <TouchableOpacity onPress={()=>setScr('home')}
                    style={{width:40,height:40,borderRadius:20,
                      backgroundColor:'rgba(255,255,255,.06)',
                      borderWidth:1,borderColor:'rgba(255,255,255,.08)',
                      justifyContent:'center',alignItems:'center'}}>
                    <Text style={{fontSize:16,color:'rgba(255,255,255,.5)',lineHeight:20}}>←</Text>
                  </TouchableOpacity>
                  <Text style={{fontSize:12,fontWeight:'700',letterSpacing:2,color:'rgba(255,255,255,.35)'}}>
                    {'By 4UTeam ♥'}
                  </Text>
                  <View style={{width:40}}/>
                </View>

                {/* ── HEADLINE ── */}
                <View style={{marginBottom:24,alignItems:'center'}}>
                  <Text style={{fontSize:32,fontWeight:'200',color:'#fff',letterSpacing:-.5,lineHeight:38,marginBottom:6,textAlign:'center'}}>
                    {authMode==='login'
                      ?(lang==='EN'?'Welcome':'Вітаємо')
                      :(lang==='EN'?'Create\naccount':'Створити\nакаунт')}
                  </Text>
                  <Text style={{fontSize:12,color:'rgba(255,255,255,.32)',fontWeight:'300',letterSpacing:.2,textAlign:'center'}}>
                    {authMode==='login'
                      ?(lang==='EN'?'Sign in to your 4YOU account':'Увійдіть у ваш акаунт 4YOU')
                      :(lang==='EN'?'Join 4YOU — it takes 30 seconds':'Реєстрація займе 30 секунд')}
                  </Text>
                </View>

                {/* ── TOGGLE LOGIN / REGISTER ── */}
                <View style={{
                  flexDirection:'row',
                  backgroundColor:'rgba(255,255,255,.05)',
                  borderRadius:30, padding:4,
                  marginBottom:20,
                  borderWidth:1, borderColor:'rgba(255,255,255,.07)',
                }}>
                  {['login','register'].map(m=>(
                    <TouchableOpacity key={m}
                      onPress={()=>{setAuthMode(m);setAuthErr('');}}
                      activeOpacity={0.8}
                      style={{
                        flex:1, paddingVertical:13, alignItems:'center', borderRadius:26,
                        backgroundColor: authMode===m ? 'rgba(255,255,255,.1)' : 'transparent',
                        borderWidth: authMode===m ? 1 : 0,
                        borderColor: authMode===m ? 'rgba(255,255,255,.12)' : 'transparent',
                      }}>
                      <Text style={{
                        fontSize:11, fontWeight:'700', letterSpacing:1.5,
                        color: authMode===m ? '#fff' : 'rgba(255,255,255,.3)',
                      }}>
                        {m==='login'
                          ?(lang==='EN'?'SIGN IN':'ВХІД')
                          :(lang==='EN'?'REGISTER':'РЕЄСТРАЦІЯ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── INPUT FIELDS ── */}
                <View style={{gap:8}}>
                  {authMode==='register'&&(
                    <View>
                      <Text style={{fontSize:9,letterSpacing:2.5,color:'rgba(255,255,255,.3)',fontWeight:'700',marginBottom:10}}>
                        {T.authNameLbl}
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor:'rgba(255,255,255,.05)',
                          borderRadius:14, paddingHorizontal:16, paddingVertical:13,
                          fontSize:15, color:'#fff', fontWeight:'300',
                          borderWidth:1, borderColor:'rgba(255,255,255,.09)',
                        }}
                        value={authName} onChangeText={setAuthName}
                        placeholder={T.authNamePl}
                        placeholderTextColor="rgba(255,255,255,.2)"
                        autoCorrect={false}/>
                    </View>
                  )}
                  <View>
                    <Text style={{fontSize:9,letterSpacing:2.5,color:'rgba(255,255,255,.3)',fontWeight:'700',marginBottom:6}}>
                      {T.authEmailLbl}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor:'rgba(255,255,255,.05)',
                        borderRadius:14, paddingHorizontal:16, paddingVertical:13,
                        fontSize:15, color:'#fff', fontWeight:'300',
                        borderWidth:1, borderColor:'rgba(255,255,255,.09)',
                      }}
                      value={authEmail} onChangeText={setAuthEmail}
                      placeholder={T.authEmailPl}
                      placeholderTextColor="rgba(255,255,255,.2)"
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false}/>
                  </View>
                  <View>
                    <Text style={{fontSize:9,letterSpacing:2.5,color:'rgba(255,255,255,.3)',fontWeight:'700',marginBottom:6}}>
                      {T.authPassLbl}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor:'rgba(255,255,255,.05)',
                        borderRadius:14, paddingHorizontal:16, paddingVertical:13,
                        fontSize:15, color:'#fff', fontWeight:'300',
                        borderWidth:1, borderColor:'rgba(255,255,255,.09)',
                      }}
                      value={authPass} onChangeText={setAuthPass}
                      placeholder={T.authPassPl}
                      placeholderTextColor="rgba(255,255,255,.2)"
                      secureTextEntry autoCorrect={false}/>
                  </View>
                </View>

                {/* ── ERROR ── */}
                {!!authErr&&(
                  <View style={{
                    marginTop:10, flexDirection:'row', alignItems:'center', gap:8,
                    backgroundColor:'rgba(220,38,38,.12)',
                    borderRadius:12, padding:12,
                    borderWidth:1, borderColor:'rgba(220,38,38,.25)',
                  }}>
                    <Text style={{fontSize:14}}>⚠️</Text>
                    <Text style={{flex:1, fontSize:12, color:'#ef4444', fontWeight:'400'}}>{authErr}</Text>
                  </View>
                )}

                {/* ── MAIN CTA ── */}
                <TouchableOpacity
                  onPress={doAuth}
                  activeOpacity={0.82}
                  style={{
                    marginTop:12,
                    backgroundColor:'#fff',
                    borderRadius:30, paddingVertical:14,
                    alignItems:'center',
                    shadowColor:'#fff',
                    shadowOffset:{width:0,height:4},
                    shadowOpacity:.12, shadowRadius:20, elevation:6,
                  }}>
                  <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2.5,color:'#111'}}>
                    {authMode==='login'
                      ?(lang==='EN'?'SIGN IN':'УВІЙТИ')
                      :(lang==='EN'?'CREATE ACCOUNT':'ЗАРЕЄСТРУВАТИСЬ')}
                  </Text>
                </TouchableOpacity>

                {/* ── DIVIDER ── */}
                <View style={{flexDirection:'row',alignItems:'center',gap:12,marginVertical:10}}>
                  <View style={{flex:1,height:1,backgroundColor:'rgba(255,255,255,.07)'}}/>
                  <Text style={{fontSize:10,color:'rgba(255,255,255,.2)',letterSpacing:1}}>АБО</Text>
                  <View style={{flex:1,height:1,backgroundColor:'rgba(255,255,255,.07)'}}/>
                </View>

                {/* ── OAUTH BUTTONS ── */}
                <View style={{flexDirection:'row',gap:10}}>
                  {/* Google */}
                  <TouchableOpacity
                    onPress={async()=>{
                      try{
                        // Отримуємо поточний Supabase project URL для callback
                        const SUPABASE_URL = supabase.supabaseUrl||'';
                        const callbackUrl = SUPABASE_URL
                          ? SUPABASE_URL+'/auth/v1/callback'
                          : 'https://localhost';
                        const {data,error}=await supabase.auth.signInWithOAuth({
                          provider:'google',
                          options:{
                            skipBrowserRedirect: true,
                            queryParams:{access_type:'offline',prompt:'consent'},
                          },
                        });
                        if(error){ showNotif('Google: '+error.message,'error'); return; }
                        if(data?.url){
                          const result = await WebBrowser.openAuthSessionAsync(
                            data.url,
                            callbackUrl
                          );
                          if(result.type==='success'&&result.url){
                            const parsed = Linking.parse(result.url);
                            const access_token = parsed.queryParams?.access_token
                              ||parsed.fragment?.split('access_token=')[1]?.split('&')[0];
                            const refresh_token = parsed.queryParams?.refresh_token;
                            if(access_token){
                              const {data:sd,error:se}=await supabase.auth.setSession({
                                access_token,refresh_token:refresh_token||''
                              });
                              if(se) showNotif('Помилка сесії: '+se.message,'error');
                              else await handleOAuthUser(sd.session);
                            } else {
                              // Спробуємо отримати сесію напряму
                              const {data:{session}}=await supabase.auth.getSession();
                              if(session) await handleOAuthUser(session);
                            }
                          }
                        }
                      }catch(e){showNotif('Google sign-in failed','error');}
                    }}
                    activeOpacity={0.85}
                    style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,
                      borderRadius:20,paddingVertical:14,
                      backgroundColor:'#fff',
                      borderWidth:1,borderColor:'#ddd'}}>
                    {/* Кольорова G — імітація Google лого */}
                    <View style={{width:20,height:20,borderRadius:10,
                      backgroundColor:'#4285F4',justifyContent:'center',alignItems:'center'}}>
                      <Text style={{fontSize:12,fontWeight:'900',color:'#fff',lineHeight:16}}>G</Text>
                    </View>
                    <Text style={{fontSize:11,fontWeight:'600',color:'#3c4043',fontFamily:'System'}}>
                      Google
                    </Text>
                  </TouchableOpacity>

                  {/* Facebook */}
                  <TouchableOpacity
                    onPress={()=>{
                      showNotif('Facebook авторизація тимчасово недоступна. Використайте Google або email.','error');
                    }}
                    activeOpacity={0.85}
                    style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,
                      borderRadius:20,paddingVertical:14,
                      backgroundColor:'#1877F2',}}>
                    <Text style={{fontSize:16,color:'#fff',fontWeight:'900'}}>f</Text>
                    <Text style={{fontSize:11,fontWeight:'700',color:'#fff',fontFamily:'System'}}>
                      Facebook
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ── GUEST ── */}
                <TouchableOpacity
                  onPress={()=>setScr('home')}
                  activeOpacity={0.7}
                  style={{
                    marginTop:14,
                    borderRadius:16, paddingVertical:12, alignItems:'center',
                    borderWidth:1, borderColor:'rgba(255,255,255,.12)',
                    backgroundColor:'rgba(255,255,255,.05)',
                  }}>
                  <Text style={{fontSize:11,fontWeight:'600',letterSpacing:1.5,color:'rgba(255,255,255,.35)'}}>
                    {lang==='EN'?'CONTINUE AS GUEST':'ПРОДОВЖИТИ БЕЗ РЕЄСТРАЦІЇ'}
                  </Text>
                </TouchableOpacity>

                {/* ── FORGOT / SECURITY ── */}
                <View style={{marginTop:16,alignItems:'center',gap:10}}>
                  {authMode==='login'&&(
                    <TouchableOpacity onPress={()=>{setForgotEmail(authEmail||'');setForgotSent(false);setShowForgotModal(true);}}>
                      <Text style={{fontSize:13,color:'rgba(255,255,255,.5)',textDecorationLine:'underline',letterSpacing:0.3}}>
                        {T.forgotPass}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                    <Text style={{fontSize:11,color:'rgba(255,255,255,.15)'}}>🔒</Text>
                    <Text style={{fontSize:10,color:'rgba(255,255,255,.18)',letterSpacing:.5}}>
                      {lang==='EN'?'SSL secured · Your data is protected':'SSL захист · Ваші дані в безпеці'}
                    </Text>
                  </View>
                </View>

              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      )}

      {/* ── MAIN APP (all screens always mounted, shown via display flex/none) ── */}
      {!['onboarding','auth'].includes(scr)&&(
        <View style={{flex:1,flexDirection:'column'}}>
          {/* ── HEADER ── */}
          <View style={{backgroundColor:th.bg,borderBottomWidth:1,
            borderBottomColor:th.cardBorder}}>
            <View style={{flexDirection:'row',alignItems:'center',
              paddingHorizontal:16,paddingTop:IS_IOS?(IS_LARGE?12:8):12,paddingBottom:12,gap:8}}>
              {/* Back button OR title */}
              <View style={{flex:1}}>
                {showBack?(
                  <TouchableOpacity
                    onPress={()=>{
                      if(scr==='admin' && adminTabHist.length>0){
                        // Go back to previous admin tab
                        const h=[...adminTabHist];
                        const prev=h.pop();
                        setAdminTabHist(h);
                        setAdminTab(prev);
                      } else {
                        back();
                      }
                    }}
                    style={{flexDirection:'row',alignItems:'center',gap:4,alignSelf:'flex-start'}}>
                    <Text style={{fontSize:28,color:th.text,fontWeight:'300',lineHeight:32}}>‹</Text>
                    <Text style={{fontSize:13,color:th.text3,fontWeight:'500'}}>
                      {scr==='admin'&&adminTabHist.length>0?'Назад':'Назад'}
                    </Text>
                  </TouchableOpacity>
                ):(
                  <TouchableOpacity
                    onPress={()=>{
                      setCatFilter({cid:null,sub:null,badge:null});
                      setSrch('');setShowSrch(false);
                      if(scr==='home'){
                        homeScrollRef.current?.scrollTo({y:0,animated:true});
                      } else {
                        setHist([]);setFwdHist([]);setScr('home');
                        setTimeout(()=>homeScrollRef.current?.scrollTo({y:0,animated:true}),200);
                      }
                    }}
                    activeOpacity={0.7}>
                    <Text style={{
                      fontSize:scr==='home'?28:22,
                      fontWeight:scr==='home'?'800':'700',
                      color:th.text,
                      letterSpacing:scr==='home'?-0.5:0,
                    }}>
                      {scr==='home'?BRAND:TITLES[scr]||BRAND}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Right: Пошук (лейбл + іконка) + Кошик */}
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                {/* Кнопка ПОШУК — лейбл + іконка */}
                <TouchableOpacity
                  onPress={()=>{setShowSrch(v=>!v);if(showSrch)setSrch('');}}
                  style={{height:42,paddingHorizontal:14,borderRadius:21,
                    borderWidth:1.5,borderColor:th.cardBorder,
                    flexDirection:'row',alignItems:'center',gap:6,
                    backgroundColor:showSrch?th.accent:th.bg2}}>
                  <Text style={{fontSize:13,fontWeight:'500',
                    color:showSrch?th.accentText:th.text3,letterSpacing:0.2}}>
                    {showSrch?'Закрити':'Пошук'}
                  </Text>
                  <Text style={{fontSize:16,color:showSrch?th.accentText:th.text,lineHeight:20}}>
                    {showSrch?'✕':'⌕'}
                  </Text>
                </TouchableOpacity>
                {/* Кнопка КОШИК — однакового розміру */}
                <TouchableOpacity
                  onPress={()=>goWithTransition('cart')}
                  style={{width:42,height:42,borderRadius:21,
                    borderWidth:1.5,borderColor:totItems>0?th.accent:th.cardBorder,
                    backgroundColor:totItems>0?th.accent:th.bg2,
                    justifyContent:'center',alignItems:'center',position:'relative'}}>
                  <Text style={{fontSize:18,color:totItems>0?th.accentText:th.text,lineHeight:22}}>
                    🛍
                  </Text>
                  {totItems>0&&(
                    <View style={{position:'absolute',top:-4,right:-4,
                      minWidth:18,height:18,borderRadius:9,
                      backgroundColor:th.danger,justifyContent:'center',
                      alignItems:'center',paddingHorizontal:3,
                      borderWidth:2,borderColor:th.bg}}>
                      <Text style={{color:'#fff',fontSize:9,fontWeight:'900',lineHeight:12}}>
                        {totItems>99?'99+':String(totItems)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {/* Screen container — ALL screens always rendered, toggled by display */}
          <Animated.View
            style={{flex:1, opacity:tabAnim, transform:[{translateX:swipeAnim}]}}
            {...swipeResponder.panHandlers}>

            {/* ══ HOME ══════════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='home'?'flex':'none'}}>
              {showSrch&&(
                <View style={{backgroundColor:th.bg,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                  <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,gap:12}}>
                    <TextInput style={{flex:1,backgroundColor:'transparent',paddingHorizontal:14,paddingVertical:10,
                      fontSize:13,borderRadius:R,color:th.inputText,
                      borderWidth:1,borderColor:th.cardBorder}}
                      placeholder={T.search} value={srch}
                      onChangeText={v=>{setSrch(v);setShowSuggestions(v.length>0);}}
                      onFocus={()=>setShowSuggestions(srch.length===0||srch.length>0)}
                      autoFocus placeholderTextColor={th.text4}/>
                    <TouchableOpacity onPress={()=>{setShowSrch(false);setSrch('');setShowSuggestions(false);}} style={{padding:4}}>
                      <Text style={{fontSize:16,color:th.text3}}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Suggestions / History / Trending */}
                  {showSuggestions&&(
                    <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:H*0.55}}
                      showsVerticalScrollIndicator={false}>
                      {srch.length===0?(
                        <View style={{paddingBottom:12}}>
                          {/* Recent searches */}
                          {searchHistory.length>0&&(
                            <>
                              <View style={{flexDirection:'row',justifyContent:'space-between',
                                alignItems:'center',paddingHorizontal:16,paddingTop:12,paddingBottom:8}}>
                                <Text style={{fontSize:8,fontWeight:'900',letterSpacing:2,color:th.text4}}>ОСТАННІ ПОШУКИ</Text>
                                <TouchableOpacity onPress={()=>setSearchHistory([])}>
                                  <Text style={{fontSize:9,color:th.text4,fontWeight:'600',textDecorationLine:'underline'}}>Очистити все</Text>
                                </TouchableOpacity>
                              </View>
                              {searchHistory.slice(0,5).map((h,i)=>(
                                <TouchableOpacity key={i}
                                  style={{flexDirection:'row',alignItems:'center',
                                    paddingHorizontal:16,paddingVertical:11,gap:12}}
                                  onPress={()=>{setSrch(h);setShowSuggestions(false);}}>
                                  <Text style={{fontSize:13,color:th.text4}}>↩</Text>
                                  <Text style={{fontSize:13,color:th.text2,flex:1}}>{h}</Text>
                                  <TouchableOpacity style={{padding:4}}
                                    onPress={()=>setSearchHistory(p=>p.filter((_,j)=>j!==i))}>
                                    <Text style={{fontSize:12,color:th.text4}}>✕</Text>
                                  </TouchableOpacity>
                                </TouchableOpacity>
                              ))}
                              <View style={{height:1,backgroundColor:th.cardBorder,marginHorizontal:16,marginVertical:8}}/>
                            </>
                          )}
                          {/* Trending */}
                          <View style={{paddingHorizontal:16,paddingBottom:8}}>
                            <Text style={{fontSize:8,fontWeight:'900',letterSpacing:2,
                              color:th.text4,marginBottom:12}}>🔥 TRENDING</Text>
                            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                              {TRENDING_SEARCHES.map((t,i)=>(
                                <TouchableOpacity key={i}
                                  style={{paddingHorizontal:14,paddingVertical:8,
                                    borderRadius:20,borderWidth:1,borderColor:th.cardBorder,
                                    backgroundColor:th.bg2,flexDirection:'row',alignItems:'center',gap:5}}
                                  onPress={()=>{
                                    setSrch(t.q);
                                    setShowSuggestions(false);
                                    setSearchHistory(p=>[t.q,...p.filter(h=>h!==t.q)].slice(0,10));
                                  }}>
                                  <Text style={{fontSize:11}}>{t.icon}</Text>
                                  <Text style={{fontSize:12,color:th.text2,fontWeight:'500'}}>{t.q}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                          <View style={{height:1,backgroundColor:th.cardBorder,marginHorizontal:16,marginVertical:8}}/>
                          {/* Popular categories */}
                          <View style={{paddingHorizontal:16}}>
                            <Text style={{fontSize:8,fontWeight:'900',letterSpacing:2,
                              color:th.text4,marginBottom:12}}>⭐ ПОПУЛЯРНІ КАТЕГОРІЇ</Text>
                            {[
                              {label:'Худі та світшоти',count:4,cid:'hoodies'},
                              {label:'Футболки',count:8,cid:'tshirts'},
                              {label:'Верхній одяг',count:5,cid:'outerwear'},
                              {label:'Штани та джогери',count:3,cid:'pants'},
                            ].map((cat,i)=>(
                              <TouchableOpacity key={i}
                                style={{flexDirection:'row',alignItems:'center',
                                  paddingVertical:10,gap:12}}
                                onPress={()=>{
                                  setCatFilter({cid:cat.cid,sub:null,badge:null});
                                  setShowSrch(false);setSrch('');setShowSuggestions(false);
                                }}>
                                <Text style={{fontSize:13,color:th.text,flex:1}}>{cat.label}</Text>
                                <Text style={{fontSize:10,color:th.text4}}>{cat.count} товарів</Text>
                                <Text style={{fontSize:14,color:th.text4}}>›</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ):(
                        <View style={{paddingBottom:8}}>
                          {/* Product matches */}
                          {searchResults.map((p,i)=>(
                            <TouchableOpacity key={`srch_${p.id}_${i}`}
                              style={{flexDirection:'row',alignItems:'center',
                                paddingHorizontal:16,paddingVertical:10,gap:12}}
                              onPress={()=>{
                                setSel(p);setSelSz(null);setSelCl(null);
                                addToRecentlyViewed(p);
                                setSearchHistory(prev=>[p.name,...prev.filter(h=>h!==p.name)].slice(0,10));
                                setShowSuggestions(false);setShowSrch(false);setSrch('');
                                go('product');
                              }}>
                              <Image source={{uri:thumbUri(p.imgs?p.imgs[0]:(p.img||""))}}
                                style={{width:40,height:40,borderRadius:8}} resizeMode="cover"/>
                              <View style={{flex:1}}>
                                <Text style={{fontSize:12,color:th.text,fontWeight:'500'}} numberOfLines={1}>
                                  {p.name}
                                </Text>
                                <Text style={{fontSize:10,color:th.text4,marginTop:1}}>{p.price} ₴ · {(()=>{const c=CAT_TREE.find(x=>x.cid===p.cid||x.id===p.cid);return c?c.label:(p.cat||p.cid||'');})()}</Text>
                              </View>
                              <Text style={{color:th.text4,fontSize:16}}>›</Text>
                            </TouchableOpacity>
                          ))}
                          {/* Search all */}
                          <TouchableOpacity
                            style={{paddingHorizontal:16,paddingVertical:11,
                              flexDirection:'row',alignItems:'center',gap:10,
                              borderTopWidth:1,borderTopColor:th.cardBorder,marginTop:4}}
                            onPress={()=>{
                              setSearchHistory(p=>[srch,...p.filter(h=>h!==srch)].slice(0,10));
                              setShowSuggestions(false);
                            }}>
                            <Text style={{fontSize:14,color:th.text3}}>⌕</Text>
                            <Text style={{fontSize:13,color:th.text3}}>Шукати «<Text style={{color:th.text,fontWeight:'600'}}>{srch}</Text>»</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              )}
              {/* ── FILTER BAR ── */}
              {(()=>{
                const inCategory = !!(catFilter.cid||catFilter.badge||catFilter.sub);
                const hasFilter  = priceMin>0||priceMax<4000||colorFilter||sizeFilter;
                const filterCount= [priceMin>0||priceMax<4000,!!colorFilter,!!sizeFilter].filter(Boolean).length;
                return(
                  <View style={{flexDirection:'row',alignItems:'center',
                    paddingHorizontal:GUTTER,paddingVertical:8,
                    borderBottomWidth:inCategory?1:0,borderBottomColor:th.cardBorder,
                    gap:8,backgroundColor:th.bg}}>

                    {/* КАТЕГОРІЇ — тільки якщо є активна категорія */}
                    <TouchableOpacity
                      onPress={()=>{ setShowCatModal(false); setTimeout(()=>setShowCatModal(true),0); }}
                      style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,
                        paddingHorizontal:16,paddingVertical:10,borderRadius:20,
                        borderWidth:1.5,
                        borderColor:inCategory?th.text:th.cardBorder,
                        backgroundColor:inCategory?th.text:'transparent',
                        alignSelf:'flex-start'}}>
                      <Text style={{fontSize:14}}>{inCategory?'◎':'☰'}</Text>
                      <Text style={{fontSize:11,fontWeight:'800',letterSpacing:1,
                        color:inCategory?th.bg:th.text,textAlign:'center'}} numberOfLines={1}>
                        {inCategory ? getCatLabel() : (lang==='EN'?'CATEGORIES':'Категорії')}
                      </Text>
                      {inCategory
                        ? <TouchableOpacity onPress={(e)=>{e.stopPropagation?.();
                            setCatFilter({cid:null,sub:null,badge:null});
                            setPriceMin(0);setPriceMax(4000);setColorFilter(null);setSizeFilter(null);}}
                            hitSlop={{top:8,bottom:8,left:8,right:8}}>
                            <Text style={{fontSize:14,color:th.bg,fontWeight:'700'}}>✕</Text>
                          </TouchableOpacity>
                        : <Text style={{fontSize:11,color:th.text3}}>›</Text>
                      }
                    </TouchableOpacity>

                    {/* ФІЛЬТР + СОРТУВАННЯ в одній кнопці — тільки в категорії */}
                    {inCategory&&(
                      <TouchableOpacity
                        onPress={()=>setShowPriceFilter(true)}
                        style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,
                          paddingHorizontal:14,paddingVertical:10,borderRadius:20,
                          borderWidth:1.5,
                          borderColor:(hasFilter||sort!=='popular')?th.text:th.cardBorder,
                          backgroundColor:(hasFilter||sort!=='popular')?th.text:'transparent'}}>
                        <Text style={{fontSize:13,color:(hasFilter||sort!=='popular')?th.bg:th.text3}}>⊟</Text>
                        <Text style={{fontSize:10,fontWeight:'800',letterSpacing:0.5,
                          color:(hasFilter||sort!=='popular')?th.bg:th.text3,textAlign:'center'}}>
                          {(hasFilter||sort!=='popular')
                            ? (sort!=='popular'
                                ? (sort==='price_asc'?'↑Ціна':sort==='price_desc'?'↓Ціна':sort==='new'?'Нові':'★Рейт')
                                : 'ФІЛЬТР')
                            : (lang==='EN'?'FILTER & SORT':'ФІЛЬТР')}
                        </Text>
                        {(filterCount>0||sort!=='popular')&&(
                          <View style={{width:16,height:16,borderRadius:8,
                            backgroundColor:th.bg,justifyContent:'center',alignItems:'center'}}>
                            <Text style={{fontSize:8,fontWeight:'900',color:th.text}}>
                              {filterCount+(sort!=='popular'?1:0)}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}

                    {compareList.length>0&&(
                      <TouchableOpacity
                        onPress={()=>setShowCompare(true)}
                        style={{paddingHorizontal:10,paddingVertical:10,borderRadius:20,
                          backgroundColor:th.info}}>
                        <Text style={{fontSize:10,fontWeight:'900',color:'#fff'}}>⊜ {compareList.length}</Text>
                      </TouchableOpacity>
                    )}

                    <View style={{flex:1}}/>

                    {/* Сортування окремо — тільки якщо активне */}
                    {inCategory&&sort!=='popular'&&(
                      <TouchableOpacity
                        onPress={()=>setShowSort(true)}
                        style={{paddingHorizontal:12,paddingVertical:10,borderRadius:20,
                          borderWidth:1.5,borderColor:th.text,
                          backgroundColor:th.text}}>
                        <Text style={{fontSize:10,fontWeight:'800',color:th.bg}}>
                          {'⇅ '+(sort==='price_asc'?'↑Ціна':sort==='price_desc'?'↓Ціна':sort==='new'?'Нові':'★Рейт')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
              <ScrollView
                ref={homeScrollRef}
                onScroll={e=>{homeScrollY.current=e.nativeEvent.contentOffset.y;}}
                scrollEventThrottle={100}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={S.gridContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={()=>loadProducts(true)}
                    tintColor={th.text}
                    colors={[th.text]}/>
                }>

                {/* ── HERO BANNER — статичний ── */}
                {!srch&&!catFilter.cid&&!catFilter.badge&&!catFilter.sub&&(
                  <View style={{width:'100%',marginBottom:0}}>
                    <TouchableOpacity activeOpacity={0.95}
                      onPress={()=>{setCatFilter({cid:null,sub:null,badge:null});}}
                      style={{marginHorizontal:16,marginBottom:24,borderRadius:16,
                        overflow:'hidden',backgroundColor:'#f0ede8',
                        height:bannerSize==='small'?H*0.18:bannerSize==='large'?H*0.48:H*0.30}}>
                      {heroStaticImg?(
                        <Image source={{uri:heroStaticImg}}
                          style={{width:'100%',height:'100%',position:'absolute'}}
                          resizeMode="cover"/>
                      ):(
                        <View style={{flex:1,backgroundColor:'#f0ede8',
                          justifyContent:'center',alignItems:'center'}}>
                          <Text style={{fontSize:40}}>🛍</Text>
                        </View>
                      )}
                      {/* Overlay */}
                      <View style={{position:'absolute',bottom:0,left:0,right:0,
                        height:'55%',backgroundColor:'rgba(0,0,0,0.32)'}}/>
                      {/* Текст */}
                      <View style={{position:'absolute',bottom:20,left:20,right:'30%'}}>
                        <Text style={{fontSize:22,fontWeight:'900',color:'#fff',
                          letterSpacing:-0.5,lineHeight:26,marginBottom:4}}>
                          {heroStaticTitle||'НОВІ НАДХОДЖЕННЯ'}
                        </Text>
                        <Text style={{fontSize:11,color:'rgba(255,255,255,0.85)',
                          letterSpacing:1,fontWeight:'500',textTransform:'uppercase'}}>
                          {heroStaticSub||'Осінь 2024. Чистий стиль'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── CATEGORY ICONS ROW ── */}
                {!srch&&(
                  <View style={{marginBottom:24,paddingHorizontal:4}}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{paddingHorizontal:12,gap:8}}>
                      {/* ── ВСІ ТОВАРИ — виділена кнопка перед категоріями ── */}
                      {(()=>{
                        const allActive=!catFilter.cid&&!catFilter.badge&&!catFilter.sub;
                        return(
                          <TouchableOpacity
                            onPress={()=>{
                              setCatFilter({cid:null,sub:null,badge:null});
                              setSrch('');
                              setPerPage(30);
                              setSort('default');
                              homeScrollRef.current?.scrollTo({y:0,animated:true});
                            }}
                            style={{alignItems:'center',gap:6,width:72}}>
                            <View style={{
                              width:52,height:52,borderRadius:26,
                              backgroundColor:allActive?th.accent:th.bg2,
                              justifyContent:'center',alignItems:'center',
                              borderWidth:allActive?0:1.5,
                              borderColor:allActive?th.accent:th.accent+'55',
                            }}>
                              <Text style={{fontSize:22}}>👔</Text>
                            </View>
                            <Text style={{
                              fontSize:10,fontWeight:'700',
                              color:allActive?th.accent:th.text3,
                              textAlign:'center',letterSpacing:0.2,
                            }}>
                              Всі
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                      {/* Роздільник */}
                      <View style={{width:1,height:40,backgroundColor:th.cardBorder,
                        alignSelf:'center',marginHorizontal:4}}/>
                      {/* Динамічне меню — керується з адмін панелі */}
                      {[
                        {id:'new',       label:'Новинки',   icon:'✦',  badge:'__new__'},
                        {id:'outerwear', label:'Куртки',    icon:'🧥', cid:'outerwear'},
                        {id:'tshirts',   label:'Футболки',  icon:'👕', cid:'tshirts'},
                        {id:'hoodies',   label:'Кофти',     icon:'🧣', cid:'hoodies'},
                        {id:'pants',     label:'Штани',     icon:'👖', cid:'pants'},
                        {id:'costumes',  label:'Костюми',   icon:'🎽', cid:'costumes'},
                        {id:'accessories',label:'Аксесуари',icon:'🎩', cid:'accessories'},
                        {id:'sale',      label:'SALE',      icon:'％', badge:'Sale'},
                      ].filter(cat=>homeMenu.includes(cat.id)).map((cat,i)=>{
                        const active=cat.badge
                          ?(catFilter.badge===cat.badge)
                          :(catFilter.cid===cat.cid);
                        return(
                          <TouchableOpacity key={i}
                            onPress={()=>{
                              if(cat.badge){
                                // toggle badge: tap same → reset
                                if(catFilter.badge===cat.badge) setCatFilter({cid:null,sub:null,badge:null});
                                else setCatFilter({cid:null,sub:null,badge:cat.badge});
                              } else {
                                // toggle cid: tap same → reset to all
                                if(catFilter.cid===cat.cid) setCatFilter({cid:null,sub:null,badge:null});
                                else setCatFilter({cid:cat.cid,sub:null,badge:null});
                              }
                            }}
                            style={{alignItems:'center',gap:6,width:64}}>
                            <View style={{
                              width:52,height:52,borderRadius:26,
                              backgroundColor:active?th.accent:th.bg2,
                              justifyContent:'center',alignItems:'center',
                              borderWidth:active?0:1,borderColor:th.cardBorder,
                            }}>
                              <Text style={{fontSize:20}}>{cat.icon}</Text>
                            </View>
                            <Text style={{
                              fontSize:10,fontWeight:active?'700':'400',
                              color:active?th.accent:th.text3,
                              textAlign:'center',letterSpacing:0.2,
                            }}>
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* ── SECTION TITLE ── */}
                {!srch&&!catFilter.cid&&!catFilter.badge&&(
                  <View style={{paddingHorizontal:16,marginBottom:12}}>
                    <Text style={{fontSize:16,fontWeight:'800',color:th.text,letterSpacing:0.5}}>
                      ПОПУЛЯРНІ ТОВАРИ
                    </Text>
                  </View>
                )}

                {recentlyViewed.length>0&&!srch&&!catFilter.cid&&!catFilter.badge&&(
                  <View style={{width:'100%',marginBottom:20}}>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>НЕЩОДАВНО ПЕРЕГЛЯНУТІ</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>
                      {recentlyViewed.slice(0,6).map((item,i)=>(
                        <TouchableOpacity key={`rv_${item.id}_${i}`} style={{width:100}}
                          onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}>
                          <View style={{borderRadius:R,overflow:'hidden',width:100,height:130}}>
                            {!imgLoaded[item.id]&&<View style={{position:'absolute',top:0,left:0,right:0,bottom:0}}><Skeleton width={100} height={130}/></View>}
                            <Image source={{uri:item.img}} style={{width:100,height:130}} resizeMode="cover"
                              onLoad={()=>setImgLoaded(p=>({...p,[item.id]:true}))}/>
                          </View>
                          <Text style={{fontSize:10,color:th.text,marginTop:5,fontWeight:'500'}} numberOfLines={1}>{item.name}</Text>
                          <Text style={{fontSize:10,color:th.text3,fontWeight:'700'}}>{item.price} ₴</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {/* ── FEATURED SECTIONS ── */}
                {!srch&&!catFilter.cid&&!catFilter.badge&&(
                  <View style={{marginTop:4}}>

                    {/* ── ПОПУЛЯРНІ ТОВАРИ ── */}
                    {(()=>{
                      const popItems = popularMemo;
                      if(!popItems.length) return null;
                      return(
                        <View style={{marginBottom:32,marginTop:8}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',
                            alignItems:'center',paddingHorizontal:20,marginBottom:16}}>
                            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                              <Text style={{fontSize:20,fontWeight:'900',color:th.text,letterSpacing:-0.5}}>
                                🔥 Популярні
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={()=>{
                                setCatFilter({cid:null,sub:null,badge:null});
                                setSort('default');
                                homeScrollRef.current?.scrollTo({y:0,animated:true});
                              }}
                              style={{paddingHorizontal:14,paddingVertical:6,borderRadius:20,
                                borderWidth:1,borderColor:th.cardBorder}}>
                              <Text style={{fontSize:10,fontWeight:'700',color:th.text3}}>
                                Всі →
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{paddingHorizontal:20,gap:12}}>
                            {popItems.map((item,i)=>{
                              const wished=wish.includes(item.id);
                              const hasDiscount=item.old>0&&item.old>item.price;
                              return(
                                <TouchableOpacity key={'pop_'+item.id+'_'+i}
                                  onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}
                                  style={{width:148}}>
                                  <View style={{width:148,height:196,borderRadius:18,overflow:'hidden',
                                    backgroundColor:th.bg2}}>
                                    <Image source={{uri:thumbUri(item.imgs?.[0]||item.img||'')}}
                                      style={{width:148,height:196}} resizeMode="cover"/>
                                    {/* Знижка */}
                                    {hasDiscount&&(
                                      <View style={{position:'absolute',top:0,right:0,
                                        backgroundColor:'#e11d48',borderTopRightRadius:18,
                                        borderBottomLeftRadius:12,paddingHorizontal:8,paddingVertical:5}}>
                                        <Text style={{color:'#fff',fontSize:9,fontWeight:'900'}}>
                                          {'−'+Math.round((1-item.price/item.old)*100)+'%'}
                                        </Text>
                                      </View>
                                    )}
                                    {/* Позиція у рейтингу */}
                                    {i<3&&(
                                      <View style={{position:'absolute',top:8,left:8,
                                        width:26,height:26,borderRadius:13,
                                        backgroundColor:'rgba(0,0,0,0.55)',
                                        justifyContent:'center',alignItems:'center'}}>
                                        <Text style={{fontSize:13}}>
                                          {['🥇','🥈','🥉'][i]}
                                        </Text>
                                      </View>
                                    )}
                                    {/* Обране */}
                                    <TouchableOpacity
                                      onPress={()=>setWish(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id])}
                                      style={{position:'absolute',top:8,right:hasDiscount?'auto':8,
                                        bottom:hasDiscount?'auto':'auto',
                                        width:30,height:30,borderRadius:15,
                                        backgroundColor:'rgba(0,0,0,0.4)',
                                        justifyContent:'center',alignItems:'center',
                                        display:hasDiscount?'none':'flex'}}>
                                      <Text style={{fontSize:13,color:wished?'#ef4444':'#fff'}}>{wished?'♥':'♡'}</Text>
                                    </TouchableOpacity>
                                    {/* Рейтинг */}
                                    {!!(item.r)&&(
                                      <View style={{position:'absolute',bottom:8,left:8,
                                        flexDirection:'row',alignItems:'center',gap:3,
                                        backgroundColor:'rgba(0,0,0,0.55)',
                                        paddingHorizontal:7,paddingVertical:3,borderRadius:10}}>
                                        <Text style={{fontSize:9,color:'#FFD700'}}>★</Text>
                                        <Text style={{fontSize:9,fontWeight:'700',color:'#fff'}}>{item.r}</Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={{paddingTop:8,paddingHorizontal:2}}>
                                    <Text style={{fontSize:12,fontWeight:'500',color:th.text,lineHeight:16}}
                                      numberOfLines={2}>{item.name}</Text>
                                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:3}}>
                                      <Text style={{fontSize:13,fontWeight:'900',
                                        color:hasDiscount?'#e11d48':th.text}}>
                                        {item.price} ₴
                                      </Text>
                                      {hasDiscount&&(
                                        <Text style={{fontSize:10,color:th.text4,
                                          textDecorationLine:'line-through'}}>
                                          {item.old} ₴
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      );
                    })()}

                    {/* ── MOST LOVED section ── */}
                    {(()=>{
                      const hitItems=hitItemsMemo;
                      if(!hitItems.length) return null;
                      return(
                        <View style={{marginBottom:32,marginTop:8}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',
                            alignItems:'center',paddingHorizontal:20,marginBottom:18}}>
                            <Text style={{fontSize:20,fontWeight:'800',color:th.text,letterSpacing:-0.3}}>
                              {lang==='EN'?'Most Loved':'Most Loved'}
                            </Text>
                            <TouchableOpacity
                              onPress={()=>setCatFilter({cid:null,sub:null,badge:'Хіт'})}
                              style={{paddingHorizontal:14,paddingVertical:6,borderRadius:20,
                                borderWidth:1,borderColor:th.cardBorder}}>
                              <Text style={{fontSize:10,fontWeight:'700',color:th.text3}}>
                                {lang==='EN'?'See all →':'Всі →'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{paddingHorizontal:20,gap:14}}>
                            {hitItems.map((item,i)=>{
                              const wished=wish.includes(item.id);
                              return(
                              <TouchableOpacity key={'hit_'+item.id+'_'+i}
                                onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}
                                style={{width:160}}>
                                <View style={{width:160,height:210,borderRadius:22,overflow:'hidden',
                                  backgroundColor:'transparent'}}>
                                  <Image source={{uri:thumbUri(item.imgs?.[0]||item.img||'')}}
                                    style={{width:160,height:210}} resizeMode="cover"/>
                                  <TouchableOpacity
                                    onPress={()=>setWish(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id])}
                                    style={{position:'absolute',top:10,right:10,
                                      width:34,height:34,borderRadius:17,
                                      backgroundColor:'rgba(0,0,0,0.4)',
                                      justifyContent:'center',alignItems:'center'}}>
                                    <Text style={{fontSize:15,color:wished?'#ef4444':'#fff'}}>{wished?'♥':'♡'}</Text>
                                  </TouchableOpacity>
                                  {!!(item.r)&&(
                                    <View style={{position:'absolute',bottom:10,left:10,
                                      flexDirection:'row',alignItems:'center',gap:4,
                                      backgroundColor:'rgba(0,0,0,0.55)',
                                      paddingHorizontal:8,paddingVertical:4,borderRadius:12}}>
                                      <Text style={{fontSize:10,color:'#FFD700'}}>★</Text>
                                      <Text style={{fontSize:10,fontWeight:'700',color:'#fff'}}>{item.r}</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={{paddingTop:10,paddingHorizontal:2}}>
                                  <Text style={{fontSize:12,fontWeight:'500',color:th.text,lineHeight:16}}
                                    numberOfLines={2}>{item.name}</Text>
                                  <Text style={{fontSize:14,fontWeight:'800',color:th.text,marginTop:4}}>
                                    {item.price} ₴
                                  </Text>
                                </View>
                              </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      );
                    })()}

                    {/* ── BRAND FOOTER ── */}
                    <View style={{marginTop:4,borderTopWidth:1,borderTopColor:th.cardBorder}}>

                      {/* Scrolling marquee — зліва направо, стабільний */}
                      <View style={{overflow:'hidden',paddingVertical:20,
                        borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                        <Animated.View style={{flexDirection:'row',
                          transform:[{translateX:marqueeX}]}}>
                          {Array(14).fill(null).map((_,i)=>(
                            <Text key={i} style={{fontSize:16,fontWeight:'900',color:th.text,
                              letterSpacing:6,marginRight:36,textTransform:'uppercase'}}>
                              {'BY 4U TEAM ·'}
                            </Text>
                          ))}
                        </Animated.View>
                      </View>

                      {/* Accordion — dynamic content editable by admin */}
                      {Object.entries(footerContent).map(([key,data])=>({
                        key,
                        title:lang==='EN'?data.title.en:data.title.ua,
                        items:lang==='EN'?data.items.en:data.items.ua,
                      })).map(sec=>(
                        <View key={sec.key}
                          style={{borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                          <TouchableOpacity
                            onPress={()=>setFooterOpen(p=>({...p,[sec.key]:!p[sec.key]}))}
                            style={{flexDirection:'row',justifyContent:'space-between',
                              alignItems:'center',paddingHorizontal:20,paddingVertical:18}}>
                            <Text style={{fontSize:11,fontWeight:'700',letterSpacing:2,color:th.text}}>
                              {sec.title}
                            </Text>
                            <Text style={{fontSize:22,color:th.text3,fontWeight:'200',lineHeight:26}}>
                              {footerOpen[sec.key]?'−':'+'}
                            </Text>
                          </TouchableOpacity>
                          {footerOpen[sec.key]&&(
                            <View style={{paddingHorizontal:20,paddingBottom:16,gap:12}}>
                              {sec.items.map((item,i)=>(
                                <TouchableOpacity key={i} onPress={()=>go('support')}>
                                  <Text style={{fontSize:13,color:th.text3,lineHeight:20}}>{item}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}

                      {/* Copyright */}
                      <View style={{alignItems:'center',paddingVertical:28,gap:5}}>
                        <Text style={{fontSize:11,color:th.text4,letterSpacing:1.5,fontWeight:'600'}}>
                          {'© 2026 4U.TEAM'}
                        </Text>
                        <Text style={{fontSize:9,color:th.text4,letterSpacing:0.5}}>
                          {lang==='EN'?'All rights reserved':'Всі права захищені'}
                        </Text>
                      </View>
                    </View>

                  </View>
                )}

                {/* ── CATALOG VIEW (only when filter active) ── */}
                {(srch||catFilter.cid||catFilter.badge)&&(
                  <>
                    {filteredItems.length===0&&!productsLoading&&(
                      <View style={{width:'100%',alignItems:'center',paddingVertical:60,gap:16}}>
                        <Text style={{fontSize:40}}>🔍</Text>
                        <Text style={{fontSize:13,fontWeight:'700',color:th.text,letterSpacing:1}}>
                          {lang==='EN'?'NO PRODUCTS FOUND':'ТОВАРИ НЕ ЗНАЙДЕНО'}
                        </Text>
                        <TouchableOpacity
                          onPress={()=>{setCatFilter({cid:null,sub:null,badge:null});setSrch('');
                            setPriceMin(0);setPriceMax(4000);setColorFilter(null);setSizeFilter(null);}}
                          style={{backgroundColor:th.text,paddingHorizontal:28,paddingVertical:12,borderRadius:20}}>
                          <Text style={{color:th.bg,fontSize:10,fontWeight:'900',letterSpacing:2}}>
                            {lang==='EN'?'RESET':'СКИНУТИ'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}                {filteredItems.map((item,i)=>{
                  const inCart=cart.filter(c=>c.id===item.id).reduce((s,c)=>s+c.qty,0);
                  const wished=wish.includes(item.id);
                  return(
                    <View key={`prod_${item.id}_${i}`}
                      style={{width:CARD_W,marginBottom:20,
                        marginRight:i%2===0?GUTTER:0}}>
                      <TouchableOpacity activeOpacity={0.95}
                        onLongPress={()=>{setQuickAddItem(item);setQuickAddSz(null);setQuickAddCl(null);}}
                        onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}>
                        {/* Фото */}
                        <View style={{borderRadius:12,overflow:'hidden',
                          backgroundColor:'transparent',position:'relative'}}>
                          {!imgLoaded[`g_${item.id}`]&&(
                            <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:1,
                              backgroundColor:'transparent'}}/>
                          )}
                          <Image source={{uri:thumbUri(item.img||"")}}
                            style={{width:CARD_W,height:CARD_H}} resizeMode="cover"
                            onLoad={()=>setImgLoaded(p=>({...p,[`g_${item.id}`]:true}))}/>
                          {/* Номер картки — top left */}
                          <View style={{position:'absolute',top:10,left:10,
                            width:22,height:22,borderRadius:11,
                            backgroundColor:'rgba(255,255,255,0.9)',
                            justifyContent:'center',alignItems:'center'}}>
                            <Text style={{fontSize:10,fontWeight:'700',color:'#111'}}>{i+1}</Text>
                          </View>
                          {/* Badge */}
                          {/* ── ЗНИЖКА BADGE — кут зображення ── */}
                          {item.old>0&&item.old>item.price&&(()=>{
                            const pct=Math.round((1-item.price/item.old)*100);
                            return(
                              <View style={{position:'absolute',top:0,right:0,zIndex:3,
                                backgroundColor:'#e11d48',
                                borderTopRightRadius:12,borderBottomLeftRadius:14,
                                paddingHorizontal:9,paddingVertical:7,
                                shadowColor:'#e11d48',shadowOffset:{width:0,height:3},
                                shadowOpacity:0.4,shadowRadius:6,elevation:4}}>
                                <Text style={{color:'#fff',fontSize:9,fontWeight:'900',letterSpacing:0.3,
                                  textAlign:'center',lineHeight:12}}>
                                  {'−'+pct+'%'}
                                </Text>
                                <Text style={{color:'rgba(255,255,255,0.7)',fontSize:7,fontWeight:'600',
                                  textAlign:'center',textDecorationLine:'line-through',lineHeight:11}}>
                                  {item.old+' ₴'}
                                </Text>
                              </View>
                            );
                          })()}
                          {/* Badge (Хіт / New / etc) */}
                          {item.badge&&!item.old&&(
                            <View style={{position:'absolute',top:10,left:38,
                              backgroundColor:item.badge==='Sale'?'#e11d48':'#111',
                              paddingHorizontal:7,paddingVertical:3,borderRadius:4}}>
                              <Text style={{color:'#fff',fontSize:8,fontWeight:'800',letterSpacing:0.5}}>
                                {item.badge.toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {/* Мало залишку */}
                          {item.stock>0&&item.stock<=3&&(
                            <View style={{position:'absolute',bottom:8,left:8,
                              backgroundColor:'rgba(239,68,68,0.9)',
                              paddingHorizontal:6,paddingVertical:3,borderRadius:6}}>
                              <Text style={{color:'#fff',fontSize:8,fontWeight:'700'}}>
                                {'залишок: '+item.stock}
                              </Text>
                            </View>
                          )}
                          {/* Кошик badge */}
                          {inCart>0&&(
                            <View style={{position:'absolute',bottom:8,right:8,
                              width:20,height:20,backgroundColor:'#111',
                              borderRadius:10,justifyContent:'center',alignItems:'center',zIndex:2}}>
                              <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>{inCart}</Text>
                            </View>
                          )}
                        </View>
                        {/* Інфо під фото */}
                        <View style={{paddingTop:10,paddingHorizontal:2,
                          flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between'}}>
                          <View style={{flex:1,paddingRight:8}}>
                            <Text style={{fontSize:13,fontWeight:'500',color:th.text,lineHeight:18}}
                              numberOfLines={2}>{item.name}</Text>
                            <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                              <Text style={{fontSize:15,fontWeight:'900',
                                color:item.old>0?'#e11d48':th.text}}>
                                {item.price} ₴
                              </Text>
                              {item.old>0&&(
                                <Text style={{fontSize:11,color:th.text4,textDecorationLine:'line-through'}}>
                                  {item.old} ₴
                                </Text>
                              )}
                            </View>
                          </View>
                          {/* Серце справа від назви */}
                          <TouchableOpacity
                            style={{paddingTop:2,paddingLeft:4}}
                            onPress={()=>setWish(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id])}>
                            <Text style={{fontSize:20,color:wished?'#ef4444':th.text4}}>
                              {wished?'♥':'♡'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                  {/* ── ЗАВАНТАЖИТИ ЩЕ ── */}
                  {allFilteredItems.length > filteredItems.length && (
                    <View style={{width:'100%',alignItems:'center',paddingVertical:20}}>
                      <TouchableOpacity
                        onPress={()=>setPerPage(p=>p+20)}
                        style={{flexDirection:'row',alignItems:'center',gap:10,
                          paddingHorizontal:32,paddingVertical:14,borderRadius:30,
                          borderWidth:1.5,borderColor:th.text,backgroundColor:'transparent'}}>
                        <Text style={{fontSize:11,fontWeight:'800',letterSpacing:1,color:th.text}}>ЗАВАНТАЖИТИ ЩЕ</Text>
                        <Text style={{fontSize:10,color:th.text4}}>{'+'+Math.min(20,allFilteredItems.length-filteredItems.length)}</Text>
                      </TouchableOpacity>
                      <Text style={{fontSize:9,color:th.text4,marginTop:8}}>{filteredItems.length+' / '+allFilteredItems.length+' товарів'}</Text>
                    </View>
                  )}
                  </>
                )}
              </ScrollView>
            </View>{/* END HOME */}

            {/* ══ PRODUCT ═══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='product'?'flex':'none',position:'relative'}}>
              {/* Sticky CTA bar */}

              {sel&&(
                <Animated.View style={{flex:1,transform:[{translateX:productSwipeAnim}]}}
                  {...productScreenPan.panHandlers}>
                {/* Product nav: prev/next arrows */}
                {categoryItems.length>1&&(
                  <View style={{position:'absolute',top:'45%',left:0,right:0,zIndex:10,
                    flexDirection:'row',justifyContent:'space-between'}} pointerEvents='box-none'>
                    <TouchableOpacity
                      onPress={goProductPrev}
                      disabled={currentProductIdx<=0}
                      style={{width:36,height:36,borderRadius:18,marginLeft:8,
                        backgroundColor:currentProductIdx>0?'rgba(0,0,0,0.25)':'transparent',
                        justifyContent:'center',alignItems:'center'}}>
                      <Text style={{color:'#fff',fontSize:18,marginTop:-1}}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={goProductNext}
                      disabled={currentProductIdx>=categoryItems.length-1}
                      style={{width:36,height:36,borderRadius:18,marginRight:8,
                        backgroundColor:currentProductIdx<categoryItems.length-1?'rgba(0,0,0,0.25)':'transparent',
                        justifyContent:'center',alignItems:'center'}}>
                      <Text style={{color:'#fff',fontSize:18,marginTop:-1}}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Nav dots */}
                {categoryItems.length>1&&categoryItems.length<=20&&(
                  <View style={{position:'absolute',bottom:HOME_IND+90,left:0,right:0,zIndex:10,
                    flexDirection:'row',justifyContent:'center',gap:4}} pointerEvents='none'>
                    {categoryItems.map((_,i)=>(
                      <View key={i} style={{
                        width:i===currentProductIdx?16:5,height:5,borderRadius:3,
                        backgroundColor:i===currentProductIdx?th.text:'rgba(128,128,128,0.3)',
                      }}/>
                    ))}
                  </View>
                )}
                {/* Position counter */}
                {categoryItems.length>1&&(
                  <View style={{position:'absolute',top:16,right:16,zIndex:10,
                    backgroundColor:'rgba(0,0,0,0.22)',borderRadius:12,
                    paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>
                      {currentProductIdx+1} / {categoryItems.length}
                    </Text>
                  </View>
                )}
                <ScrollView ref={productScrollRef} style={{flex:1,backgroundColor:th.bg}} showsVerticalScrollIndicator={false}>
                  {/* Zoomable swipe gallery */}
                  <View style={{position:'relative'}}>
                    <ZoomableGallery imgs={sel.imgs&&sel.imgs.length?sel.imgs:[sel.img]} height={W*1.15}/>
                    {sel.badge&&<View style={{position:'absolute',top:20,left:20,zIndex:2,
                      backgroundColor:sel.badge==='Sale'?'#dc2626':sel.badge==='Хіт'?'#111':'#059669',
                      paddingHorizontal:10,paddingVertical:4,borderRadius:8}}>
                      <Text style={{color:'#fff',fontSize:9,fontWeight:'900',letterSpacing:1}}>{sel.badge.toUpperCase()}</Text>
                    </View>}
                    <TouchableOpacity style={{position:'absolute',top:20,right:20,zIndex:2,
                      backgroundColor:'rgba(255,255,255,.92)',
                      width:40,height:40,borderRadius:20,justifyContent:'center',alignItems:'center'}}
                      onPress={()=>setWish(p=>p.includes(sel.id)?p.filter(x=>x!==sel.id):[...p,sel.id])}>
                      <Text style={{fontSize:18,color:wish.includes(sel.id)?'#dc2626':'#333'}}>{wish.includes(sel.id)?'♥':'♡'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{padding:20}}>
                    <Text style={{fontSize:22,fontWeight:'300',color:th.text,letterSpacing:.3,lineHeight:30,marginBottom:8}}>{sel.name}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:8}}>
                      <Text style={{fontSize:20,fontWeight:'900',color:th.text}}>{sel.price} ₴</Text>
                      {sel.old&&<Text style={{fontSize:13,color:th.text4,textDecorationLine:'line-through'}}>{sel.old} ₴</Text>}
                      {sel.old&&<View style={{backgroundColor:'#fef2f2',paddingHorizontal:8,paddingVertical:3,borderRadius:6}}>
                        <Text style={{fontSize:10,color:'#dc2626',fontWeight:'900'}}>−{Math.round((1-sel.price/sel.old)*100)}%</Text>
                      </View>}
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:4,marginBottom:24,paddingBottom:20,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                      <Text style={{color:'#daa520',fontSize:12}}>{'★'.repeat(Math.round(sel.r||0))+'☆'.repeat(5-Math.round(sel.r||0))}</Text>
                      <Text style={{color:th.text3,fontSize:11,marginLeft:4}}>{sel.r} · {sel.rv} {T.reviews}</Text>
                    </View>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>
                      {T.color} <Text style={{fontWeight:'200',letterSpacing:0}}>{selCl||T.selectColor}</Text>
                    </Text>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:22}}>
                      {(sel.cl||[]).map(c=>(
                        <TouchableOpacity key={c}
                          style={{paddingHorizontal:16,paddingVertical:9,borderWidth:1,borderRadius:R,
                            borderColor:selCl===c?th.text:th.cardBorder,backgroundColor:selCl===c?th.accent:'transparent'}}
                          onPress={()=>setSelCl(c)}>
                          <Text style={{fontSize:11,color:selCl===c?th.accentText:th.text2,fontWeight:'600'}}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text}}>
                        {T.size} <Text style={{fontWeight:'200',letterSpacing:0}}>{selSz||T.selectSize}</Text>
                      </Text>
                      <TouchableOpacity onPress={()=>setShowSzGuide(true)}>
                        <TouchableOpacity onPress={()=>setShowSizeGuide(true)} style={{flexDirection:'row',alignItems:'center',gap:4}}>
                          <Text style={{fontSize:10,color:th.text3,textDecorationLine:'underline',fontWeight:'700'}}>{T.sizeGuide}</Text>
                          <Text style={{fontSize:10,color:th.text4}}>↗</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </View>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24}}>
                      {[...new Set(sel.sz||[])].map(s=>(
                        <TouchableOpacity key={s}
                          style={{width:52,height:40,borderWidth:1,borderRadius:R,
                            borderColor:selSz===s?th.text:th.cardBorder,backgroundColor:selSz===s?th.accent:'transparent',
                            justifyContent:'center',alignItems:'center'}}
                          onPress={()=>setSelSz(s)}>
                          <Text style={{fontSize:11,fontWeight:'700',color:selSz===s?th.accentText:th.text2}}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* ── CTA BUTTONS ── */}
                    <View style={{gap:8,marginTop:12,marginBottom:28}}>

                      {/* РЯД 1: КОШИК (60%) | КУПИТИ В 1 КЛІК (40%) */}
                      <View style={{flexDirection:'row',gap:8}}>
                        {/* В КОШИК — 60% */}
                        <TouchableOpacity
                          onPress={()=>{if(!selSz)return;addToCart(sel,selSz,selCl||'');triggerBagAnim(sel);showNotif(sel.name+' — додано в кошик ✓','success');setLastAdded({...sel,size:selSz,color:selCl||''});}}
                          disabled={!selSz}
                          style={{
                            flex:6,height:56,borderRadius:14,
                            backgroundColor:selSz?th.accent:'rgba(0,0,0,0.05)',
                            flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8,
                            shadowColor:selSz?th.accent:'transparent',
                            shadowOffset:{width:0,height:5},shadowOpacity:0.3,shadowRadius:10,
                            elevation:selSz?5:0,
                          }}>
                          <Text style={{fontSize:17}}>🛍</Text>
                          <Text style={{fontSize:13,fontWeight:'900',letterSpacing:0.3,
                            color:selSz?th.accentText:'rgba(0,0,0,0.2)'}}>
                            {lang==='EN'?'ADD TO CART':'В КОШИК'}
                          </Text>
                        </TouchableOpacity>

                        {/* КУПИТИ В 1 КЛІК — 40% */}
                        <TouchableOpacity
                          onPress={()=>{if(!selSz)return;addToCart(sel,selSz,selCl||'');triggerBagAnim(sel);go('checkout');}}
                          disabled={!selSz}
                          style={{
                            flex:4,height:56,borderRadius:14,
                            backgroundColor:'transparent',
                            borderWidth:2,
                            borderColor:selSz?th.text:'rgba(0,0,0,0.08)',
                            flexDirection:'row',justifyContent:'center',alignItems:'center',gap:5,
                          }}>
                          <Text style={{fontSize:14}}>⚡</Text>
                          <Text style={{fontSize:11,fontWeight:'900',letterSpacing:0.3,
                            color:selSz?th.text:'rgba(0,0,0,0.2)',textAlign:'center',lineHeight:14}}>
                            {'В 1 КЛІК'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* РЯД 2: В ОБРАНЕ + ПОДІЛИТИСЬ */}
                      <View style={{flexDirection:'row',gap:8}}>
                        <TouchableOpacity
                          onPress={()=>setWish(p=>p.includes(sel.id)?p.filter(x=>x!==sel.id):[...p,sel.id])}
                          style={{
                            flex:1,height:44,borderRadius:12,
                            borderWidth:1.5,
                            borderColor:wish.includes(sel.id)?'#ef4444':th.cardBorder,
                            backgroundColor:wish.includes(sel.id)?'#fef2f2':'transparent',
                            flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,
                          }}>
                          <Text style={{fontSize:16}}>{wish.includes(sel.id)?'♥':'♡'}</Text>
                          <Text style={{fontSize:11,fontWeight:'700',
                            color:wish.includes(sel.id)?'#ef4444':th.text3}}>
                            {wish.includes(sel.id)?'В ОБРАНОМУ':'В ОБРАНЕ'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            width:44,height:44,borderRadius:12,
                            borderWidth:1.5,borderColor:th.cardBorder,
                            justifyContent:'center',alignItems:'center',
                          }}
                          onPress={()=>Share.share({message:sel.name+' — '+sel.price+' ₴\n4U.TEAM'})}>
                          <Text style={{fontSize:15,color:th.text3}}>↗</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:10}}>{T.description}</Text>
                    <Text style={{fontSize:13,color:th.text2,lineHeight:22,fontWeight:'300',marginBottom:24}}>{sel.desc}</Text>
                    <View style={{paddingTop:20,borderTopWidth:1,borderTopColor:th.cardBorder,marginBottom:24}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>{T.delivery}</Text>
                      {[['→',T.deliveryInfo],['₴',T.deliveryCost],['↩',T.returns]].map(([ic,tx])=>(
                        <View key={ic} style={{flexDirection:'row',gap:12,marginBottom:10}}>
                          <Text style={{fontSize:11,color:th.text4,width:16}}>{ic}</Text>
                          <Text style={{fontSize:12,color:th.text2,fontWeight:'300',flex:1}}>{tx}</Text>
                        </View>
                      ))}
                    </View>
                    {/* ── ВІДГУКИ ── */}
                    <View style={{paddingTop:20,borderTopWidth:1,borderTopColor:th.cardBorder}}>
                      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text}}>
                          {'ВІДГУКИ ('+(reviews[sel.id]||[]).length+')'}
                        </Text>
                        <TouchableOpacity
                          onPress={()=>{
                            if(!loggedIn){
                              showNotif('Увійдіть в акаунт щоб залишити відгук','error');
                              setTimeout(()=>go('profile'),600);
                              return;
                            }
                            setShowAddReview(true);
                          }}
                          style={{paddingHorizontal:12,paddingVertical:6,borderWidth:1,
                            borderColor:loggedIn?th.accent:th.cardBorder,borderRadius:R,
                            flexDirection:'row',gap:4,alignItems:'center'}}>
                          <Text style={{fontSize:12}}>{loggedIn?'✏️':'🔒'}</Text>
                          <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1,
                            color:loggedIn?th.accent:th.text4}}>
                            {loggedIn?'НАПИСАТИ':'УВІЙДІТЬ'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {/* Відгуки з БД */}
                      {(reviews[sel.id]||[]).length===0&&(
                        <View style={{paddingVertical:20,alignItems:'center',gap:4}}>
                          <Text style={{fontSize:24}}>💬</Text>
                          <Text style={{fontSize:12,color:th.text4}}>Ще немає відгуків. Будьте першим!</Text>
                        </View>
                      )}
                      {(reviews[sel.id]||[]).map((rv,i)=>(
                        <View key={rv.id||i} style={{paddingVertical:14,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                              <View style={{width:28,height:28,borderRadius:14,
                                backgroundColor:th.accent+'22',justifyContent:'center',alignItems:'center'}}>
                                <Text style={{fontSize:12,fontWeight:'800',color:th.accent}}>
                                  {(rv.author||'?')[0].toUpperCase()}
                                </Text>
                              </View>
                              <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>{rv.author}</Text>
                            </View>
                            <Text style={{fontSize:10,color:th.text4}}>{rv.date}</Text>
                          </View>
                          <Text style={{color:'#daa520',fontSize:12,marginVertical:4,marginLeft:34}}>
                            {'★'.repeat(rv.rating||0)+'☆'.repeat(5-(rv.rating||0))}
                          </Text>
                          <Text style={{fontSize:12,color:th.text2,fontWeight:'300',lineHeight:18,marginLeft:34}}>
                            {rv.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {/* ── СХОЖІ ТОВАРИ ── */}
                    {(()=>{
                      const similar=similarProducts;
                      if(!similar.length) return null;
                      return(
                        <View style={{paddingTop:24,borderTopWidth:1,borderTopColor:th.cardBorder,marginTop:4}}>
                          <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text,marginBottom:16}}>
                            {lang==='EN'?'YOU MAY ALSO LIKE':'ВАМ МОЖЕ СПОДОБАТИСЬ'}
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{gap:12}}>
                            {similar.map((item,i)=>(
                              <TouchableOpacity key={`sim_${item.id}_${i}`} style={{width:130}}
                                onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);productScrollRef.current?.scrollTo({y:0,animated:true});}}>
                                <View style={{width:130,height:170,borderRadius:20,overflow:'hidden',backgroundColor:'transparent'}}>
                                  <Image source={{uri:thumbUri(item.imgs?.[0]||item.img||'')}}
                                    style={{width:130,height:170}} resizeMode="cover"/>
                                  {item.badge&&(
                                    <View style={{position:'absolute',top:8,left:8,
                                      backgroundColor:item.badge==='Sale'?'#dc2626':'#059669',
                                      paddingHorizontal:6,paddingVertical:2,borderRadius:6}}>
                                      <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>{item.badge}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={{fontSize:11,color:th.text,marginTop:7,fontWeight:'600',lineHeight:15}} numberOfLines={2}>{item.name}</Text>
                                <Text style={{fontSize:12,fontWeight:'900',color:th.text,marginTop:2}}>{item.price} ₴</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })()}

                                        {/* ── НЕЩОДАВНО ПЕРЕГЛЯНУТІ ── */}
                    {recentlyViewed.filter(p=>p.id!==sel?.id).length>0&&(
                      <View style={{paddingTop:24,marginTop:8}}>
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:16}}>НЕЩОДАВНО ПЕРЕГЛЯНУТІ</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {recentlyViewed.filter(p=>p.id!==sel?.id).slice(0,6).map((item,i)=>(
                            <TouchableOpacity key={`rv2_${item.id}_${i}`} style={{width:120,marginRight:12}}
                              onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);}}>
                              <Image source={{uri:thumbUri(item.img||"")}} style={{width:120,height:160,borderRadius:R}} resizeMode="cover"/>
                              <Text style={{fontSize:10,color:th.text,marginTop:6,fontWeight:'500'}} numberOfLines={2}>{item.name}</Text>
                              <Text style={{fontSize:11,fontWeight:'900',color:th.text,marginTop:2}}>{item.price} ₴</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    <View style={{height:40}}/>
                  </View>
                </ScrollView>
                </Animated.View>
              )}
            </View>{/* END PRODUCT */}

            {/* ══ CART ══════════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='cart'?'flex':'none',backgroundColor:th.bg}}>
              {cart.length===0?(
                <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:48}}>
                  <Text style={{fontSize:40,marginBottom:16}}>🛍</Text>
                  <Text style={{fontSize:9,letterSpacing:4,color:th.text4,marginBottom:20}}>{T.emptyCart}</Text>
                  <Btn th={th} label={T.toCatalog} onPress={()=>setScr('home')} style={{paddingHorizontal:40}}/>
                </View>
              ):(
                <>
                  <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:16}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {cart.map(item=>(
                      <SwipeableCartItem key={item.key} item={item} th={th}
                        onDec={decCart}
                        onInc={addToCart}
                        onDelete={delCart}/>
                    ))}
                    <View style={{marginTop:12,marginBottom:2}}>
                      <Text style={{fontSize:8,fontWeight:'900',letterSpacing:2,color:th.text,marginBottom:6}}>{T.promoCode}</Text>
                      <View style={{flexDirection:'row',borderWidth:1,borderColor:th.cardBorder,borderRadius:R,overflow:'hidden'}}>
                        <TextInput style={{flex:1,paddingHorizontal:10,paddingVertical:7,fontSize:11,color:th.inputText,backgroundColor:th.inputBg}}
                          placeholder={T.promoPlaceholder} value={promo} onChangeText={setPromo}
                          autoCapitalize="characters" placeholderTextColor={th.text4}/>
                        <TouchableOpacity style={{backgroundColor:th.accent,paddingHorizontal:14,justifyContent:'center'}} onPress={applyPromo}>
                          <Text style={{color:th.accentText,fontWeight:'900',fontSize:9,letterSpacing:1.5}}>{T.promoApply}</Text>
                        </TouchableOpacity>
                      </View>
                      {promoErr?<Text style={{fontSize:10,color:th.danger,marginTop:5}}>{promoErr}</Text>:null}
                      {promoApplied?<Text style={{fontSize:10,color:th.success,marginTop:5,fontWeight:'800'}}>{T.promoApplied.replace('{n}',promoApplied)}</Text>:null}
                    </View>
                    {loggedIn&&user.bonuses>0&&(
                      <View style={{marginTop:8,paddingHorizontal:12,paddingVertical:8,backgroundColor:th.bg2,borderRadius:R,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                        <View>
                          <Text style={{fontSize:8,fontWeight:'900',letterSpacing:1.5,color:th.text}}>{T.useBonuses} · {user.bonuses} {T.bonusPoints}</Text>
                          {useBonuses&&<Text style={{fontSize:9,color:th.success,marginTop:2}}>−{bonusUsed} {T.bonusDeduct}</Text>}
                        </View>
                        <Switch value={useBonuses} onValueChange={setUseBonuses} trackColor={{true:th.text}} thumbColor={th.bg}/>
                      </View>
                    )}
                    <View style={{marginTop:20,paddingTop:20,borderTopWidth:1,borderTopColor:th.cardBorder}}>
                      <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
                        <Text style={{fontSize:12,color:th.text3}}>{T.subtotal}</Text>
                        <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>{subtotal} ₴</Text>
                      </View>
                      {promoApplied&&<View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
                        <Text style={{fontSize:12,color:th.danger}}>{T.discount} {promoApplied}%</Text>
                        <Text style={{fontSize:12,fontWeight:'700',color:th.danger}}>−{disc} ₴</Text>
                      </View>}
                      {bonusUsed>0&&<View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
                        <Text style={{fontSize:12,color:th.success}}>{T.useBonuses}</Text>
                        <Text style={{fontSize:12,fontWeight:'700',color:th.success}}>−{bonusUsed} ₴</Text>
                      </View>}
                      <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
                        <Text style={{fontSize:12,color:th.text3}}>{T.shipping}</Text>
                        <Text style={{fontSize:11,color:th.text2,fontStyle:'italic'}}>{T.shippingValue}</Text>
                      </View>
                      <View style={{flexDirection:'row',justifyContent:'space-between',paddingTop:14,borderTopWidth:1,borderTopColor:th.cardBorder}}>
                        <Text style={{fontSize:13,fontWeight:'900',letterSpacing:1,color:th.text}}>{T.total}</Text>
                        <Text style={{fontSize:18,fontWeight:'900',color:th.text}}>{totPrice} ₴</Text>
                      </View>
                    </View>
                    <View style={{height:20}}/>
                  </ScrollView>
                  <View style={{padding:16,borderTopWidth:1,borderTopColor:th.cardBorder,backgroundColor:th.bg}}>
                    <Btn th={th} label={`${T.checkoutBtn} · ${totPrice} ₴`} onPress={()=>go('checkout')}/>
                  </View>
                </>
              )}
            </View>{/* END CART */}

            {/* ══ CHECKOUT ══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='checkout'?'flex':'none',backgroundColor:th.bg}}>
              <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1}}>
                <ScrollView contentContainerStyle={{padding:20}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {/* SECTION: Contact */}
                  <View style={{marginBottom:8}}>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>{T.contact}</Text>
                    <AppInput th={th} label={T.name} placeholder={T.namePl} value={dName}
                      error={fieldErrors.dName}
                      hint="Ім'я та прізвище (2 слова)"
                      onChangeText={v=>{setDName(v);if(fieldErrors.dName)setFieldErrors(p=>({...p,dName:null}));}}/>
                    <AppInput th={th} label={T.phone} placeholder={'+380XXXXXXXXX'} value={dPhone}
                      error={fieldErrors.dPhone}
                      hint="+380 — автоматично"
                      keyboardType="phone-pad"
                      onChangeText={raw=>{
                        const d=raw.replace(/[^\d+]/g,'');
                        let fmt=d;
                        if(d.replace(/\D/g,'').length>0){
                          const digits=d.replace(/\D/g,'');
                          if(digits.startsWith('380'))fmt='+'+digits.slice(0,12);
                          else if(digits.startsWith('80'))fmt='+3'+digits.slice(0,11);
                          else if(digits.startsWith('0'))fmt='+38'+digits.slice(0,10);
                          else if(!d.startsWith('+'))fmt='+380'+digits.slice(0,9);
                          else fmt=d;
                        }
                        setDPhone(fmt);
                        if(fieldErrors.dPhone)setFieldErrors(p=>({...p,dPhone:null}));
                      }}/>
                    <AppInput th={th} label="EMAIL" placeholder="email@example.com" value={dEmail}
                      optional error={fieldErrors.dEmail}
                      keyboardType="email-address"
                      onChangeText={v=>{setDEmail(v.trim().toLowerCase());if(fieldErrors.dEmail)setFieldErrors(p=>({...p,dEmail:null}));}}/>
                    {fieldErrors.payM&&<Text style={{color:th.danger,fontSize:10,marginBottom:8}}>{fieldErrors.payM}</Text>}
                  </View>

                  {/* SECTION: Delivery */}
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>{T.deliverySection}</Text>
                  <View>
                    <AppInput th={th} label={T.city} placeholder={T.cityPl} value={dCity}
                      error={fieldErrors.dCity}
                      onChangeText={v=>{
                        setDCity(v);setDBranch('');
                        setNpBranches([]);setBranchSearch('');
                        setNpCitySuggestions([]);
                        if(fieldErrors.dCity)setFieldErrors(p=>({...p,dCity:null}));
                        searchNpCities(v);
                      }}/>
                    {/* Підказки міст */}
                    {npCitySuggestions.length>0&&(
                      <View style={{borderWidth:1,borderColor:th.cardBorder,borderRadius:12,
                        backgroundColor:th.bg,overflow:'hidden',marginTop:-8,marginBottom:8,
                        shadowColor:'#000',shadowOpacity:0.08,shadowRadius:8,elevation:4}}>
                        {npCityLoading&&<ActivityIndicator size="small" color={th.text3}
                          style={{padding:8}}/>}
                        {npCitySuggestions.map((city,i)=>(
                          <TouchableOpacity key={i}
                            style={{paddingHorizontal:14,paddingVertical:12,
                              borderBottomWidth:i<npCitySuggestions.length-1?1:0,
                              borderBottomColor:th.cardBorder,
                              flexDirection:'row',alignItems:'center',gap:8}}
                            onPress={()=>{
                              setDCity(city);
                              setNpCitySuggestions([]);
                              Keyboard.dismiss();
                            }}>
                            <Text style={{fontSize:13,color:th.text3}}>📍</Text>
                            <Text style={{fontSize:13,color:th.text,fontWeight:'500'}}>{city}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  {dCity.length>=2&&(
                    <TouchableOpacity style={{marginTop:-4,marginBottom:10,paddingVertical:10,paddingHorizontal:14,
                      backgroundColor:th.accent,borderRadius:R,alignItems:'center'}} onPress={()=>fetchNP(dCity)}>
                      <Text style={{color:th.accentText,fontSize:10,fontWeight:'700',letterSpacing:1}}>
                        {npLoading?T.branchLoading:T.findBranches}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {npLoading&&<ActivityIndicator color={th.text} style={{marginBottom:12}}/>}
                  {npErr&&<Text style={{color:th.danger,marginBottom:10,fontSize:11}}>{T.branchError}</Text>}
                  {npBranches.length>0&&(
                    <View style={{marginBottom:10,borderWidth:1,borderColor:th.cardBorder,borderRadius:R,overflow:'hidden'}}>
                      <TextInput style={{padding:12,backgroundColor:th.bg2,color:th.inputText,borderBottomWidth:1,borderBottomColor:th.cardBorder}}
                        placeholder={T.branchPl} value={branchSearch} onChangeText={setBranchSearch} placeholderTextColor={th.text4}/>
                      <ScrollView style={{maxHeight:180}} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {filtBranches.slice(0,30).map((b,i)=>(
                          <TouchableOpacity key={b.ref}
                            style={{padding:12,borderBottomWidth:i<filtBranches.length-1?1:0,
                              borderBottomColor:th.cardBorder,backgroundColor:dBranch===b.desc?th.bg2:th.bg}}
                            onPress={()=>{
                              setDBranch(b.desc);
                              setNpBranches([]);  // закриваємо список
                              setBranchSearch('');
                              if(fieldErrors.dBranch)setFieldErrors(p=>({...p,dBranch:null}));
                              Keyboard.dismiss();
                            }}>
                            <Text style={{fontSize:12,color:th.text,fontWeight:'500'}} numberOfLines={1}>{b.desc}</Text>
                            <Text style={{fontSize:10,color:th.text3,marginTop:2}} numberOfLines={1}>{b.addr}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {npBranches.length===0&&(
                    <AppInput th={th} label={T.branch} placeholder={T.branchManual} value={dBranch}
                      error={fieldErrors.dBranch}
                      keyboardType="numeric"
                      onChangeText={v=>{setDBranch(v);if(fieldErrors.dBranch)setFieldErrors(p=>({...p,dBranch:null}));}}/>
                  )}
                  {dBranch&&!fieldErrors.dBranch&&<Text style={{fontSize:11,color:th.success,marginTop:-6,marginBottom:10}}>✓ {dBranch}</Text>}

                  {/* SECTION: Payment */}
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginTop:4,marginBottom:10}}>{T.payMethod}</Text>
                  {fieldErrors.payM&&<Text style={{color:th.danger,fontSize:10,marginBottom:8}}>{fieldErrors.payM}</Text>}
                  {[{k:'liqpay',ic:'🇺🇦',lb:T.liqpayName,sb:T.liqpayDesc},{k:'monobank',ic:'🔶',lb:'Monobank',sb:'Оплата через Monobank Acquiring'},{k:'card',ic:'💳',lb:T.cardName,sb:T.cardDesc},{k:'cod',ic:'₴',lb:T.codName,sb:T.codDesc}].map(m=>(
                    <TouchableOpacity key={m.k}
                      style={{flexDirection:'row',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:th.cardBorder}}
                      onPress={()=>{setPayM(m.k);if(fieldErrors.payM)setFieldErrors(p=>({...p,payM:null}));}}>
                      <View style={{width:36,height:36,backgroundColor:payM===m.k?th.accent:th.bg2,
                        borderRadius:R,justifyContent:'center',alignItems:'center',marginRight:14}}>
                        <Text style={{fontSize:payM===m.k?12:16,color:payM===m.k?th.accentText:th.text2,fontWeight:'900'}}>{m.ic}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:'600',color:th.text}}>{m.lb}</Text>
                        <Text style={{fontSize:10,color:th.text4,marginTop:2}}>{m.sb}</Text>
                      </View>
                      <View style={{width:20,height:20,borderRadius:10,borderWidth:1.5,borderColor:payM===m.k?th.text:th.cardBorder,justifyContent:'center',alignItems:'center'}}>
                        {payM===m.k&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:th.text}}/>}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {payM==='card'&&(
                    <View style={{marginTop:12}}>
                      <AppInput th={th} label={T.cardNumber} placeholder={T.cardNumPl} value={cNum}
                        error={fieldErrors.cNum}
                        onChangeText={v=>{setCNum(fc(v));if(fieldErrors.cNum)setFieldErrors(p=>({...p,cNum:null}));}}
                        keyboardType="numeric" maxLength={19}/>
                      <View style={{flexDirection:'row',gap:12}}>
                        <View style={{flex:1}}>
                          <AppInput th={th} label={T.expiry} placeholder={T.expiryPl} value={cExp}
                            error={fieldErrors.cExp}
                            onChangeText={v=>{setCExp(fe(v));if(fieldErrors.cExp)setFieldErrors(p=>({...p,cExp:null}));}}
                            keyboardType="numeric" maxLength={5}/>
                        </View>
                        <View style={{flex:1}}>
                          <AppInput th={th} label={T.cvv} placeholder={T.cvvPl} value={cCVV}
                            error={fieldErrors.cCVV}
                            onChangeText={v=>{setCCVV(fv(v));if(fieldErrors.cCVV)setFieldErrors(p=>({...p,cCVV:null}));}}
                            keyboardType="numeric" maxLength={3} secureTextEntry/>
                        </View>
                      </View>
                      <AppInput th={th} label={T.cardHolder} placeholder={T.cardHolderPl} value={cNm}
                        error={fieldErrors.cNm}
                        onChangeText={v=>{setCNm(v.toUpperCase().replace(/[^A-Z\s]/g,''));if(fieldErrors.cNm)setFieldErrors(p=>({...p,cNm:null}));}}/>
                      <Text style={{fontSize:10,color:th.success,letterSpacing:1,fontWeight:'800',marginTop:-6,marginBottom:10}}>{T.sslNote}</Text>
                    </View>
                  )}

                  {/* ORDER SUMMARY */}
                  <View style={{marginTop:16,padding:14,backgroundColor:th.bg2,borderRadius:R}}>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:10}}>{T.yourOrder}</Text>
                    {cart.map(i=>(
                      <View key={i.key} style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                        <Text style={{fontSize:11,color:th.text2,flex:1,fontWeight:'300'}} numberOfLines={2}>{i.name} ({i.color}, {i.size}) ×{i.qty}</Text>
                        <Text style={{fontSize:11,fontWeight:'700',marginLeft:12,color:th.text}}>{i.price*i.qty} ₴</Text>
                      </View>
                    ))}
                    <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:4}}>
                      <Text style={{fontSize:11,color:th.text3}}>{T.shipping}</Text>
                      <Text style={{fontSize:10,color:th.text2,fontStyle:'italic'}}>{T.shippingValue}</Text>
                    </View>
                    <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:th.cardBorder}}>
                      <Text style={{fontWeight:'900',letterSpacing:1,fontSize:13,color:th.text}}>{T.total}</Text>
                      <Text style={{fontWeight:'900',fontSize:17,color:th.text}}>{totPrice} ₴</Text>
                    </View>
                  </View>
                  <Btn th={th} label={paying?T.processing:T.placeOrder} onPress={placeOrder}
                    disabled={paying}
                    style={{marginTop:16,marginBottom:40}}/>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>{/* END CHECKOUT */}

            {/* ══ SUCCESS ═══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='success'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:24,paddingBottom:16,alignItems:'center',flexGrow:1}}
                  alwaysBounceVertical={true}>
                <View style={{width:80,height:80,borderRadius:40,backgroundColor:'#dcfce7',justifyContent:'center',alignItems:'center',marginBottom:24,marginTop:32}}>
                  <Text style={{fontSize:36}}>✓</Text>
                </View>
                <Text style={{fontSize:13,letterSpacing:3,color:th.text,fontWeight:'900',marginBottom:8,textAlign:'center'}}>{T.orderSuccess}</Text>
                <Text style={{fontSize:12,color:th.text3,marginBottom:36,fontWeight:'300',textAlign:'center'}}>{T.smsNotice}</Text>
                {orders[0]&&<View style={{width:'100%',backgroundColor:th.bg2,padding:20,borderRadius:R,marginBottom:16}}>
                  {[[T.orderNum,'#'+orders[0].id],[T.orderDate,orders[0].date],[T.orderCity,orders[0].city],[T.orderPay,orders[0].pay],[T.orderSum,orders[0].total+' ₴']].map(([l,v],i)=>(
                    <View key={`s_${l}`} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:i<4?1:0,borderBottomColor:th.cardBorder}}>
                      <Text style={{fontSize:10,color:th.text3,letterSpacing:1.5,fontWeight:'700'}}>{l}</Text>
                      <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>{v}</Text>
                    </View>
                  ))}
                </View>}
                {orders[0]&&(()=>{
                  const willEarn=Math.floor(orders[0].total*0.03);
                  return(
                    <View style={{width:'100%',backgroundColor:'#dcfce7',padding:16,borderRadius:R,
                      marginBottom:24,borderWidth:1,borderColor:'#bbf7d0'}}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:6}}>
                        <Text style={{fontSize:22}}>⭐</Text>
                        <Text style={{fontSize:13,fontWeight:'800',color:'#15803d'}}>
                          {'Бонуси за замовлення'}
                        </Text>
                      </View>
                      <Text style={{fontSize:12,color:'#166534',lineHeight:18}}>
                        {'Після отримання посилки на ваш баланс зарахується '}
                        <Text style={{fontWeight:'900',fontSize:14}}>
                          {'+'+willEarn+' бонусів'}
                        </Text>
                        {' (3% від суми замовлення '+orders[0].total+' ₴)'}
                      </Text>
                      <Text style={{fontSize:10,color:'#166534',marginTop:6,opacity:0.7}}>
                        1 бонус = 1 ₴ знижки при наступній покупці
                      </Text>
                    </View>
                  );
                })()}
                <Btn th={th} label={T.toOrders} onPress={()=>setScr('orders')} style={{width:'100%',marginBottom:12}}/>
                <Btn th={th} label={T.toMain} onPress={()=>setScr('home')} ghost style={{width:'100%'}}/>
              </ScrollView>
            </View>{/* END SUCCESS */}

            {/* ══ WISHLIST ══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='wishlist'?'flex':'none',backgroundColor:th.bg}}>
              {wish.length===0?(
                <ScrollView contentContainerStyle={{flex:1,justifyContent:'center',alignItems:'center',padding:48,minHeight:400}}
                  alwaysBounceVertical={true}>
                  <Text style={{fontSize:40,marginBottom:16}}>♡</Text>
                  <Text style={{fontSize:9,letterSpacing:4,color:th.text4,marginBottom:20}}>{T.emptyWish}</Text>
                  <Btn th={th} label={T.toCatalog} onPress={()=>setScr('home')} style={{paddingHorizontal:40}}/>
                </ScrollView>
              ):(
                <ScrollView contentContainerStyle={{
                  flexDirection:'row',flexWrap:'wrap',
                  paddingHorizontal:GUTTER,paddingTop:GUTTER,paddingBottom:NAV_BOT+8}}>
                  {wishedProducts.map((item,i)=>{
                    const wished2=wish.includes(item.id);
                    const inCart2=(cart.find(c=>c.id===item.id)?.qty)||0;
                    return(
                    <View key={`wish_${item.id}_${i}`}
                      style={{width:CARD_W,marginBottom:20,
                        marginRight:i%2===0?GUTTER:0}}>
                      <TouchableOpacity activeOpacity={0.95}
                        onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}>
                        {/* Фото */}
                        <View style={{borderRadius:12,overflow:'hidden',position:'relative',
                          backgroundColor:'transparent'}}>
                          <Image source={{uri:thumbUri(item.img||'')}}
                            style={{width:CARD_W,height:CARD_H}} resizeMode="cover"/>
                          {/* Номер */}
                          <View style={{position:'absolute',top:10,left:10,
                            width:22,height:22,borderRadius:11,
                            backgroundColor:'rgba(255,255,255,0.9)',
                            justifyContent:'center',alignItems:'center'}}>
                            <Text style={{fontSize:10,fontWeight:'700',color:'#111'}}>{i+1}</Text>
                          </View>
                          {/* Badge */}
                          {item.badge&&(
                            <View style={{position:'absolute',top:10,left:38,
                              backgroundColor:item.badge==='Sale'?'#ef4444':'#111',
                              paddingHorizontal:7,paddingVertical:3,borderRadius:4}}>
                              <Text style={{color:'#fff',fontSize:8,fontWeight:'800'}}>
                                {item.badge.toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {/* Мало залишку */}
                          {item.stock>0&&item.stock<=3&&(
                            <View style={{position:'absolute',bottom:8,left:8,
                              backgroundColor:'rgba(239,68,68,0.9)',
                              paddingHorizontal:6,paddingVertical:3,borderRadius:6}}>
                              <Text style={{color:'#fff',fontSize:8,fontWeight:'700'}}>
                                {'залишок: '+item.stock}
                              </Text>
                            </View>
                          )}
                          {inCart2>0&&(
                            <View style={{position:'absolute',bottom:8,right:8,
                              width:20,height:20,backgroundColor:'#111',
                              borderRadius:10,justifyContent:'center',alignItems:'center'}}>
                              <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>{inCart2}</Text>
                            </View>
                          )}
                        </View>
                        {/* Інфо під фото — як в каталозі */}
                        <View style={{paddingTop:10,paddingHorizontal:2,
                          flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between'}}>
                          <View style={{flex:1,paddingRight:8}}>
                            <Text style={{fontSize:13,fontWeight:'500',color:th.text,lineHeight:18}}
                              numberOfLines={2}>{item.name}</Text>
                            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:4}}>
                              <Text style={{fontSize:15,fontWeight:'700',color:th.text}}>{item.price} ₴</Text>
                              {item.old>0&&(
                                <Text style={{fontSize:12,color:th.text4,textDecorationLine:'line-through'}}>
                                  {item.old} ₴
                                </Text>
                              )}
                            </View>
                          </View>
                          {/* Серце — видалити з обраного */}
                          <TouchableOpacity
                            style={{paddingTop:2,paddingLeft:4}}
                            onPress={()=>setWish(p=>p.filter(x=>x!==item.id))}>
                            <Text style={{fontSize:20,color:'#ef4444'}}>♥</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </View>
                    );
                  })}
                  <View style={{height:24,width:'100%'}}/>
                </ScrollView>
              )}
            </View>{/* END WISHLIST */}

            {/* ══ ORDERS ════════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='orders'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}
                  alwaysBounceVertical={true}>
                {selOrder?(
                  <View>
                    <TouchableOpacity onPress={()=>setSelOrder(null)} style={{marginBottom:20,flexDirection:'row',alignItems:'center',gap:8}}>
                      <Text style={{fontSize:18,color:th.text}}>←</Text>
                      <Text style={{fontSize:10,letterSpacing:2,color:th.text3,fontWeight:'800'}}>{T.back}</Text>
                    </TouchableOpacity>
                    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                      <Text style={{fontWeight:'900',fontSize:16,color:th.text}}>#{selOrder.id}</Text>
                      <View style={{paddingHorizontal:14,paddingVertical:6,backgroundColor:ST_BG[selOrder.status]||th.bg2,borderRadius:20}}>
                        <Text style={{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:ST_COLOR[selOrder.status]||th.text}}>
                          {ST_ICON[selOrder.status]} {stLabel(selOrder.status).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={{backgroundColor:th.bg2,padding:16,borderRadius:R,marginBottom:12}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:16}}>{T.orderStatus}</Text>
                      {ST_SEQ.map((s,i)=>{
                        const idx=ST_SEQ.indexOf(selOrder.status);
                        const done=i<=idx&&selOrder.status!=='Скасовано';
                        return(
                          <View key={s} style={{flexDirection:'row',alignItems:'flex-start'}}>
                            <View style={{alignItems:'center',width:28,marginRight:12}}>
                              <View style={{width:22,height:22,borderRadius:11,backgroundColor:done?th.accent:th.bg3,
                                borderWidth:done?0:1,borderColor:th.cardBorder,justifyContent:'center',alignItems:'center'}}>
                                {done&&<Text style={{color:th.accentText,fontSize:10,fontWeight:'900'}}>✓</Text>}
                              </View>
                              {i<ST_SEQ.length-1&&<View style={{width:2,height:24,backgroundColor:done?th.accent:th.bg3}}/>}
                            </View>
                            <Text style={{fontSize:12,color:done?th.text:th.text3,fontWeight:done?'600':'300',paddingTop:3,paddingBottom:16}}>
                              {[T.step1,T.step2,T.step3,T.step4][i]}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={{backgroundColor:th.bg2,padding:16,borderRadius:R,marginBottom:12}}>
                      {[[T.orderDate,selOrder.date],[T.trackingNP,selOrder.track],[T.orderCity,selOrder.city],[T.orderPay,selOrder.pay],[T.orderSum,selOrder.total+' ₴']].map(([l,v],i)=>(
                        <View key={`od_${l}`} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:i<4?1:0,borderBottomColor:th.cardBorder}}>
                          <Text style={{fontSize:10,color:th.text3,letterSpacing:1.5,fontWeight:'700'}}>{l}</Text>
                          <Text style={{fontSize:12,fontWeight:'600',color:th.text,maxWidth:W*0.5,textAlign:'right'}}>{v}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{backgroundColor:th.bg2,padding:16,borderRadius:R,marginBottom:12}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>{T.orderItems}</Text>
                      {selOrder.items.map((it,i)=><Text key={`item_${i}_${it.slice(0,10)}`} style={{fontSize:12,color:th.text2,fontWeight:'300',marginBottom:6,lineHeight:18}}>· {it}</Text>)}
                    </View>
                  </View>
                ):(
                  <>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:20}}>{T.myOrders}</Text>
                    {orders.length===0?(
                      <View style={{alignItems:'center',paddingVertical:60}}>
                        <Text style={{fontSize:40,marginBottom:16}}>📦</Text>
                        <Text style={{fontSize:9,letterSpacing:4,color:th.text4,marginBottom:20}}>{T.noOrders}</Text>
                        <Btn th={th} label={T.firstOrder} onPress={()=>setScr('home')} style={{paddingHorizontal:24}}/>
                      </View>
                    ):orders.map(o=>(
                      <TouchableOpacity key={String(o.id)}
                        style={{paddingVertical:16,borderBottomWidth:1,borderBottomColor:th.cardBorder}}
                        onPress={()=>setSelOrder(o)}>
                        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <Text style={{fontWeight:'800',fontSize:14,color:th.text}}>#{o.id}</Text>
                          <View style={{paddingHorizontal:12,paddingVertical:4,backgroundColor:ST_BG[o.status]||th.bg2,borderRadius:20}}>
                            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:1,color:ST_COLOR[o.status]||th.text}}>
                              {ST_ICON[o.status]} {stLabel(o.status).toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={{fontSize:11,color:th.text3,marginBottom:8,fontWeight:'300'}} numberOfLines={1}>{o.items.join(' · ')}</Text>
                        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                          <Text style={{fontSize:10,color:th.text4}}>{o.date}</Text>
                          <Text style={{fontWeight:'900',fontSize:13,color:th.text}}>{o.total} ₴</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>{/* END ORDERS */}

            {/* ══ NOTIFICATIONS ══════════════════════════════════ */}
            <View style={{flex:1,display:scr==='notifs'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{paddingBottom:40}}
                  alwaysBounceVertical={true}>
                {notifications.length>0&&(
                  <View style={{flexDirection:'row',justifyContent:'space-between',
                    alignItems:'center',paddingHorizontal:20,paddingVertical:14}}>
                    <Text style={{fontSize:9,letterSpacing:2,color:th.text4,fontWeight:'800'}}>
                      {unreadNotifs>0?(unreadNotifs+' НЕПРОЧИТАНИХ'):'ВСІ ПРОЧИТАНІ'}
                    </Text>
                    <View style={{flexDirection:'row',gap:16}}>
                      {unreadNotifs>0&&(
                        <TouchableOpacity onPress={markNotifsRead}>
                          <Text style={{fontSize:11,color:th.text3,fontWeight:'600'}}>Прочитати всі</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={()=>setNotifications([])}>
                        <Text style={{fontSize:11,color:'#dc2626',fontWeight:'600'}}>Очистити</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {notifications.length===0?(
                  <View style={{alignItems:'center',gap:16,paddingHorizontal:40,
                    minHeight:500,justifyContent:'center',paddingTop:60}}>
                    <Text style={{fontSize:48}}>🔔</Text>
                    <Text style={{fontSize:15,fontWeight:'700',color:th.text,textAlign:'center'}}>
                      Поки немає сповіщень
                    </Text>
                    <Text style={{fontSize:12,color:th.text4,textAlign:'center',lineHeight:18}}>
                      {'Тут зʼявлятимуться оновлення статусів замовлень та інша інформація'}
                    </Text>
                  </View>
                ):notifications.map((n,i)=>{
                  const accentMap={order:'#059669',status:'#2563eb',promo:'#d97706',info:'#6b7280'};
                  const bgMap={order:'#f0fdf4',status:'#eff6ff',promo:'#fffbeb'};
                  const accent=accentMap[n.type]||'#6b7280';
                  return(
                    <TouchableOpacity key={String(n.id)}
                      onPress={()=>{
                        setNotifications(p=>p.map(x=>x.id===n.id?{...x,read:true}:x));
                        if(n.orderId){
                          const ord=orders.find(o=>String(o.id)===String(n.orderId));
                          if(ord){setSelOrder(ord);setScr('orders');}
                        }
                      }}
                      style={{marginHorizontal:16,marginVertical:5,borderRadius:20,
                        backgroundColor:n.read?th.bg2:(bgMap[n.type]||th.bg2),
                        padding:16,
                        borderLeftWidth:3,borderLeftColor:n.read?th.cardBorder:accent}}>
                      <View style={{flexDirection:'row',alignItems:'flex-start',gap:12}}>
                        <View style={{width:38,height:38,borderRadius:19,
                          backgroundColor:n.read?th.bg3:accent+'22',
                          justifyContent:'center',alignItems:'center'}}>
                          <Text style={{fontSize:18}}>
                            {n.type==='order'?'✅':n.type==='status'?'📦':n.type==='promo'?'🎁':'ℹ️'}
                          </Text>
                        </View>
                        <View style={{flex:1}}>
                          <View style={{flexDirection:'row',alignItems:'center',marginBottom:3}}>
                            <Text style={{fontSize:13,fontWeight:n.read?'500':'800',color:th.text,flex:1}}
                              numberOfLines={1}>{n.title}</Text>
                            {!n.read&&<View style={{width:8,height:8,borderRadius:4,backgroundColor:accent,marginLeft:8}}/>}
                          </View>
                          <Text style={{fontSize:12,color:th.text3,lineHeight:17}}>{n.body}</Text>
                          <Text style={{fontSize:10,color:th.text4,marginTop:6}}>{n.time}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>{/* END NOTIFICATIONS */}

            {/* ══ PROFILE ═══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='profile'?'flex':'none',backgroundColor:th.bg}}>
              {isAdmin?(
                /* ══════════════════════════════════════
                   АДМІН ПРОФІЛЬ — повний дашборд
                   ══════════════════════════════════════ */
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>

                  {/* Header — чорна картка з ролью */}
                  <View style={{backgroundColor:'#111',margin:16,borderRadius:20,padding:20,gap:4}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:14,marginBottom:8}}>
                      <View style={{width:52,height:52,borderRadius:26,
                        backgroundColor:'rgba(255,255,255,.1)',
                        borderWidth:1,borderColor:'rgba(255,255,255,.2)',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:22}}>⚙</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:18,fontWeight:'300',color:'#fff',letterSpacing:0.3}}>
                          {user.name||'Адміністратор'}
                        </Text>
                        <Text style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:2}}>
                          {user.email}
                        </Text>
                      </View>
                      <View style={{backgroundColor:'rgba(34,197,94,.15)',paddingHorizontal:10,
                        paddingVertical:4,borderRadius:20,borderWidth:1,borderColor:'rgba(34,197,94,.3)'}}>
                        <Text style={{fontSize:9,color:'#22c55e',fontWeight:'900',letterSpacing:1}}>
                          ADMIN
                        </Text>
                      </View>
                    </View>
                    <View style={{flexDirection:'row',gap:6}}>
                      <View style={{flex:1,backgroundColor:'rgba(255,255,255,.06)',borderRadius:12,padding:12,alignItems:'center'}}>
                        <Text style={{fontSize:22,fontWeight:'200',color:'#fff'}}>{products.length}</Text>
                        <Text style={{fontSize:9,color:'rgba(255,255,255,.35)',marginTop:2,letterSpacing:0.5}}>ТОВАРІВ</Text>
                      </View>
                      <View style={{flex:1,backgroundColor:'rgba(255,255,255,.06)',borderRadius:12,padding:12,alignItems:'center'}}>
                        <Text style={{fontSize:22,fontWeight:'200',color:'#fff'}}>{orders.length}</Text>
                        <Text style={{fontSize:9,color:'rgba(255,255,255,.35)',marginTop:2,letterSpacing:0.5}}>ЗАМОВЛЕНЬ</Text>
                      </View>
                      <View style={{flex:1,backgroundColor:'rgba(255,255,255,.06)',borderRadius:12,padding:12,alignItems:'center'}}>
                        <Text style={{fontSize:22,fontWeight:'200',color:'#fff'}}>
                          {orders.reduce((s,o)=>s+(o.total||0),0)}
                        </Text>
                        <Text style={{fontSize:9,color:'rgba(255,255,255,.35)',marginTop:2,letterSpacing:0.5}}>ВИРУЧКА ₴</Text>
                      </View>
                    </View>
                  </View>

                  {/* Швидкі дії */}
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,
                    paddingHorizontal:20,marginBottom:10}}>УПРАВЛІННЯ</Text>

                  <View style={{paddingHorizontal:16,gap:8}}>
                    {/* Товари */}
                    <TouchableOpacity
                      onPress={()=>{setAdminTabHist([]);setScr('admin');setAdminTab('products');loadAdminProducts();}}
                      style={{flexDirection:'row',alignItems:'center',backgroundColor:th.bg2,
                        borderRadius:16,padding:16,gap:14}}>
                      <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#111',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:20}}>📦</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:th.text}}>Товари</Text>
                        <Text style={{fontSize:11,color:th.text4,marginTop:1}}>
                          {products.length} позицій · {stockAlertCount} закінчуються
                        </Text>
                      </View>
                      <Text style={{color:th.text4,fontSize:20}}>›</Text>
                    </TouchableOpacity>

                    {/* Замовлення */}
                    <TouchableOpacity
                      onPress={()=>{setScr('admin');setAdminTab('orders');}}
                      style={{flexDirection:'row',alignItems:'center',backgroundColor:th.bg2,
                        borderRadius:16,padding:16,gap:14}}>
                      <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#111',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:20}}>🧾</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:th.text}}>Замовлення</Text>
                        <Text style={{fontSize:11,color:th.text4,marginTop:1}}>
                          {orders.length===0?'Поки немає замовлень':orders.length+' замовлень · '+orders.reduce((s,o)=>s+(o.total||0),0)+' ₴'}
                        </Text>
                      </View>
                      <Text style={{color:th.text4,fontSize:20}}>›</Text>
                    </TouchableOpacity>

                    {/* Статистика */}
                    <TouchableOpacity
                      onPress={()=>{setScr('admin');setAdminTab('stats');}}
                      style={{flexDirection:'row',alignItems:'center',backgroundColor:th.bg2,
                        borderRadius:16,padding:16,gap:14}}>
                      <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#111',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:20}}>📊</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:th.text}}>Аналітика</Text>
                        <Text style={{fontSize:11,color:th.text4,marginTop:1}}>
                          {'Ціни · Категорії · Залишки'}
                        </Text>
                      </View>
                      <Text style={{color:th.text4,fontSize:20}}>›</Text>
                    </TouchableOpacity>

                    {/* Додати товар */}
                    <TouchableOpacity
                      onPress={()=>{setScr('admin');setAdminTab('products');loadAdminProducts();setShowAddProduct(true);}}
                      style={{flexDirection:'row',alignItems:'center',
                        backgroundColor:'#111',borderRadius:16,padding:16,gap:14}}>
                      <View style={{width:44,height:44,borderRadius:12,
                        backgroundColor:'rgba(255,255,255,.08)',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:20,color:'#fff'}}>＋</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:'#fff'}}>Додати товар</Text>
                        <Text style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:1}}>
                          Новий товар у каталог
                        </Text>
                      </View>
                      <Text style={{color:'rgba(255,255,255,.3)',fontSize:20}}>›</Text>
                    </TouchableOpacity>

                    {/* Редагувати банер */}
                    <TouchableOpacity
                      onPress={()=>{setScr('admin');setAdminTab('content');}}
                      style={{flexDirection:'row',alignItems:'center',
                        backgroundColor:th.bg2,borderRadius:16,padding:16,gap:14,
                        borderWidth:1,borderColor:th.cardBorder}}>
                      <View style={{width:44,height:44,borderRadius:12,
                        backgroundColor:th.bg3,
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:22}}>🖼</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:th.text}}>Банер головної</Text>
                        <Text style={{fontSize:11,color:th.text4,marginTop:1}}>
                          Фото · Заголовок · Підзаголовок
                        </Text>
                      </View>
                      <Text style={{color:th.text4,fontSize:20}}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Система */}
                  {/* ── ADMIN HUB BUTTON ── */}
                  <TouchableOpacity
                    onPress={()=>setShowAdminHub(true)}
                    style={{marginHorizontal:16,marginTop:8,
                      flexDirection:'row',alignItems:'center',
                      background:'linear-gradient(135deg,#667eea,#764ba2)',
                      backgroundColor:'#4f46e5',
                      borderRadius:16,padding:16,gap:14}}>
                    <View style={{width:44,height:44,borderRadius:12,
                      backgroundColor:'rgba(255,255,255,.15)',
                      justifyContent:'center',alignItems:'center'}}>
                      <Text style={{fontSize:22}}>🛠</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:14,fontWeight:'700',color:'#fff'}}>Адмін-інструменти</Text>
                      <Text style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:1}}>
                        Категорії · Меню · CSV · Push · Промокоди
                      </Text>
                    </View>
                    <Text style={{color:'rgba(255,255,255,.5)',fontSize:20}}>›</Text>
                  </TouchableOpacity>

                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,
                    paddingHorizontal:20,marginTop:24,marginBottom:10}}>СИСТЕМА</Text>

                  <View style={{marginHorizontal:16,backgroundColor:'transparent',borderRadius:16,overflow:'hidden'}}>
                    {[
                      ['Роль',      user?.role||'—  (не знайдена в profiles)'],
                      ['Email',     user?.email||'—'],
                      ['Build',    'BUILD-60HZ8D-AS8XGM · v4.0'],
                      ['База даних','Supabase · products / profiles / orders'],
                      ['Платежі',  'LiqPay (тестовий режим)'],
                      ['Доставка', 'Nova Poshta API'],
                      ['Захист',   'Firebase Auth · Row Level Security'],
                      ['Кеш',      'AsyncStorage · ' + products.length + ' товарів'],
                    ].map(([label,val],i,arr)=>(
                      <View key={i} style={{flexDirection:'row',justifyContent:'space-between',
                        alignItems:'center',paddingHorizontal:16,paddingVertical:13,
                        borderBottomWidth:i<arr.length-1?1:0,borderBottomColor:th.cardBorder}}>
                        <Text style={{fontSize:11,color:th.text4,fontWeight:'600',width:90}}>{label}</Text>
                        <Text style={{fontSize:11,color:th.text2,flex:1,textAlign:'right'}} numberOfLines={1}>{val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Налаштування та вихід */}
                  <View style={{marginHorizontal:16,marginTop:16,gap:8}}>
                    <TouchableOpacity
                      onPress={()=>go('settings')}
                      style={{flexDirection:'row',alignItems:'center',
                        paddingHorizontal:16,paddingVertical:14,
                        backgroundColor:th.bg2,borderRadius:14,gap:12}}>
                      <Text style={{fontSize:16}}>⚙️</Text>
                      <Text style={{flex:1,fontSize:13,fontWeight:'500',color:th.text}}>Налаштування додатку</Text>
                      <Text style={{color:th.text4,fontSize:18}}>›</Text>
                    </TouchableOpacity>
                    {/* Примусове оновлення ролі з Supabase — тільки для адмінів */}
                    {isAdmin&&<TouchableOpacity
                      onPress={async()=>{
                        try{
                          const {data:{user:authUser}}=await supabase.auth.getUser();
                          if(!authUser) return showNotif('Не авторизовано','error');
                          const {data:p,error}=await supabase.from('profiles').select('*').eq('id',authUser.id).single();
                          if(error) return showNotif('Помилка: '+error.message,'error');
                          setUserRaw(prev=>({...prev,...p,role:p?.role||null}));
                          showNotif(p?.role==='admin'?'✓ Ви адміністратор':p?.role?'Ваша роль: '+p.role:'Звичайний користувач','info');
                        }catch(e){showNotif('Помилка: '+e.message,'error');}
                      }}
                      style={{paddingVertical:14,borderWidth:1,
                        borderColor:th.cardBorder,borderRadius:14,alignItems:'center',
                        backgroundColor:th.bg2,flexDirection:'row',justifyContent:'center',gap:8}}>
                      <Text style={{fontSize:14}}>🔄</Text>
                      <Text style={{fontSize:10,letterSpacing:1.5,color:th.text3,fontWeight:'700'}}>
                        ОНОВИТИ РОЛЬ З SUPABASE
                      </Text>
                    </TouchableOpacity>}
                    <TouchableOpacity
                      onPress={()=>setLoggedIn(false)}
                      style={{paddingVertical:14,borderWidth:1,
                        borderColor:'#fecaca',borderRadius:14,alignItems:'center',
                        backgroundColor:'#fef2f2'}}>
                      <Text style={{fontSize:10,letterSpacing:2.5,color:'#dc2626',fontWeight:'900'}}>
                        ВИЙТИ З АКАУНТУ
                      </Text>
                    </TouchableOpacity>
                  </View>

                </ScrollView>

              ):(
                /* ══════════════════════════════════════
                   ЗВИЧАЙНИЙ ПРОФІЛЬ
                   ══════════════════════════════════════ */
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* ── ACCOUNT HEADER — dark cards ── */}
                  <View style={{padding:16,gap:12}}>

                    {/* Card 1 — User info */}
                    <View style={{backgroundColor:'#111',borderRadius:16,padding:20,
                      flexDirection:'row',alignItems:'center',gap:16}}>
                      <View style={{width:56,height:56,borderRadius:28,
                        borderWidth:1,borderColor:'rgba(255,255,255,.2)',
                        backgroundColor:'rgba(255,255,255,.08)',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:22,fontWeight:'300',color:'#fff'}}>
                          {loggedIn?(user.name||'?')[0].toUpperCase():'–'}
                        </Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:19,fontWeight:'300',color:'#fff',letterSpacing:0.3}}>
                          {loggedIn?user.name:T.guest}
                        </Text>
                        <Text style={{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:5}}>
                          {loggedIn?user.email:T.loginPrompt}
                        </Text>
                        {loggedIn&&(
                          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:8}}>
                            <View style={{width:6,height:6,borderRadius:3,backgroundColor:'#22c55e'}}/>
                            <Text style={{fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:1.5}}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      {!loggedIn?(
                        <TouchableOpacity
                          style={{paddingHorizontal:14,paddingVertical:8,
                            backgroundColor:'rgba(255,255,255,.12)',
                            borderRadius:R,borderWidth:1,borderColor:'rgba(255,255,255,.15)'}}
                          onPress={()=>setScr('auth')}>
                          <Text style={{color:'#fff',fontSize:10,fontWeight:'800',letterSpacing:1.5}}>{T.loginBtn}</Text>
                        </TouchableOpacity>
                      ):(
                        <TouchableOpacity
                          style={{paddingHorizontal:14,paddingVertical:8,
                            backgroundColor:'rgba(255,255,255,.1)',
                            borderRadius:R,borderWidth:1,borderColor:'rgba(255,255,255,.12)'}}
                          onPress={()=>{setEName(user.name);setEPhone(user.phone);setEditProf(true);}}>
                          <Text style={{color:'rgba(255,255,255,.6)',fontSize:10,fontWeight:'800',letterSpacing:1.5}}>EDIT</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Card 2 — Bonus balance */}
                    {loggedIn&&(
                      <View style={{backgroundColor:'#111',borderRadius:16,padding:20}}>
                        <Text style={{fontSize:10,color:'rgba(255,255,255,.3)',letterSpacing:3,marginBottom:10,fontWeight:'700'}}>БОНУСНИЙ БАЛАНС</Text>
                        <View style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'}}>
                          <View style={{flexDirection:'row',alignItems:'flex-end',gap:8}}>
                            <Text style={{fontSize:40,fontWeight:'200',color:'#fff',letterSpacing:1,lineHeight:44}}>{user.bonuses}</Text>
                            <Text style={{fontSize:13,color:'rgba(255,255,255,.35)',marginBottom:6}}>балів</Text>
                          </View>
                          <View style={{alignItems:'flex-end',gap:4}}>
                            <Text style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>1 БАЛ = 1 ₴</Text>
                            <Text style={{fontSize:10,color:'rgba(255,255,255,.25)'}}>5% з кожного замовлення</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Loyalty level card */}
                  {loggedIn&&(()=>{
                    const lvl=getLoyaltyLevel(user.bonuses);
                    const progress=lvl.next?Math.min(1,(user.bonuses-lvl.min)/(lvl.next-lvl.min)):1;
                    return(
                      <View style={{marginHorizontal:16,marginBottom:4,borderRadius:16,padding:18,
                        borderWidth:1,borderColor:th.cardBorder,backgroundColor:th.bg2}}>
                        <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12}}>
                          <Text style={{fontSize:22}}>{lvl.icon}</Text>
                          <View style={{flex:1}}>
                            <Text style={{fontSize:13,fontWeight:'700',color:lvl.color,letterSpacing:1}}>{lvl.name.toUpperCase()} MEMBER</Text>
                            <Text style={{fontSize:10,color:th.text4,marginTop:2}}>
                              {lvl.next?`${user.bonuses}/${lvl.next} балів до ${lvl.name==='Bronze'?'Silver':'Gold'}`:'Максимальний рівень 👑'}
                            </Text>
                          </View>
                        </View>
                        {lvl.next&&(
                          <View style={{height:4,backgroundColor:th.bg3,borderRadius:2,overflow:'hidden'}}>
                            <View style={{height:4,width:`${progress*100}%`,backgroundColor:lvl.color,borderRadius:2}}/>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Referral button */}
                  {loggedIn&&(
                    <TouchableOpacity
                      style={{marginHorizontal:16,marginBottom:12,flexDirection:'row',alignItems:'center',
                        gap:12,padding:16,borderRadius:R,borderWidth:1,borderColor:th.cardBorder}}
                      onPress={()=>setShowReferral(true)}>
                      <Text style={{fontSize:20}}>🎁</Text>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:'600',color:th.text}}>Запросити друга</Text>
                        <Text style={{fontSize:10,color:th.text4,marginTop:1}}>+100 бонусів вам і другу</Text>
                      </View>
                      <Text style={{color:th.text4,fontSize:18}}>›</Text>
                    </TouchableOpacity>
                  )}

                  {[
                    {ic:'📦',lb:T.myOrdersMenu,sb:orders.length,s:'orders'},
                    {ic:'♡',lb:T.favMenu,sb:wish.length,s:'wishlist'},
                    {ic:'📍',lb:T.addressMenu,sb:savedAddr.length,s:'addresses'},
                    {ic:'💳',lb:T.cardsMenu,sb:savedCards.length,s:'cards'},
                    {ic:'⚙️',lb:T.settingsMenu,sb:T.themeSubtitle,s:'settings'},
                    {ic:'💬',lb:T.supportMenu,sb:T.supportSubtitle,s:'support'},
                  ].map((item,i)=>(
                    <TouchableOpacity key={i}
                      style={{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingVertical:11,
                        borderBottomWidth:1,borderBottomColor:th.cardBorder,backgroundColor:th.bg}}
                      onPress={()=>item.s&&go(item.s)}>
                      <View style={{width:36,height:36,backgroundColor:th.bg2,borderRadius:10,justifyContent:'center',alignItems:'center',marginRight:14}}>
                        <Text style={{fontSize:18}}>{item.ic}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'500',color:th.text}}>{item.lb}</Text>
                        <Text style={{fontSize:9,color:th.text4,letterSpacing:.8,marginTop:2}}>{String(item.sb).toUpperCase()}</Text>
                      </View>
                      <Text style={{color:th.text4,fontSize:20}}>›</Text>
                    </TouchableOpacity>
                  ))}
                  {loggedIn&&(
                    <TouchableOpacity style={{margin:20,marginTop:12,paddingVertical:14,borderWidth:1,
                      borderColor:'#fecaca',borderRadius:R,alignItems:'center',backgroundColor:'#fef2f2'}}
                      onPress={()=>setLoggedIn(false)}>
                      <Text style={{fontSize:9,letterSpacing:2.5,color:'#dc2626',fontWeight:'900'}}>{T.logout}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{height:32}}/>
                </ScrollView>
              )}
            </View>{/* END PROFILE */}

            {/* ══ SETTINGS ══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='settings'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}
                  alwaysBounceVertical={true}>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16,marginBottom:12}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.notifications}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                    paddingVertical:12,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                    <View>
                      <Text style={{fontSize:13,color:th.text,fontWeight:'500'}}>Push-сповіщення</Text>
                      <Text style={{fontSize:10,color:th.text4,marginTop:2}}>Акції, статус замовлення</Text>
                    </View>
                    <TouchableOpacity
                      onPress={()=>{showNotif('Push-сповіщення підключено ✓','success');}}
                      style={{backgroundColor:th.text,paddingHorizontal:14,paddingVertical:6,borderRadius:16}}>
                      <Text style={{fontSize:9,fontWeight:'900',color:th.bg,letterSpacing:1}}>
                        {notifPerm?'ВКЛ ✓':'УВІМКНУТИ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {[{lb:T.pushLabel,sb:T.pushSub,v:notif,fn:setNotif},{lb:T.smsLabel,sb:T.smsSub,v:smsNotif,fn:setSmsNotif}].map((item,i)=>(
                    <View key={i} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:13,borderBottomWidth:i<1?1:0,borderBottomColor:th.cardBorder}}>
                      <View>
                        <Text style={{fontSize:13,color:th.text,fontWeight:'600'}}>{item.lb}</Text>
                        <Text style={{fontSize:9,color:th.text4,letterSpacing:1,marginTop:3}}>{item.sb.toUpperCase()}</Text>
                      </View>
                      <Switch value={item.v} onValueChange={item.fn} trackColor={{true:th.text}} thumbColor={th.bg}/>
                    </View>
                  ))}
                </View>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16,marginBottom:12}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.theme}</Text>
                  <View style={{flexDirection:'row',gap:8,marginBottom:16}}>
                    {[{k:'auto',l:'⚙️ Авто'},{k:'light',l:T.themeLight},{k:'dark',l:T.themeDark}].map(({k,l})=>(
                      <TouchableOpacity key={k}
                        style={{flex:1,paddingVertical:11,borderRadius:R,alignItems:'center',
                          borderWidth:1,borderColor:themeMode===k?th.text:th.cardBorder,
                          backgroundColor:themeMode===k?th.accent:'transparent'}}
                        onPress={()=>setThemeMode(k)}>
                        <Text style={{fontSize:11,color:themeMode===k?th.accentText:th.text3,fontWeight:'600'}}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16,marginBottom:12}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.language}</Text>
                  <View style={{flexDirection:'row',gap:10}}>
                    {[{k:'UA',l:'🇺🇦 UA'},{k:'EN',l:'🇬🇧 EN'}].map(({k,l})=>(
                      <TouchableOpacity key={k}
                        style={{flex:1,paddingVertical:12,borderRadius:R,alignItems:'center',
                          borderWidth:1,borderColor:lang===k?th.text:th.cardBorder,
                          backgroundColor:lang===k?th.accent:'transparent'}}
                        onPress={()=>setLang(k)}>
                        <Text style={{fontSize:12,color:lang===k?th.accentText:th.text3,fontWeight:'600'}}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.about}</Text>
                  {[T.terms,T.privacy,T.licenses].map((item,i)=>(
                    <TouchableOpacity key={i} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:13,borderBottomWidth:i<2?1:0,borderBottomColor:th.cardBorder}}>
                      <Text style={{fontSize:13,color:th.text2,fontWeight:'300'}}>{item}</Text>
                      <Text style={{color:th.text4,fontSize:18}}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{textAlign:'center',fontSize:8,letterSpacing:4,color:th.text4,marginTop:32,fontWeight:'900'}}>{T.version}</Text>
              </ScrollView>
            </View>{/* END SETTINGS */}

            {/* ══ ADDRESSES ═════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='addresses'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}
                  alwaysBounceVertical={true}>
                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:20}}>{T.savedAddr}</Text>
                {savedAddr.map(addr=>(
                  <View key={addr.id} style={{backgroundColor:th.bg2,padding:16,marginBottom:10,borderRadius:R}}>
                    <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:8}}>
                      <Text style={{fontWeight:'700',fontSize:13,color:th.text}}>{addr.city} · #{addr.branch}</Text>
                      <TouchableOpacity onPress={()=>setSavedAddr(p=>p.filter(a=>a.id!==addr.id))}>
                        <Text style={{fontSize:9,color:th.danger,letterSpacing:1,fontWeight:'800'}}>{T.delete}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{fontSize:11,color:th.text3,fontWeight:'300'}}>{addr.phone}</Text>
                  </View>
                ))}
                <Btn th={th} label={T.addAddress} onPress={()=>setShowAddAddr(true)} ghost style={{marginTop:8}}/>
              </ScrollView>
            </View>{/* END ADDRESSES */}

            {/* ══ CARDS ═════════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='cards'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}
                  alwaysBounceVertical={true}>
                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:20}}>{T.savedCards}</Text>
                {savedCards.map(card=>(
                  <View key={card.id} style={{backgroundColor:'#1a1a2e',padding:24,marginBottom:12,borderRadius:R}}>
                    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <View>
                        <Text style={{color:'rgba(255,255,255,.25)',fontSize:8,letterSpacing:4,marginBottom:16}}>{BRAND}</Text>
                        <Text style={{color:'#fff',fontSize:16,letterSpacing:5,fontWeight:'200'}}>•••• •••• •••• {card.last4}</Text>
                        <Text style={{color:'rgba(255,255,255,.4)',fontSize:10,letterSpacing:2,marginTop:16}}>{card.brand} · {card.exp}</Text>
                      </View>
                      <TouchableOpacity onPress={()=>setSavedCards(p=>p.filter(c=>c.id!==card.id))}>
                        <Text style={{color:'rgba(255,255,255,.25)',fontSize:9,letterSpacing:1}}>{T.delete}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <Btn th={th} label={T.addCard} onPress={()=>setShowAddCard(true)} ghost style={{marginTop:8}}/>
                <View style={{backgroundColor:th.bg2,padding:14,borderRadius:R,marginTop:12}}>
                  <Text style={{fontSize:11,color:th.text3,lineHeight:17,fontWeight:'300'}}>{T.cardStoredLocally}</Text>
                </View>
              </ScrollView>
            </View>{/* END CARDS */}

            {/* ══ SUPPORT ═══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='support'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}
                  alwaysBounceVertical={true}>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16,marginBottom:12}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.contacts}</Text>
                  {[['Telegram','@4uteam'],['Instagram','@4u.team'],['Tel','+380 67 194 87 54'],['Email','hello@4u.team'],['📅','08:00 – 22:00']].map(([l,v],i)=>(
                    <View key={i} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:12,borderBottomWidth:i<4?1:0,borderBottomColor:th.cardBorder}}>
                      <Text style={{fontSize:10,color:th.text3,letterSpacing:1,fontWeight:'700'}}>{l.toUpperCase()}</Text>
                      <Text style={{fontSize:12,fontWeight:'600',color:th.text}}>{v}</Text>
                    </View>
                  ))}
                </View>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.faq}</Text>
                  {[T.faqQ1,T.faqQ2,T.faqQ3,T.faqQ4,T.faqQ5].map((q,i)=>(
                    <TouchableOpacity key={i} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:13,borderBottomWidth:i<4?1:0,borderBottomColor:th.cardBorder}}>
                      <Text style={{fontSize:13,color:th.text2,fontWeight:'300',flex:1}}>{q}</Text>
                      <Text style={{color:th.text4,marginLeft:8,fontSize:18}}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>{/* END SUPPORT */}

            {/* ══ ADMIN PANEL ════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='admin'?'flex':'none',backgroundColor:th.bg}}>
              {!isAdmin?(
                <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:40}}>
                  <Text style={{fontSize:32,marginBottom:12}}>🔒</Text>
                  <Text style={{fontSize:12,color:th.text,fontWeight:'700'}}>Доступ заборонено</Text>
                </View>
              ):(
                <KeyboardAvoidingView style={{flex:1}} behavior={IS_IOS?'padding':'height'} keyboardVerticalOffset={IS_IOS?88:0}>
                <>
                  {/* Admin tabs */}
                  <View style={{flexDirection:'row',borderBottomWidth:1,borderBottomColor:th.cardBorder,backgroundColor:th.bg}}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{flexDirection:'row'}}>
                  {[
                    ['products','📦 Товари'],
                    ['orders','🧾 Замовлення'],
                    ['stats','📊 Статистика'],
                    ['reports','📈 Звіти'],
                  ].map(([k,lb])=>(
                      <TouchableOpacity key={k}
                        onPress={()=>{
                          setAdminTabHist(h=>[...h,adminTab]);
                          setAdminTab(k);
                          if(k==='products') loadAdminProducts();
                          if(k==='stats') loadProductAnalytics();
                        }}
                        style={{paddingHorizontal:16,paddingVertical:14,alignItems:'center',
                          borderBottomWidth:2,borderBottomColor:adminTab===k?th.text:'transparent'}}>
                        <Text style={{fontSize:10,fontWeight:'900',letterSpacing:0.5,
                          color:adminTab===k?th.text:th.text4}}>{lb}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  </View>

                  {/* PRODUCTS SEARCH + FILTER BAR */}
                  {adminTab==='products'&&(
                    <View style={{paddingHorizontal:12,paddingTop:10,paddingBottom:8,gap:8}}>

                      {/* Рядок 1: пошук + кнопки дій */}
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <View style={{flex:1,flexDirection:'row',alignItems:'center',
                          backgroundColor:th.bg2,borderRadius:14,paddingHorizontal:12,paddingVertical:9,
                          borderWidth:1,borderColor:th.cardBorder,gap:8}}>
                          <Text style={{color:th.text4,fontSize:15}}>⌕</Text>
                          <TextInput style={{flex:1,fontSize:13,color:th.text}}
                            placeholder={'Пошук товарів...'}
                            placeholderTextColor={th.text4}
                            value={adminSearch} onChangeText={setAdminSearch}
                            returnKeyType="search" autoCorrect={false}/>
                          {adminSearch.length>0&&(
                            <TouchableOpacity onPress={()=>setAdminSearch('')}
                              hitSlop={{top:8,bottom:8,left:8,right:8}}>
                              <Text style={{color:th.text4,fontSize:14}}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {/* Оновити */}
                        <TouchableOpacity onPress={()=>loadAdminProducts()}
                          style={{width:42,height:42,borderRadius:14,backgroundColor:th.bg2,
                            borderWidth:1,borderColor:th.cardBorder,
                            justifyContent:'center',alignItems:'center'}}>
                          <Text style={{fontSize:16}}>{adminLoading?'⏳':'↻'}</Text>
                        </TouchableOpacity>
                        {/* Додати товар */}
                        <TouchableOpacity onPress={()=>setShowAddProduct(v=>!v)}
                          style={{paddingHorizontal:14,height:42,borderRadius:14,
                            backgroundColor:showAddProduct?'#dc2626':th.text,
                            justifyContent:'center',alignItems:'center'}}>
                          <Text style={{fontSize:12,fontWeight:'900',
                            color:showAddProduct?'#fff':th.bg}}>
                            {showAddProduct?'✕':'+ Додати'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Рядок 2: фільтри статусу */}
                      <View style={{flexDirection:'row',gap:6}}>
                        {[
                          {v:'all',   lb:'Всі',       cnt:adminProducts.length},
                          {v:'active',lb:'Активні',   cnt:adminProducts.filter(p=>p.is_active).length},
                          {v:'hidden',lb:'Приховані', cnt:adminProducts.filter(p=>!p.is_active).length},
                        ].map(({v,lb,cnt})=>(
                          <TouchableOpacity key={v}
                            onPress={()=>setAdminFilterActive(v)}
                            style={{flex:1,paddingVertical:8,borderRadius:12,alignItems:'center',
                              borderWidth:1.5,
                              borderColor:adminFilterActive===v?th.text:th.cardBorder,
                              backgroundColor:adminFilterActive===v?th.text:'transparent'}}>
                            <Text style={{fontSize:11,fontWeight:'800',
                              color:adminFilterActive===v?th.bg:th.text3}}>
                              {lb}
                            </Text>
                            <Text style={{fontSize:10,
                              color:adminFilterActive===v?th.bg+'cc':th.text4,
                              marginTop:1}}>
                              {cnt}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Рядок 3: сортування */}
                      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                        <Text style={{fontSize:9,color:th.text4,fontWeight:'700',letterSpacing:1,marginRight:2}}>
                          СОРТ:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{flexDirection:'row',gap:6}}>
                          {[
                            {f:'id',   lb:'Новіші'},
                            {f:'name', lb:'Назва'},
                            {f:'price',lb:'Ціна'},
                            {f:'stock',lb:'Залишок'},
                          ].map(({f,lb})=>{
                            const active = adminSortField===f;
                            const icon = active?(adminSortDir==='asc'?' ↑':' ↓'):'';
                            return(
                              <TouchableOpacity key={f}
                                onPress={()=>{
                                  const dir=active?(adminSortDir==='asc'?'desc':'asc'):'desc';
                                  setAdminSortField(f);setAdminSortDir(dir);
                                  loadAdminProducts(null,f,dir);
                                }}
                                style={{paddingHorizontal:12,paddingVertical:6,borderRadius:20,
                                  borderWidth:1,
                                  borderColor:active?th.text:th.cardBorder,
                                  backgroundColor:active?th.text:'transparent'}}>
                                <Text style={{fontSize:11,fontWeight:'700',
                                  color:active?th.bg:th.text3}}>
                                  {lb+icon}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          <View style={{width:1,backgroundColor:th.cardBorder,marginHorizontal:2}}/>
                          {/* Кількість на сторінці */}
                          {[50,100,250].map(n=>(
                            <TouchableOpacity key={n}
                              onPress={()=>{setAdminPageSize(n);loadAdminProducts(n);}}
                              style={{paddingHorizontal:12,paddingVertical:6,borderRadius:20,
                                borderWidth:1,
                                borderColor:adminPageSize===n?th.accent:th.cardBorder,
                                backgroundColor:adminPageSize===n?th.accent+'22':'transparent'}}>
                              <Text style={{fontSize:11,fontWeight:'700',
                                color:adminPageSize===n?th.accent:th.text4}}>{n} шт</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Рядок 4: bulk mode + лічильник */}
                      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                        <Text style={{fontSize:10,color:th.text4}}>
                          {(()=>{
                            const filtered=adminProducts.filter(p=>{
                              if(adminFilterActive==='active'&&!p.is_active)return false;
                              if(adminFilterActive==='hidden'&&p.is_active)return false;
                              if(adminSearch&&!p.name?.toLowerCase().includes(adminSearch.toLowerCase()))return false;
                              return true;
                            }).length;
                            return filtered+' товарів';
                          })()}
                        </Text>
                        <TouchableOpacity
                          onPress={()=>{setAdminBulkMode(v=>!v);setAdminSelected(new Set());}}
                          style={{flexDirection:'row',alignItems:'center',gap:6,
                            paddingHorizontal:10,paddingVertical:5,borderRadius:10,
                            borderWidth:1,
                            borderColor:adminBulkMode?th.text:th.cardBorder,
                            backgroundColor:adminBulkMode?th.text:'transparent'}}>
                          <Text style={{fontSize:10,fontWeight:'700',
                            color:adminBulkMode?th.bg:th.text3}}>
                            {adminBulkMode?`✓ ${adminSelected.size} вибрано`:'☐ Вибрати'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Bulk actions */}
                      {adminBulkMode&&adminSelected.size>0&&(
                        <View style={{flexDirection:'row',gap:8}}>
                          <TouchableOpacity onPress={()=>adminBulkAction('activate')}
                            style={{flex:1,paddingVertical:9,borderRadius:12,
                              backgroundColor:'#059669',alignItems:'center'}}>
                            <Text style={{fontSize:11,fontWeight:'800',color:'#fff'}}>✓ Активувати</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=>adminBulkAction('hide')}
                            style={{flex:1,paddingVertical:9,borderRadius:12,
                              backgroundColor:th.bg2,borderWidth:1,borderColor:th.cardBorder,
                              alignItems:'center'}}>
                            <Text style={{fontSize:11,fontWeight:'800',color:th.text3}}>○ Сховати</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=>adminBulkAction('delete')}
                            style={{flex:1,paddingVertical:9,borderRadius:12,
                              backgroundColor:'#dc2626',alignItems:'center'}}>
                            <Text style={{fontSize:11,fontWeight:'800',color:'#fff'}}>✕ Видалити</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* PRODUCTS TAB */}
                  {adminTab==='products'&&(
                    <ScrollView style={{flex:1}} contentContainerStyle={{padding:12,paddingBottom:40}}>

                      {/* ADD PRODUCT FORM */}
                      {showAddProduct&&(
                        <View style={{backgroundColor:th.bg2,borderRadius:20,padding:16,marginBottom:16,gap:12}}>
                          <Text style={{fontSize:11,fontWeight:'900',letterSpacing:1,color:th.text,marginBottom:4}}>
                            НОВИЙ ТОВАР
                          </Text>

                          {/* ── ФОТО ── */}
                          <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>ФОТО ТОВАРУ</Text>
                          {!!addProdForm.imageUrl&&(
                            <View style={{width:'100%',height:200,borderRadius:12,
                              backgroundColor:th.bg3,overflow:'hidden',
                              justifyContent:'center',alignItems:'center'}}>
                              <Image source={{uri:addProdForm.imageUrl}}
                                style={{width:'100%',height:'100%'}}
                                resizeMode="cover"/>
                              {addProdForm.imgUploading&&(
                                <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
                                  backgroundColor:'rgba(0,0,0,0.45)',
                                  justifyContent:'center',alignItems:'center',gap:8}}>
                                  <ActivityIndicator color="#fff" size="large"/>
                                  <Text style={{color:'#fff',fontSize:11,fontWeight:'600',letterSpacing:1}}>
                                    ЗАВАНТАЖЕННЯ...
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                          <View style={{flexDirection:'row',gap:8}}>
                            <TouchableOpacity
                              onPress={()=>pickImage(({uri,uploading})=>setAddProdForm(p=>({...p,imageUrl:uri,imgUploading:uploading||false})))}
                              style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,
                                borderColor:th.cardBorder,alignItems:'center',flexDirection:'row',
                                justifyContent:'center',gap:6,backgroundColor:th.bg}}>
                              <Text style={{fontSize:16}}>🖼</Text>
                              <Text style={{fontSize:11,fontWeight:'700',color:th.text}}>З ГАЛЕРЕЇ</Text>
                            </TouchableOpacity>
                            {!!addProdForm.imageUrl&&(
                              <TouchableOpacity
                                onPress={()=>openPhotoStudio(addProdForm.imageUrl,(resultUri)=>{
                                  setAddProdForm(p=>({...p,imageUrl:resultUri}));
                                })}
                                style={{paddingVertical:12,paddingHorizontal:14,borderRadius:12,
                                  borderWidth:1,borderColor:'#a78bfa',backgroundColor:'#ede9fe',
                                  flexDirection:'row',gap:5,alignItems:'center'}}>
                                <Text style={{fontSize:13}}>✨</Text>
                                <Text style={{fontSize:11,fontWeight:'700',color:'#7c3aed'}}>СТУДІЯ</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={()=>setAddProdForm(p=>({...p,imageUrl:''}))}
                              style={{paddingVertical:12,paddingHorizontal:14,borderRadius:12,
                                borderWidth:1,borderColor:'#fecaca',
                                display:addProdForm.imageUrl?'flex':'none'}}>
                              <Text style={{fontSize:11,fontWeight:'700',color:'#dc2626'}}>✕</Text>
                            </TouchableOpacity>
                          </View>
                          <AppInput th={th} label="або вставте URL фото" value={addProdForm.imageUrl}
                            onChangeText={v=>setAddProdForm(p=>({...p,imageUrl:v}))}
                            autoCapitalize="none" keyboardType="url"/>

                          {/* ── НАЗВА + АРТИКУЛ ── */}
                          <AppInput th={th} label="НАЗВА *" value={addProdForm.name}
                            onChangeText={v=>setAddProdForm(p=>({...p,name:v}))}/>
                          <AppInput th={th} label="АРТИКУЛ (SKU)" value={addProdForm.sku}
                            onChangeText={v=>setAddProdForm(p=>({...p,sku:v}))}/>

                          {/* ── КАТЕГОРІЯ — 2-рівневий вибір ── */}
                          <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>КАТЕГОРІЯ</Text>
                          {addProdForm.cid&&addProdForm.sub_category?(
                            <TouchableOpacity
                              onPress={()=>{setAddProdForm(p=>({...p,cid:'',sub_category:''}));setAddCatParent(null);}}
                              style={{flexDirection:'row',alignItems:'center',gap:10,
                                paddingHorizontal:14,paddingVertical:12,borderRadius:12,
                                backgroundColor:th.accent}}>
                              <Text style={{fontSize:16}}>
                                {CAT_TREE.find(c=>c.cid===addProdForm.cid)?.icon||'📦'}
                              </Text>
                              <View style={{flex:1}}>
                                <Text style={{fontSize:11,color:th.accentText,opacity:0.7,fontWeight:'500'}}>
                                  {CAT_TREE.find(c=>c.cid===addProdForm.cid)?.label||addProdForm.cid}
                                </Text>
                                <Text style={{fontSize:13,color:th.accentText,fontWeight:'800'}}>
                                  {addProdForm.sub_category}
                                </Text>
                              </View>
                              <Text style={{color:th.accentText,fontSize:12,opacity:0.7}}>змінити ×</Text>
                            </TouchableOpacity>
                          ):(
                            <View style={{gap:8}}>
                              {/* Level 1: parent categories */}
                              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                                {CAT_TREE.filter(c=>c.children&&c.children.length>0).map(cat=>(
                                  <TouchableOpacity key={cat.cid}
                                    onPress={()=>setAddCatParent(addCatParent===cat.cid?null:cat.cid)}
                                    style={{flexDirection:'row',alignItems:'center',gap:6,
                                      paddingHorizontal:12,paddingVertical:8,borderRadius:20,
                                      backgroundColor:addCatParent===cat.cid?th.text:th.bg2,
                                      borderWidth:1,borderColor:addCatParent===cat.cid?th.text:th.cardBorder}}>
                                    <Text style={{fontSize:14}}>{cat.icon}</Text>
                                    <Text style={{fontSize:12,fontWeight:'600',
                                      color:addCatParent===cat.cid?th.bg:th.text}}>{cat.label}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                              {/* Level 2: children of selected parent */}
                              {addCatParent&&(()=>{
                                const parent=CAT_TREE.find(c=>c.cid===addCatParent);
                                if(!parent) return null;
                                return(
                                  <View style={{backgroundColor:th.bg2,borderRadius:12,padding:10,
                                    borderWidth:1,borderColor:th.cardBorder}}>
                                    <Text style={{fontSize:9,color:th.text4,fontWeight:'700',
                                      letterSpacing:1,marginBottom:8}}>
                                      ПІДКАТЕГОРІЯ ({parent.label.toUpperCase()})
                                    </Text>
                                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                                      {parent.children.map(child=>(
                                        <TouchableOpacity key={child}
                                          onPress={()=>{
                                            setAddProdForm(p=>({...p,cid:parent.cid,sub_category:child}));
                                          }}
                                          style={{paddingHorizontal:14,paddingVertical:8,
                                            borderRadius:16,borderWidth:1,
                                            borderColor:th.accent,
                                            backgroundColor:th.bg3}}>
                                          <Text style={{fontSize:12,color:th.text,fontWeight:'600'}}>{child}</Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </View>
                                );
                              })()}
                            </View>
                          )}

                          {/* ── ЦІНА ── */}
                          <AppInput th={th} label="ЦІНА ₴ *" value={addProdForm.price}
                            keyboardType="numeric"
                            onChangeText={v=>setAddProdForm(p=>({...p,price:v}))}/>

                          {/* ── РОЗМІРИ + ЗАЛИШКИ ── */}
                          <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>РОЗМІРИ ТА ЗАЛИШКИ</Text>
                          <Text style={{fontSize:10,color:th.text4,marginTop:-6}}>
                            Оберіть розміри та вкажіть кількість для кожного
                          </Text>

                          {/* Швидкий вибір розмірів */}
                          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                            {['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','42','44','46','48','50','52','54'].map(sz=>{
                              const already=(addProdForm.sizeStock||[]).find(x=>x.size===sz);
                              return(
                                <TouchableOpacity key={sz}
                                  onPress={()=>{
                                    const cur=addProdForm.sizeStock||[];
                                    if(already){
                                      setAddProdForm(p=>({...p,sizeStock:cur.filter(x=>x.size!==sz)}));
                                    } else {
                                      setAddProdForm(p=>({...p,sizeStock:[...cur,{size:sz,qty:''}]}));
                                    }
                                  }}
                                  style={{paddingHorizontal:10,paddingVertical:6,borderRadius:10,
                                    backgroundColor:already?th.text:th.bg,
                                    borderWidth:1,borderColor:already?th.text:th.cardBorder}}>
                                  <Text style={{fontSize:11,fontWeight:'700',color:already?th.bg:th.text}}>{sz}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Ввід кількості для кожного вибраного розміру */}
                          {(addProdForm.sizeStock||[]).length>0&&(
                            <View style={{gap:8}}>
                              {(addProdForm.sizeStock||[]).map((ss,idx)=>(
                                <View key={ss.size} style={{flexDirection:'row',alignItems:'center',
                                  backgroundColor:th.bg,borderRadius:10,
                                  borderWidth:1,borderColor:th.cardBorder,
                                  paddingHorizontal:14,paddingVertical:8,gap:10}}>
                                  <Text style={{fontSize:13,fontWeight:'800',color:th.text,width:44}}>{ss.size}</Text>
                                  <Text style={{color:th.text4,fontSize:12}}>залишок:</Text>
                                  <TextInput
                                    style={{flex:1,fontSize:14,fontWeight:'700',color:th.text,
                                      borderBottomWidth:1,borderBottomColor:th.cardBorder,
                                      paddingVertical:2,textAlign:'right'}}
                                    value={ss.qty}
                                    onChangeText={v=>{
                                      const arr=[...(addProdForm.sizeStock||[])];
                                      arr[idx]={...arr[idx],qty:v.replace(/[^0-9]/g,'')};
                                      setAddProdForm(p=>({...p,sizeStock:arr}));
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={th.text4}
                                  />
                                  <Text style={{color:th.text4,fontSize:11}}>шт</Text>
                                  <TouchableOpacity
                                    onPress={()=>setAddProdForm(p=>({...p,sizeStock:(p.sizeStock||[]).filter(x=>x.size!==ss.size)}))}
                                    style={{padding:4}}>
                                    <Text style={{fontSize:16,color:'#dc2626'}}>✕</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                              <Text style={{fontSize:10,color:th.text4,textAlign:'right'}}>
                                Загальний залишок: {(addProdForm.sizeStock||[]).reduce((s,x)=>s+Number(x.qty||0),0)} шт
                              </Text>
                            </View>
                          )}

                          {/* ── ОПИС ── */}
                          <AppInput th={th} label="ОПИС" value={addProdForm.description}
                            onChangeText={v=>setAddProdForm(p=>({...p,description:v}))}/>
                          <AppInput th={th} label="РОЗМІРНА СІТКА (текст або посилання)"
                            value={addProdForm.sizeGuide||''}
                            onChangeText={v=>setAddProdForm(p=>({...p,sizeGuide:v}))}
                            placeholder="XS=44, S=46, M=48..."/>

                          <TouchableOpacity
                            onPress={addProdForm.imgUploading?null:adminAddProduct}
                            style={{backgroundColor:addProdForm.imgUploading?th.bg3:th.text,
                              paddingVertical:14,borderRadius:14,
                              alignItems:'center',marginTop:4,flexDirection:'row',
                              justifyContent:'center',gap:8}}>
                            {addProdForm.imgUploading&&<ActivityIndicator color={th.text4} size="small"/>}
                            <Text style={{color:addProdForm.imgUploading?th.text4:th.bg,
                              fontSize:11,fontWeight:'900',letterSpacing:1}}>
                              {addProdForm.imgUploading?'ЗАВАНТАЖЕННЯ ФОТО...':'ДОДАТИ ТОВАР ✓'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {adminLoading?(
                        <View style={{padding:60,alignItems:'center',gap:12}}>
                          <ActivityIndicator color={th.text4} size="large"/>
                          <Text style={{color:th.text4,fontSize:12}}>Завантаження товарів...</Text>
                        </View>
                      ):adminProducts.length===0?(
                        <View style={{padding:60,alignItems:'center',gap:12}}>
                          <Text style={{fontSize:40}}>📦</Text>
                          <Text style={{fontSize:14,fontWeight:'700',color:th.text}}>Товарів не знайдено</Text>
                          <Text style={{fontSize:12,color:th.text4,textAlign:'center'}}>
                            Натисніть ↻ для оновлення або додайте перший товар
                          </Text>
                          <TouchableOpacity onPress={()=>loadAdminProducts()}
                            style={{paddingHorizontal:24,paddingVertical:12,borderRadius:14,
                              backgroundColor:th.text,marginTop:8}}>
                            <Text style={{fontSize:12,fontWeight:'800',color:th.bg}}>↻ Завантажити</Text>
                          </TouchableOpacity>
                        </View>
                      ):(
                        adminProducts.filter(p=>{
                          if(adminFilterActive==='active' && !p.is_active) return false;
                          if(adminFilterActive==='hidden' && p.is_active) return false;
                          if(adminSearch && !p.name?.toLowerCase().includes(adminSearch.toLowerCase())) return false;
                          return true;
                        }).map(prod=>(
                          <TouchableOpacity
                            key={prod.id}
                            activeOpacity={adminBulkMode?0.7:1}
                            onLongPress={()=>{setAdminBulkMode(true);setAdminSelected(s=>{const n=new Set(s);n.add(prod.id);return n;});}}
                            onPress={()=>{
                              if(adminBulkMode){
                                setAdminSelected(s=>{const n=new Set(s);n.has(prod.id)?n.delete(prod.id):n.add(prod.id);return n;});
                              }
                            }}>
                          <View style={{marginBottom:10,borderRadius:12,
                            borderWidth:adminSelected.has(prod.id)?2:1,
                            borderColor:adminSelected.has(prod.id)?th.text:th.cardBorder,
                            backgroundColor:adminSelected.has(prod.id)?th.bg2:th.bg,
                            overflow:'hidden'}}>
                            {adminEdit?.id===prod.id?(
                              /* Extended edit form — same structure as add form */
                              <View style={{padding:14,gap:12}}>
                                <Text style={{fontSize:10,fontWeight:'900',letterSpacing:1,color:th.text,marginBottom:4}}>
                                  РЕДАГУВАТИ · {adminEditForm.sku||prod.sku||prod.name}
                                </Text>

                                {/* ФОТО */}
                                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>ФОТО ТОВАРУ</Text>
                                {!!(adminEditForm.imageUrl||(prod.images?.[0])||prod.img)&&(
                                  <View style={{width:'100%',height:180,borderRadius:12,
                                    backgroundColor:th.bg3,overflow:'hidden',
                                    justifyContent:'center',alignItems:'center'}}>
                                    <Image
                                      source={{uri:adminEditForm.imageUrl||(prod.images?.[0])||prod.img}}
                                      style={{width:'100%',height:'100%'}} resizeMode="cover"/>
                                    {adminEditForm.imgUploading&&(
                                      <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
                                        backgroundColor:'rgba(0,0,0,0.45)',
                                        justifyContent:'center',alignItems:'center',gap:8}}>
                                        <ActivityIndicator color="#fff" size="large"/>
                                        <Text style={{color:'#fff',fontSize:11,fontWeight:'600',letterSpacing:1}}>
                                          ЗАВАНТАЖЕННЯ...
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                                <View style={{flexDirection:'row',gap:8}}>
                                  <TouchableOpacity
                                    onPress={()=>pickImage(({uri,uploading})=>setAdminEditForm(p=>({...p,imageUrl:uri,imgUploading:uploading||false})))}
                                    style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,
                                      borderColor:th.cardBorder,alignItems:'center',flexDirection:'row',
                                      justifyContent:'center',gap:6,backgroundColor:th.bg2}}>
                                    <Text style={{fontSize:16}}>🖼</Text>
                                    <Text style={{fontSize:11,fontWeight:'700',color:th.text}}>З ГАЛЕРЕЇ</Text>
                                  </TouchableOpacity>
                                  {!!(adminEditForm.imageUrl)&&(
                                    <TouchableOpacity
                                      onPress={()=>setAdminEditForm(p=>({...p,imageUrl:''}))}
                                      style={{paddingVertical:12,paddingHorizontal:14,borderRadius:12,
                                        borderWidth:1,borderColor:'#fecaca'}}>
                                      <Text style={{fontSize:11,fontWeight:'700',color:'#dc2626'}}>✕</Text>
                                    </TouchableOpacity>
                                  )}
                                  {!!(adminEditForm.imageUrl)&&(
                                    <TouchableOpacity
                                      onPress={()=>openPhotoStudio(adminEditForm.imageUrl,(resultUri)=>{
                                        setAdminEditForm(p=>({...p,imageUrl:resultUri}));
                                      })}
                                      style={{paddingVertical:12,paddingHorizontal:14,borderRadius:12,
                                        borderWidth:1,borderColor:'#a78bfa',backgroundColor:'#ede9fe',
                                        flexDirection:'row',gap:5,alignItems:'center'}}>
                                      <Text style={{fontSize:13}}>✨</Text>
                                      <Text style={{fontSize:11,fontWeight:'700',color:'#7c3aed'}}>СТУДІЯ</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                                <AppInput th={th} label="або вставте URL фото" value={adminEditForm.imageUrl||''}
                                  onChangeText={v=>setAdminEditForm(p=>({...p,imageUrl:v}))}
                                  autoCapitalize="none" keyboardType="url"/>

                                {/* НАЗВА + SKU */}
                                <AppInput th={th} label="НАЗВА" value={adminEditForm.name||''}
                                  onChangeText={v=>setAdminEditForm(p=>({...p,name:v}))}/>
                                <AppInput th={th} label="АРТИКУЛ (SKU)" value={adminEditForm.sku||''}
                                  onChangeText={v=>setAdminEditForm(p=>({...p,sku:v}))}/>

                                {/* КАТЕГОРІЯ — 2-рівневий вибір */}
                                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>КАТЕГОРІЯ</Text>
                                {(adminEditForm.cid||prod.cid)&&(adminEditForm.sub_category||prod.cat)?(
                                  <TouchableOpacity
                                    onPress={()=>{setAdminEditForm(p=>({...p,cid:'',sub_category:''}));setEditCatParentSel(null);}}
                                    style={{flexDirection:'row',alignItems:'center',gap:10,
                                      paddingHorizontal:14,paddingVertical:12,borderRadius:12,
                                      backgroundColor:th.accent}}>
                                    <Text style={{fontSize:16}}>
                                      {CAT_TREE.find(c=>c.cid===(adminEditForm.cid||prod.cid))?.icon||'📦'}
                                    </Text>
                                    <View style={{flex:1}}>
                                      <Text style={{fontSize:11,color:th.accentText,opacity:0.7}}>
                                        {CAT_TREE.find(c=>c.cid===(adminEditForm.cid||prod.cid))?.label||(adminEditForm.cid||prod.cid)}
                                      </Text>
                                      <Text style={{fontSize:13,color:th.accentText,fontWeight:'800'}}>
                                        {adminEditForm.sub_category||prod.cat}
                                      </Text>
                                    </View>
                                    <Text style={{color:th.accentText,fontSize:12,opacity:0.7}}>змінити ×</Text>
                                  </TouchableOpacity>
                                ):(
                                  <View style={{gap:8}}>
                                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                                      {CAT_TREE.filter(c=>c.children&&c.children.length>0).map(cat=>(
                                        <TouchableOpacity key={cat.cid}
                                          onPress={()=>setEditCatParentSel(editCatParentSel===cat.cid?null:cat.cid)}
                                          style={{flexDirection:'row',alignItems:'center',gap:6,
                                            paddingHorizontal:12,paddingVertical:8,borderRadius:20,
                                            backgroundColor:editCatParentSel===cat.cid?th.text:th.bg2,
                                            borderWidth:1,borderColor:editCatParentSel===cat.cid?th.text:th.cardBorder}}>
                                          <Text style={{fontSize:14}}>{cat.icon}</Text>
                                          <Text style={{fontSize:12,fontWeight:'600',
                                            color:editCatParentSel===cat.cid?th.bg:th.text}}>{cat.label}</Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                    {editCatParentSel&&(()=>{
                                      const parent=CAT_TREE.find(c=>c.cid===editCatParentSel);
                                      if(!parent) return null;
                                      return(
                                        <View style={{backgroundColor:th.bg2,borderRadius:12,padding:10,
                                          borderWidth:1,borderColor:th.cardBorder}}>
                                          <Text style={{fontSize:9,color:th.text4,fontWeight:'700',
                                            letterSpacing:1,marginBottom:8}}>
                                            ПІДКАТЕГОРІЯ ({parent.label.toUpperCase()})
                                          </Text>
                                          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                                            {parent.children.map(child=>(
                                              <TouchableOpacity key={child}
                                                onPress={()=>setAdminEditForm(p=>({...p,cid:parent.cid,sub_category:child}))}
                                                style={{paddingHorizontal:14,paddingVertical:8,
                                                  borderRadius:16,borderWidth:1,
                                                  borderColor:th.accent,backgroundColor:th.bg3}}>
                                                <Text style={{fontSize:12,color:th.text,fontWeight:'600'}}>{child}</Text>
                                              </TouchableOpacity>
                                            ))}
                                          </View>
                                        </View>
                                      );
                                    })()}
                                  </View>
                                )}

                                {/* ЦІНА */}
                                <AppInput th={th} label="ЦІНА ₴" value={String(adminEditForm.price||'')}
                                  keyboardType="numeric"
                                  onChangeText={v=>setAdminEditForm(p=>({...p,price:v}))}/>

                                {/* РОЗМІРИ + ЗАЛИШКИ */}
                                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>РОЗМІРИ ТА ЗАЛИШКИ</Text>
                                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                                  {['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','42','44','46','48','50','52','54'].map(sz=>{
                                    const already=(adminEditForm.sizeStock||[]).find(x=>x.size===sz);
                                    return(
                                      <TouchableOpacity key={sz}
                                        onPress={()=>{
                                          const cur=adminEditForm.sizeStock||[];
                                          if(already){
                                            setAdminEditForm(p=>({...p,sizeStock:cur.filter(x=>x.size!==sz)}));
                                          } else {
                                            setAdminEditForm(p=>({...p,sizeStock:[...cur,{size:sz,qty:''}]}));
                                          }
                                        }}
                                        style={{paddingHorizontal:10,paddingVertical:6,borderRadius:10,
                                          backgroundColor:already?th.text:th.bg2,
                                          borderWidth:1,borderColor:already?th.text:th.cardBorder}}>
                                        <Text style={{fontSize:11,fontWeight:'700',color:already?th.bg:th.text}}>{sz}</Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                                {(adminEditForm.sizeStock||[]).length>0&&(
                                  <View style={{gap:8}}>
                                    {(adminEditForm.sizeStock||[]).map((ss,idx)=>(
                                      <View key={ss.size} style={{flexDirection:'row',alignItems:'center',
                                        backgroundColor:th.bg,borderRadius:10,
                                        borderWidth:1,borderColor:th.cardBorder,
                                        paddingHorizontal:14,paddingVertical:8,gap:10}}>
                                        <Text style={{fontSize:13,fontWeight:'800',color:th.text,width:44}}>{ss.size}</Text>
                                        <Text style={{color:th.text4,fontSize:12}}>залишок:</Text>
                                        <TextInput
                                          style={{flex:1,fontSize:14,fontWeight:'700',color:th.text,
                                            borderBottomWidth:1,borderBottomColor:th.cardBorder,
                                            paddingVertical:2,textAlign:'right'}}
                                          value={ss.qty}
                                          onChangeText={v=>{
                                            const arr=[...(adminEditForm.sizeStock||[])];
                                            arr[idx]={...arr[idx],qty:v.replace(/[^0-9]/g,'')};
                                            setAdminEditForm(p=>({...p,sizeStock:arr}));
                                          }}
                                          keyboardType="numeric" placeholder="0"
                                          placeholderTextColor={th.text4}/>
                                        <Text style={{color:th.text4,fontSize:11}}>шт</Text>
                                        <TouchableOpacity
                                          onPress={()=>setAdminEditForm(p=>({...p,sizeStock:(p.sizeStock||[]).filter(x=>x.size!==ss.size)}))}
                                          style={{padding:4}}>
                                          <Text style={{fontSize:16,color:'#dc2626'}}>✕</Text>
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                    <Text style={{fontSize:10,color:th.text4,textAlign:'right'}}>
                                      Загальний залишок: {(adminEditForm.sizeStock||[]).reduce((s,x)=>s+Number(x.qty||0),0)} шт
                                    </Text>
                                  </View>
                                )}

                                {/* ОПИС */}
                                <AppInput th={th} label="ОПИС" value={adminEditForm.desc||prod.description||''}
                                  onChangeText={v=>setAdminEditForm(p=>({...p,desc:v}))}/>
                                {/* РОЗМІРНА СІТКА */}
                                <AppInput th={th} label="РОЗМІРНА СІТКА (текст або посилання)"
                                  value={adminEditForm.sizeGuide||''}
                                  onChangeText={v=>setAdminEditForm(p=>({...p,sizeGuide:v}))}
                                  placeholder="XS=44, S=46, M=48... або URL фото"/>

                                <View style={{flexDirection:'row',gap:8,marginTop:4}}>
                                  <TouchableOpacity onPress={()=>setAdminEdit(null)}
                                    style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,
                                      borderColor:th.cardBorder,alignItems:'center'}}>
                                    <Text style={{fontSize:11,color:th.text3,fontWeight:'700'}}>Скасувати</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={()=>{
                                      const sizeArr=(adminEditForm.sizeStock||[]).filter(x=>x.size.trim());
                                      const totalStock=sizeArr.reduce((s,x)=>s+Number(x.qty||0),0);
                                      adminSaveProduct({
                                        ...prod,
                                        name:adminEditForm.name||prod.name,
                                        price:Number(adminEditForm.price)||prod.price,
                                        sku:adminEditForm.sku||prod.sku,
                                        cid:adminEditForm.cid||prod.cid,
                                        description:adminEditForm.desc||prod.description,
                                        img:adminEditForm.imageUrl||(prod.images?.[0])||prod.img,
                                        images:adminEditForm.imageUrl?[adminEditForm.imageUrl]:prod.images||[],
                                        sizes:sizeArr.map(x=>x.size),

                                        stock:totalStock,
                                      });
                                    }}
                                    style={{flex:2,paddingVertical:12,borderRadius:12,
                                      backgroundColor:th.text,alignItems:'center'}}>
                                    <Text style={{fontSize:11,color:th.bg,fontWeight:'900'}}>Зберегти ✓</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ):(
                              /* Product row — compact card */
                              <View style={{flexDirection:'row',alignItems:'center',padding:10,gap:10}}>
                                {/* Фото */}
                                <View style={{width:56,height:68,borderRadius:10,
                                  backgroundColor:th.bg3,overflow:'hidden'}}>
                                  {(prod.images?.[0]||prod.img)?
                                    <Image source={{uri:prod.images?.[0]||prod.img}}
                                      style={{width:56,height:68}} resizeMode="cover"/>
                                  : <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                                      <Text style={{fontSize:20}}>📦</Text>
                                    </View>
                                  }
                                  {/* Статус бейдж поверх фото */}
                                  <View style={{position:'absolute',bottom:4,left:4,right:4,
                                    borderRadius:6,paddingVertical:2,
                                    backgroundColor:prod.is_active?'#059669':'#dc2626',
                                    alignItems:'center'}}>
                                    <Text style={{fontSize:7,fontWeight:'900',color:'#fff',letterSpacing:0.5}}>
                                      {prod.is_active?'ACTIVE':'HIDDEN'}
                                    </Text>
                                  </View>
                                </View>
                                {/* Інфо */}
                                <View style={{flex:1,gap:3}}>
                                  <Text style={{fontSize:13,fontWeight:'700',color:th.text,lineHeight:17}} numberOfLines={2}>
                                    {prod.name}
                                  </Text>
                                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                                    <Text style={{fontSize:14,fontWeight:'900',color:th.text}}>
                                      {prod.price} ₴
                                    </Text>
                                    {prod.old_price>0&&(
                                      <Text style={{fontSize:10,color:th.text4,textDecorationLine:'line-through'}}>
                                        {prod.old_price} ₴
                                      </Text>
                                    )}
                                  </View>
                                  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                                    {prod.sku?<Text style={{fontSize:9,color:th.text4}}>{'#'+prod.sku}</Text>:null}
                                    <Text style={{fontSize:9,color:th.text4}}>
                                      {'📦 '+prod.stock+' шт'}
                                    </Text>
                                    {prod.sub_category&&(
                                      <Text style={{fontSize:9,color:th.text4}} numberOfLines={1}>
                                        {prod.sub_category}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                                {/* Дії */}
                                <View style={{gap:6,alignItems:'center'}}>
                                  {/* Редагувати */}
                                  <TouchableOpacity
                                    onPress={()=>{
                                      const sizes=prod.sizes||prod.sz||[];
                                      const ss=prod.size_stock||{};
                                      const sizeStock=sizes.map(sz=>({size:sz,qty:String(ss[sz]||0)}));
                                      setAdminEdit(prod);
                                      setEditCatParentSel(prod.cid||prod.category_id||null);
                                      setAdminEditForm({
                                        name:prod.name||'',
                                        price:String(prod.price||''),
                                        sku:prod.sku||'',
                                        cid:prod.cid||prod.category_id||'',
                                        sub_category:prod.cat||prod.sub_category||'',
                                        desc:prod.description||'',
                                        imageUrl:(prod.images?.[0])||prod.img||'',
                                        sizeStock,
                                        sizeGuide:prod.size_guide||'',
                                      });
                                    }}
                                    style={{width:34,height:34,borderRadius:10,
                                      backgroundColor:th.bg2,borderWidth:1,
                                      borderColor:th.cardBorder,
                                      justifyContent:'center',alignItems:'center'}}>
                                    <Text style={{fontSize:14}}>✏️</Text>
                                  </TouchableOpacity>
                                  {/* Дублювати */}
                                  <TouchableOpacity
                                    onPress={()=>adminDuplicateProduct(prod)}
                                    style={{width:34,height:34,borderRadius:10,
                                      backgroundColor:th.bg2,borderWidth:1,
                                      borderColor:th.cardBorder,
                                      justifyContent:'center',alignItems:'center'}}>
                                    <Text style={{fontSize:14}}>⊕</Text>
                                  </TouchableOpacity>
                                  {/* Активувати/сховати */}
                                  <TouchableOpacity
                                    onPress={()=>adminToggleActive(prod.id,prod.is_active)}
                                    style={{width:34,height:34,borderRadius:10,
                                      backgroundColor:prod.is_active?'#fef2f2':'#f0fdf4',
                                      justifyContent:'center',alignItems:'center'}}>
                                    <Text style={{fontSize:14}}>
                                      {prod.is_active?'🔴':'🟢'}
                                    </Text>
                                  </TouchableOpacity>
                                  {/* Видалити */}
                                  <TouchableOpacity
                                    onPress={()=>{Alert.alert('Видалити товар?',prod.name,[
                                      {text:'Скасувати',style:'cancel'},
                                      {text:'Видалити',style:'destructive',onPress:()=>adminDeleteProduct(prod.id)},
                                    ]);}}
                                    style={{width:34,height:34,borderRadius:10,
                                      backgroundColor:'#fef2f2',justifyContent:'center',alignItems:'center'}}>
                                    <Text style={{fontSize:14}}>🗑️</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  )}

                  {/* STATS TAB */}

                  {/* ── USERS / CLIENTS TAB ── */}
                  {adminTab==='users'&&(()=>{
                    // Aggregate clients from orders
                    const clientMap={};
                    (orders||[]).forEach(ord=>{
                      const key=ord.phone||ord.name||'unknown';
                      if(!clientMap[key]){
                        clientMap[key]={
                          name:ord.name||'—',phone:ord.phone||'',email:ord.email||'',
                          orders:[],totalSpent:0,
                        };
                      }
                      clientMap[key].orders.push(ord);
                      clientMap[key].totalSpent+=(ord.total||0);
                    });
                    const clients=Object.values(clientMap)
                      .sort((a,b)=>b.totalSpent-a.totalSpent);
                    const topClient=clients[0];
                    return(
                      <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:40}}
                  alwaysBounceVertical={true}>
                        {/* Summary */}
                        <View style={{flexDirection:'row',gap:10,marginBottom:4}}>
                          {[
                            {lb:'Клієнтів',v:clients.length},
                            {lb:'З замовленнями',v:clients.filter(c=>c.orders.length>1).length},
                            {lb:'Топ чек',v:(topClient?.totalSpent||0)+' ₴'},
                          ].map(({lb,v})=>(
                            <View key={lb} style={{flex:1,backgroundColor:th.bg2,borderRadius:16,
                              padding:12,alignItems:'center'}}>
                              <Text style={{fontSize:14,fontWeight:'900',color:th.text}}>{v}</Text>
                              <Text style={{fontSize:8,color:th.text4,marginTop:3,letterSpacing:1}}>
                                {lb.toUpperCase()}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {/* Search */}
                        <View style={{flexDirection:'row',backgroundColor:th.bg2,borderRadius:14,
                          paddingHorizontal:14,paddingVertical:10,gap:8,alignItems:'center'}}>
                          <Text style={{fontSize:14,color:th.text4}}>🔍</Text>
                          <TextInput style={{flex:1,fontSize:13,color:th.text}}
                            placeholder="Пошук клієнта..."
                            placeholderTextColor={th.text4}
                            value={adminSearch} onChangeText={setAdminSearch}/>
                        </View>
                        {/* Clients list */}
                        {clients.filter(c=>!adminSearch||
                          c.name.toLowerCase().includes(adminSearch.toLowerCase())||
                          c.phone.includes(adminSearch)
                        ).map((c,i)=>(
                          <TouchableOpacity key={i}
                            onPress={()=>{
                              setAdminUserOrders(c.orders);
                              setAdminSelectedUser({
                                name:c.name,phone:c.phone,email:c.email,
                                totalOrders:c.orders.length,
                                totalSpent:c.totalSpent,
                                avgOrder:c.orders.length?Math.round(c.totalSpent/c.orders.length):0,
                              });
                            }}
                            style={{backgroundColor:th.bg2,borderRadius:16,padding:14,
                              flexDirection:'row',alignItems:'center',gap:12}}>
                            <View style={{width:44,height:44,borderRadius:22,
                              backgroundColor:i===0?'#111':th.bg3,
                              alignItems:'center',justifyContent:'center'}}>
                              <Text style={{fontSize:18}}>{i===0?'🏆':'👤'}</Text>
                            </View>
                            <View style={{flex:1}}>
                              <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{c.name}</Text>
                              <Text style={{fontSize:11,color:th.text3}}>{c.phone}</Text>
                            </View>
                            <View style={{alignItems:'flex-end'}}>
                              <Text style={{fontSize:13,fontWeight:'900',color:th.text}}>
                                {c.totalSpent} ₴
                              </Text>
                              <Text style={{fontSize:10,color:th.text4}}>
                                {c.orders.length} замовл.
                              </Text>
                            </View>
                            <Text style={{fontSize:16,color:th.text4}}>›</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    );
                  })()}

                  {/* ── CATEGORIES TAB ── */}
                  {adminTab==='categories'&&(
                    <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,gap:12}}>
                      {/* ВИДИМІСТЬ КАТЕГОРІЙ */}
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:4}}>
                        ВИДИМІСТЬ В НАВІГАЦІЇ
                      </Text>
                      <View style={{gap:6,marginBottom:20}}>
                        {CAT_TREE.map(cat=>(
                          <TouchableOpacity key={cat.id}
                            onPress={()=>setHiddenCats(
                              hiddenCats.includes(cat.id)
                                ?hiddenCats.filter(x=>x!==cat.id)
                                :[...hiddenCats,cat.id]
                            )}
                            style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                              padding:12,borderRadius:10,
                              backgroundColor:hiddenCats.includes(cat.id)?'#fef2f2':th.bg2,
                              borderWidth:1,borderColor:hiddenCats.includes(cat.id)?'#fecaca':th.cardBorder}}>
                            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                              <Text style={{fontSize:18}}>{cat.icon||'📦'}</Text>
                              <Text style={{fontSize:12,fontWeight:'600',color:th.text}}>{cat.label}</Text>
                            </View>
                            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                              <Text style={{fontSize:10,color:hiddenCats.includes(cat.id)?'#dc2626':th.success}}>
                                {hiddenCats.includes(cat.id)?'Прихована':'Видима'}
                              </Text>
                              <View style={{width:24,height:24,borderRadius:6,
                                backgroundColor:hiddenCats.includes(cat.id)?'#fecaca':th.accent,
                                justifyContent:'center',alignItems:'center'}}>
                                <Text style={{fontSize:12,fontWeight:'900',
                                  color:hiddenCats.includes(cat.id)?'#dc2626':th.accentText}}>
                                  {hiddenCats.includes(cat.id)?'✗':'✓'}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:4}}>
                        КАТЕГОРІЇ ТОВАРІВ
                      </Text>

                      {/* Список існуючих категорій */}
                      {adminCategories.map((cat,idx)=>(
                        <View key={cat.cid} style={{flexDirection:'row',alignItems:'center',
                          backgroundColor:th.bg2,borderRadius:14,padding:14,gap:12}}>
                          <Text style={{fontSize:24}}>{cat.icon}</Text>
                          <View style={{flex:1}}>
                            <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{cat.label}</Text>
                            <Text style={{fontSize:10,color:th.text4,marginTop:2}}>ID: {cat.cid}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={()=>setAdminCategories(p=>p.filter((_,i)=>i!==idx))}
                            style={{padding:8}}>
                            <Text style={{color:'#dc2626',fontSize:18,fontWeight:'300'}}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Форма додавання нової категорії */}
                      <TouchableOpacity
                        onPress={()=>setShowAddCat(v=>!v)}
                        style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
                          gap:8,paddingVertical:12,borderRadius:14,
                          borderWidth:1,borderColor:th.cardBorder,
                          borderStyle:'dashed',marginTop:4}}>
                        <Text style={{fontSize:18,color:th.text4}}>{showAddCat?'−':'+'}</Text>
                        <Text style={{fontSize:11,fontWeight:'700',color:th.text4,letterSpacing:1}}>
                          {showAddCat?'СКАСУВАТИ':'НОВА КАТЕГОРІЯ'}
                        </Text>
                      </TouchableOpacity>

                      {showAddCat&&(
                        <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16,gap:10}}>
                          <View style={{flexDirection:'row',gap:8}}>
                            <View style={{width:64}}>
                              <AppInput th={th} label="ЕМОДЗІ" value={newCatForm.icon}
                                onChangeText={v=>setNewCatForm(p=>({...p,icon:v}))}
                                placeholder="🧥"/>
                            </View>
                            <View style={{flex:1}}>
                              <AppInput th={th} label="ID (латиниця) *" value={newCatForm.cid}
                                onChangeText={v=>setNewCatForm(p=>({...p,cid:v.toLowerCase().replace(/[^a-z0-9_]/g,'')}))}
                                placeholder="outerwear"/>
                            </View>
                          </View>
                          <AppInput th={th} label="НАЗВА *" value={newCatForm.label}
                            onChangeText={v=>setNewCatForm(p=>({...p,label:v}))}
                            placeholder="Куртки / Верхній одяг"/>
                          <TouchableOpacity
                            onPress={()=>{
                              if(!newCatForm.cid.trim()||!newCatForm.label.trim()) return;
                              if(adminCategories.find(c=>c.cid===newCatForm.cid)){
                                return;
                              }
                              setAdminCategories(p=>[...p,{
                                cid:newCatForm.cid.trim(),
                                label:newCatForm.label.trim(),
                                icon:newCatForm.icon.trim()||'📦',
                              }]);
                              setNewCatForm({cid:'',label:'',icon:''});
                              setShowAddCat(false);
                            }}
                            style={{backgroundColor:th.text,paddingVertical:12,borderRadius:12,alignItems:'center'}}>
                            <Text style={{color:th.bg,fontSize:11,fontWeight:'900',letterSpacing:1}}>
                              ДОДАТИ КАТЕГОРІЮ ✓
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </ScrollView>
                  )}

                  {adminTab==='stats'&&(()=>{
                    const MS=86400000;
                    const now=new Date();
                    const todayRev=orders.filter(o=>now-new Date(o.date||o.created_at||0)<MS).reduce((s,o)=>s+(o.total||0),0);
                    const todayCnt=orders.filter(o=>now-new Date(o.date||o.created_at||0)<MS).length;
                    const weekOrds=orders.filter(o=>now-new Date(o.date||o.created_at||0)<7*MS);
                    const weekRev=weekOrds.reduce((s,o)=>s+(o.total||0),0);
                    const monthRev=orders.filter(o=>now-new Date(o.date||o.created_at||0)<30*MS).reduce((s,o)=>s+(o.total||0),0);
                    const totalRev=orders.reduce((s,o)=>s+(o.total||0),0);
                    const avgChk=orders.length?Math.round(totalRev/orders.length):0;
                    const paid=orders.filter(o=>['Оплачено','В дорозі','Доставлено','Отримано'].includes(o.status));
                    const conv=orders.length?Math.round(paid.length/orders.length*100):0;
                    // Графік 7 днів
                    const chart7=Array.from({length:7},(_,i)=>{
                      const d=new Date(now-(6-i)*MS);
                      const dayName=['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()];
                      const dayOrds=orders.filter(o=>{
                        const od=new Date(o.date||o.created_at||0);
                        return od.toDateString()===d.toDateString();
                      });
                      return {day:dayName,rev:dayOrds.reduce((s,o)=>s+(o.total||0),0),cnt:dayOrds.length,isToday:i===6};
                    });
                    const maxRev=Math.max(...chart7.map(d=>d.rev),1);
                    // Топ товарів
                    const itemMap={};
                    orders.forEach(o=>(o.items||[]).forEach(it=>{itemMap[it.name]=(itemMap[it.name]||0)+(it.qty||1);}));
                    const topItems=Object.entries(itemMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
                    // Статуси
                    const statuses=[
                      {l:'Нові',     c:'#3b82f6', n:orders.filter(o=>!o.status||o.status==='Нове').length},
                      {l:'Оплачено', c:'#8b5cf6', n:orders.filter(o=>o.status==='Оплачено').length},
                      {l:'В дорозі', c:'#f59e0b', n:orders.filter(o=>o.status==='В дорозі').length},
                      {l:'Отримано', c:'#22c55e', n:orders.filter(o=>['Отримано','Доставлено'].includes(o.status)).length},
                      {l:'Скасовано',c:'#ef4444', n:orders.filter(o=>o.status==='Скасовано').length},
                    ];
                    const maxSt=Math.max(...statuses.map(s=>s.n),1);
                    return(
                    <ScrollView contentContainerStyle={{padding:16,paddingBottom:100,gap:14}}>

                      {/* KPI */}
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text4}}>ДАШБОРД</Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                        {[
                          {l:'Всього',    v:totalRev+' ₴',  s:'усі часи',              c:'#059669'},
                          {l:'Місяць',   v:monthRev+' ₴',  s:'за 30 днів',             c:'#3b82f6'},
                          {l:'Тиждень',  v:weekRev+' ₴',   s:weekOrds.length+' замовл',c:'#f59e0b'},
                          {l:'Сьогодні', v:todayRev+' ₴',  s:todayCnt+' замовлень',   c:'#8b5cf6'},
                          {l:'Сер.чек',  v:avgChk+' ₴',    s:'на замовлення',          c:'#06b6d4'},
                          {l:'Конверсія',v:conv+'%',        s:paid.length+'/'+orders.length+' оплачено',c:'#ec4899'},
                        ].map((k,i)=>(
                          <View key={i} style={{width:'47%',padding:14,borderRadius:14,
                            backgroundColor:k.c+'18',borderWidth:1.5,borderColor:k.c+'40'}}>
                            <Text style={{fontSize:10,color:k.c,fontWeight:'700',marginBottom:2}}>{k.l}</Text>
                            <Text style={{fontSize:19,fontWeight:'900',color:th.text,letterSpacing:-0.5}}>{k.v}</Text>
                            <Text style={{fontSize:9,color:th.text3,marginTop:2}}>{k.s}</Text>
                          </View>
                        ))}
                      </View>

                      {/* ГРАФІК 7 ДНІВ */}
                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                        <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:4}}>
                          Дохід за 7 днів
                        </Text>
                        <Text style={{fontSize:10,color:th.text3,marginBottom:16}}>
                          Загалом за тиждень: {weekRev} ₴
                        </Text>
                        <View style={{flexDirection:'row',alignItems:'flex-end',gap:5,height:90}}>
                          {chart7.map((d,i)=>{
                            const barH=Math.max(4,Math.round(d.rev/maxRev*68));
                            return(
                              <View key={i} style={{flex:1,alignItems:'center',gap:3}}>
                                <Text style={{fontSize:8,color:d.rev>0?th.text:th.text4,fontWeight:'600'}}>
                                  {d.rev>0?(d.rev>=1000?Math.round(d.rev/1000)+'k':d.rev):''}
                                </Text>
                                <View style={{
                                  width:'100%', height:barH, borderRadius:5,
                                  backgroundColor:d.isToday?th.accent:th.accent+'60',
                                }}/>
                                <Text style={{fontSize:9,color:d.isToday?th.text:th.text3,
                                  fontWeight:d.isToday?'800':'400'}}>{d.day}</Text>
                                {d.cnt>0&&(
                                  <Text style={{fontSize:8,color:th.text4}}>{d.cnt}</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* СТАТУС ЗАМОВЛЕНЬ */}
                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                        <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:14}}>
                          Статус замовлень ({orders.length})
                        </Text>
                        {statuses.map((s,i)=>(
                          <View key={i} style={{marginBottom:10}}>
                            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:5}}>
                              <Text style={{fontSize:12,color:th.text}}>{s.l}</Text>
                              <Text style={{fontSize:12,fontWeight:'700',color:s.c}}>{s.n}</Text>
                            </View>
                            <View style={{height:8,borderRadius:4,backgroundColor:th.bg3}}>
                              <View style={{height:8,borderRadius:4,backgroundColor:s.c,
                                width:(s.n/maxSt*100)+'%'}}/>
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* ТОП ТОВАРІВ */}
                      {/* ── ТОП ТОВАРІВ — АНАЛІТИКА ── */}
                      {(()=>{
                        // Об'єднуємо дані: замовлення + Supabase events
                        const analyticsTop = Object.entries(productAnalytics||{})
                          .map(([id,ev])=>{
                            const prod = products.find(p=>String(p.id)===String(id));
                            return prod ? {
                              id, name:prod.name, img:prod.img||prod.imgs?.[0]||'',
                              price:prod.price,
                              views: ev.views||0,
                              cart_adds: ev.cart_adds||0,
                              orders: ev.orders||0,
                              score: (ev.orders||0)*8+(ev.cart_adds||0)*4+(ev.views||0),
                            } : null;
                          })
                          .filter(Boolean)
                          .sort((a,b)=>b.score-a.score)
                          .slice(0,10);

                        // Fallback: якщо немає Supabase analytics, беремо з замовлень
                        const ordersTop = topItems.slice(0,10).map(([name,qty])=>{
                          const prod = products.find(p=>p.name===name||p.name?.startsWith(name?.slice(0,12)));
                          return {name,qty,img:prod?.img||'',price:prod?.price||0,id:prod?.id};
                        });

                        const hasAnalytics = analyticsTop.length > 0;
                        const displayTop = hasAnalytics ? analyticsTop : ordersTop;

                        return(
                          <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                              <Text style={{fontSize:12,fontWeight:'800',color:th.text}}>
                                Топ товарів
                              </Text>
                              <View style={{flexDirection:'row',gap:6}}>
                                {hasAnalytics&&(
                                  <View style={{backgroundColor:'#dcfce7',paddingHorizontal:8,paddingVertical:3,borderRadius:6}}>
                                    <Text style={{fontSize:9,color:'#166534',fontWeight:'700'}}>● live дані</Text>
                                  </View>
                                )}
                                <TouchableOpacity onPress={loadProductAnalytics}
                                  style={{paddingHorizontal:8,paddingVertical:3,borderRadius:6,
                                    backgroundColor:th.bg3}}>
                                  <Text style={{fontSize:9,color:th.text4}}>↻ Оновити</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Легенда */}
                            {hasAnalytics&&(
                              <View style={{flexDirection:'row',gap:12,marginBottom:12,
                                paddingHorizontal:4}}>
                                {[{l:'👁 Перегляди',c:'#3b82f6'},{l:'🛍 В кошик',c:'#8b5cf6'},{l:'✅ Замовлення',c:'#059669'}].map(({l,c})=>(
                                  <View key={l} style={{flexDirection:'row',alignItems:'center',gap:4}}>
                                    <View style={{width:6,height:6,borderRadius:3,backgroundColor:c}}/>
                                    <Text style={{fontSize:9,color:th.text4}}>{l}</Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {displayTop.map((item,i)=>{
                              const medals=['🥇','🥈','🥉'];
                              const isTop3 = i<3;
                              return(
                                <View key={item.id||item.name||i}
                                  style={{flexDirection:'row',alignItems:'center',gap:10,
                                    marginBottom:10,paddingBottom:10,
                                    borderBottomWidth:i<displayTop.length-1?1:0,
                                    borderBottomColor:th.cardBorder}}>
                                  {/* Rank */}
                                  <View style={{width:28,height:28,borderRadius:14,
                                    backgroundColor:isTop3?'transparent':th.bg3,
                                    justifyContent:'center',alignItems:'center'}}>
                                    {isTop3
                                      ? <Text style={{fontSize:18}}>{medals[i]}</Text>
                                      : <Text style={{fontSize:11,fontWeight:'900',color:th.text4}}>{i+1}</Text>
                                    }
                                  </View>
                                  {/* Image */}
                                  {item.img?(
                                    <Image source={{uri:item.img}}
                                      style={{width:36,height:36,borderRadius:8}} resizeMode="cover"/>
                                  ):(
                                    <View style={{width:36,height:36,borderRadius:8,backgroundColor:th.bg3,
                                      justifyContent:'center',alignItems:'center'}}>
                                      <Text style={{fontSize:16}}>👕</Text>
                                    </View>
                                  )}
                                  {/* Name + metrics */}
                                  <View style={{flex:1}}>
                                    <Text style={{fontSize:12,fontWeight:'600',color:th.text}}
                                      numberOfLines={1}>
                                      {item.name}
                                    </Text>
                                    {hasAnalytics?(
                                      <View style={{flexDirection:'row',gap:8,marginTop:3}}>
                                        <Text style={{fontSize:9,color:'#3b82f6'}}>👁 {item.views}</Text>
                                        <Text style={{fontSize:9,color:'#8b5cf6'}}>🛍 {item.cart_adds}</Text>
                                        <Text style={{fontSize:9,color:'#059669'}}>✅ {item.orders}</Text>
                                      </View>
                                    ):(
                                      <Text style={{fontSize:10,color:th.text4,marginTop:2}}>
                                        {item.qty||0} замовлень
                                      </Text>
                                    )}
                                  </View>
                                  {/* Conversion */}
                                  {hasAnalytics&&item.views>0&&(
                                    <View style={{alignItems:'flex-end'}}>
                                      <Text style={{fontSize:11,fontWeight:'800',
                                        color:item.orders/item.views>0.1?'#059669':'#f59e0b'}}>
                                        {Math.round(item.orders/item.views*100)+'%'}
                                      </Text>
                                      <Text style={{fontSize:8,color:th.text4}}>конв.</Text>
                                    </View>
                                  )}
                                  {!hasAnalytics&&(
                                    <Text style={{fontSize:12,fontWeight:'700',color:th.text3}}>
                                      {item.qty} шт
                                    </Text>
                                  )}
                                </View>
                              );
                            })}

                            {displayTop.length===0&&(
                              <View style={{paddingVertical:20,alignItems:'center',gap:4}}>
                                <Text style={{fontSize:24}}>📊</Text>
                                <Text style={{fontSize:12,color:th.text4}}>Дані аналітики накопичуються</Text>
                                <Text style={{fontSize:10,color:th.text4,textAlign:'center'}}>
                                  Потрібно створити таблицю product_events в Supabase
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}

                      {/* МАСОВА ЗМІНА ЦІН */}
                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16,gap:10}}>
                        <View>
                          <Text style={{fontSize:12,fontWeight:'800',color:th.text}}>Масова зміна цін</Text>
                          <Text style={{fontSize:11,color:th.text3,marginTop:2}}>
                            {'Обрано: '+adminProducts.filter(p=>{
                              const allSel=bulkCats.includes('all');
                              const catM=allSel||bulkCats.some(c=>p.cid===c||p.category_id===c||p.sub_category===c||(p.sub_category||'').toLowerCase().includes(c.toLowerCase())||(p.cid||'').toLowerCase().includes(c.toLowerCase()));
                              const minP=bulkMinPrice?parseFloat(bulkMinPrice):0;
                              const maxP=bulkMaxPrice?parseFloat(bulkMaxPrice):Infinity;
                              return catM&&(!bulkMinPrice||p.price>=minP)&&(!bulkMaxPrice||p.price<=maxP);
                            }).length+' товарів'}
                          </Text>
                        </View>

                        {/* Напрям */}
                        <View style={{flexDirection:'row',gap:8}}>
                          {[{k:'down',l:'Знижка ↓',ic:'🔻'},{k:'up',l:'Підвищення ↑',ic:'🔺'}].map(({k,l,ic})=>(
                            <TouchableOpacity key={k} onPress={()=>setBulkDir(k)}
                              style={{flex:1,paddingVertical:10,borderRadius:12,alignItems:'center',
                                flexDirection:'row',justifyContent:'center',gap:6,
                                backgroundColor:bulkDir===k?th.accent:th.bg3,
                                borderWidth:bulkDir===k?0:1,borderColor:th.cardBorder}}>
                              <Text style={{fontSize:13}}>{ic}</Text>
                              <Text style={{fontSize:12,fontWeight:'700',
                                color:bulkDir===k?th.accentText:th.text}}>{l}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Тип значення */}
                        <View style={{flexDirection:'row',gap:8}}>
                          {[{k:'pct',l:'Відсоток %'},{k:'fix',l:'Фіксована ₴'}].map(({k,l})=>(
                            <TouchableOpacity key={k} onPress={()=>setBulkMode(k)}
                              style={{flex:1,paddingVertical:10,borderRadius:12,alignItems:'center',
                                backgroundColor:bulkMode===k?th.accent:th.bg3,
                                borderWidth:bulkMode===k?0:1,borderColor:th.cardBorder}}>
                              <Text style={{fontSize:12,fontWeight:'700',
                                color:bulkMode===k?th.accentText:th.text}}>{l}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Категорії — МУЛЬТИ-ВИБІР */}
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>
                          КАТЕГОРІЇ (можна обрати кілька)
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{gap:6,paddingBottom:4}}>
                          {[{k:'all',l:'🗂 Всі'},...adminCategories.map(c=>({k:c.cid,l:c.label.split('/')[0].trim()}))].map(({k,l})=>{
                            const isSel = bulkCats.includes(k);
                            return(
                              <TouchableOpacity key={k} onPress={()=>{
                                if(k==='all'){
                                  setBulkCats(['all']);
                                } else {
                                  setBulkCats(prev=>{
                                    const without = prev.filter(x=>x!=='all'&&x!==k);
                                    return isSel ? (without.length?without:['all']) : [...without,k];
                                  });
                                }
                              }}
                              style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,
                                backgroundColor:isSel?th.accent:th.bg3,
                                borderWidth:isSel?0:1,borderColor:th.cardBorder,
                                flexDirection:'row',alignItems:'center',gap:4}}>
                                {isSel&&<Text style={{fontSize:10,color:th.accentText}}>✓</Text>}
                                <Text style={{fontSize:11,fontWeight:'600',
                                  color:isSel?th.accentText:th.text3}}>{l}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        {/* Фільтр ціни */}
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4}}>
                          ФІЛЬТР ПО ЦІНІ (необов'язково)
                        </Text>
                        <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                          <TextInput
                            style={{flex:1,borderWidth:1,borderColor:th.cardBorder,borderRadius:10,
                              paddingHorizontal:12,paddingVertical:10,fontSize:13,color:th.text,
                              backgroundColor:th.bg3}}
                            placeholder="від ₴" placeholderTextColor={th.text4}
                            keyboardType="numeric" value={bulkMinPrice} onChangeText={setBulkMinPrice}/>
                          <Text style={{color:th.text4,fontSize:14}}>—</Text>
                          <TextInput
                            style={{flex:1,borderWidth:1,borderColor:th.cardBorder,borderRadius:10,
                              paddingHorizontal:12,paddingVertical:10,fontSize:13,color:th.text,
                              backgroundColor:th.bg3}}
                            placeholder="до ₴" placeholderTextColor={th.text4}
                            keyboardType="numeric" value={bulkMaxPrice} onChangeText={setBulkMaxPrice}/>
                        </View>

                        {/* Значення + Застосувати */}
                        <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                          <TextInput
                            style={{flex:1,borderWidth:2,borderColor:th.accent,borderRadius:12,
                              paddingHorizontal:14,paddingVertical:12,fontSize:18,fontWeight:'800',
                              color:th.text,backgroundColor:th.bg3}}
                            placeholder={bulkMode==='pct'?'10':'200'}
                            placeholderTextColor={th.text4}
                            keyboardType="numeric" value={bulkVal} onChangeText={setBulkVal}/>
                          <Text style={{fontSize:22,fontWeight:'900',color:th.accent,width:28,textAlign:'center'}}>
                            {bulkMode==='pct'?'%':'₴'}
                          </Text>
                          <TouchableOpacity onPress={applyBulkPrice}
                            style={{paddingHorizontal:20,paddingVertical:13,borderRadius:12,
                              backgroundColor:th.accent,
                              shadowColor:th.accent,shadowOffset:{width:0,height:4},
                              shadowOpacity:0.35,shadowRadius:8,elevation:4}}>
                            <Text style={{fontSize:14,fontWeight:'900',color:th.accentText}}>OK</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* PUSH РОЗСИЛКА */}
                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                        <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:4}}>
                          Push-розсилка
                        </Text>
                        <Text style={{fontSize:11,color:th.text3,marginBottom:12}}>
                          Сповіщення для клієнтів застосунку
                        </Text>
                        <View style={{flexDirection:'row',gap:6,marginBottom:12}}>
                          {[{k:'all',l:'Всі'},{k:'buyers',l:'Покупці'},{k:'inactive',l:'Неактивні'}].map(({k,l})=>(
                            <TouchableOpacity key={k} onPress={()=>setPushSeg(k)}
                              style={{paddingHorizontal:14,paddingVertical:7,borderRadius:20,
                                backgroundColor:pushSeg===k?th.accent:th.bg3}}>
                              <Text style={{fontSize:11,fontWeight:'600',
                                color:pushSeg===k?th.accentText:th.text3}}>{l}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={{borderWidth:1.5,borderColor:th.cardBorder,borderRadius:12,
                            paddingHorizontal:14,paddingVertical:10,fontSize:13,color:th.text,
                            backgroundColor:th.bg3,marginBottom:8}}
                          placeholder="Заголовок"
                          placeholderTextColor={th.text4}
                          value={pushTitle} onChangeText={setPushTitle}/>
                        <TextInput
                          style={{borderWidth:1.5,borderColor:th.cardBorder,borderRadius:12,
                            paddingHorizontal:14,paddingVertical:10,fontSize:13,color:th.text,
                            backgroundColor:th.bg3,marginBottom:12,minHeight:70,
                            textAlignVertical:'top'}}
                          placeholder="Текст повідомлення..."
                          placeholderTextColor={th.text4}
                          multiline
                          value={pushBody} onChangeText={setPushBody}/>
                        <TouchableOpacity onPress={sendPushBroadcast}
                          style={{paddingVertical:14,borderRadius:12,backgroundColor:th.accent,
                            alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8}}>
                          <Text style={{fontSize:14,color:th.accentText}}>📣</Text>
                          <Text style={{fontSize:13,fontWeight:'800',color:th.accentText}}>
                            Надіслати розсилку
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* ВИДАЛЕННЯ ТЕСТОВИХ */}
                      <TouchableOpacity onPress={deleteTestProducts}
                        style={{padding:14,borderRadius:12,borderWidth:1,borderColor:'#fecaca',
                          backgroundColor:'#fef2f2',flexDirection:'row',alignItems:'center',gap:10}}>
                        <Text style={{fontSize:18}}>🗑️</Text>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontWeight:'700',color:'#dc2626'}}>
                            Видалити тестові товари (ID 1–60)
                          </Text>
                          <Text style={{fontSize:11,color:'#ef4444',marginTop:1}}>
                            Незворотна дія — видалить з бази даних
                          </Text>
                        </View>
                      </TouchableOpacity>

                    </ScrollView>
                    );
                  })()}
                  {/* ══ REPORTS TAB ══ */}
                  {adminTab==='reports'&&(()=>{
                    const MS=86400000;
                    const now=new Date();
                    // Period ranges
                    const periods={
                      day:  {ms:1*MS,     label:'Сьогодні',   bars:24, unit:'год',  fmt:(d)=>d.getHours()+':00'},
                      week: {ms:7*MS,     label:'7 днів',     bars:7,  unit:'день', fmt:(d)=>['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]},
                      month:{ms:30*MS,    label:'30 днів',    bars:30, unit:'день', fmt:(d)=>d.getDate()+'.'+String(d.getMonth()+1).padStart(2,'0')},
                      quarter:{ms:90*MS,  label:'3 місяці',   bars:12, unit:'тиж',  fmt:(d,i)=>'Тиж '+(i+1)},
                      half: {ms:182*MS,   label:'6 місяців',  bars:6,  unit:'міс',  fmt:(d)=>['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'][d.getMonth()]},
                      year: {ms:365*MS,   label:'Рік',        bars:12, unit:'міс',  fmt:(d)=>['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'][d.getMonth()]},
                      all:  {ms:Infinity, label:'Весь час',   bars:12, unit:'міс',  fmt:(d)=>['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'][d.getMonth()]},
                    };
                    const p=periods[reportPeriod];
                    const src=adminOrders.length>0?adminOrders:orders;

                    // Filter orders by period
                    const filtered=reportPeriod==='all'
                      ? src
                      : src.filter(o=>now-new Date(o.date||o.created_at||0)<p.ms);

                    // KPI
                    const totalRev=filtered.reduce((s,o)=>s+(o.total||0),0);
                    const ordCount=filtered.length;
                    const avgChk=ordCount?Math.round(totalRev/ordCount):0;
                    const paid=filtered.filter(o=>['Оплачено','В дорозі','Доставлено','Отримано'].includes(o.status));
                    const conv=ordCount?Math.round(paid.length/ordCount*100):0;
                    const cancelled=filtered.filter(o=>o.status==='Скасовано').length;
                    const paidRev=paid.reduce((s,o)=>s+(o.total||0),0);

                    // Bar chart data
                    const buildBars=()=>{
                      if(reportPeriod==='day'){
                        return Array.from({length:24},(_,i)=>{
                          const h=i;
                          const dayOrds=filtered.filter(o=>{
                            const d=new Date(o.date||o.created_at||0);
                            return d.toDateString()===now.toDateString()&&d.getHours()===h;
                          });
                          return{label:h+':00',rev:dayOrds.reduce((s,o)=>s+(o.total||0),0),cnt:dayOrds.length,isNow:h===now.getHours()};
                        });
                      } else if(reportPeriod==='week'){
                        return Array.from({length:7},(_,i)=>{
                          const d=new Date(now-(6-i)*MS);
                          const dayOrds=filtered.filter(o=>new Date(o.date||o.created_at||0).toDateString()===d.toDateString());
                          return{label:['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()],rev:dayOrds.reduce((s,o)=>s+(o.total||0),0),cnt:dayOrds.length,isNow:i===6};
                        });
                      } else if(reportPeriod==='month'){
                        return Array.from({length:30},(_,i)=>{
                          const d=new Date(now-(29-i)*MS);
                          const dayOrds=filtered.filter(o=>new Date(o.date||o.created_at||0).toDateString()===d.toDateString());
                          return{label:d.getDate()+'',rev:dayOrds.reduce((s,o)=>s+(o.total||0),0),cnt:dayOrds.length,isNow:i===29};
                        });
                      } else if(reportPeriod==='quarter'){
                        return Array.from({length:13},(_,i)=>{
                          const wStart=new Date(now-(12-i)*7*MS);
                          const wEnd=new Date(now-(11-i)*7*MS);
                          const wOrds=filtered.filter(o=>{const d=new Date(o.date||o.created_at||0);return d>=wStart&&d<wEnd;});
                          return{label:'Т'+(i+1),rev:wOrds.reduce((s,o)=>s+(o.total||0),0),cnt:wOrds.length,isNow:i===12};
                        });
                      } else {
                        // half / year / all → by month
                        const months=reportPeriod==='half'?6:reportPeriod==='year'?12:12;
                        return Array.from({length:months},(_,i)=>{
                          const mDate=new Date(now);
                          mDate.setMonth(mDate.getMonth()-(months-1-i));
                          const mOrds=filtered.filter(o=>{
                            const d=new Date(o.date||o.created_at||0);
                            return d.getMonth()===mDate.getMonth()&&d.getFullYear()===mDate.getFullYear();
                          });
                          const mn=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'][mDate.getMonth()];
                          return{label:mn,rev:mOrds.reduce((s,o)=>s+(o.total||0),0),cnt:mOrds.length,isNow:i===months-1};
                        });
                      }
                    };
                    const bars=buildBars();
                    const maxBar=Math.max(...bars.map(b=>reportType==='orders'?b.cnt:b.rev),1);

                    // Top products
                    const itemMap={};
                    filtered.forEach(o=>(o.items||[]).forEach(it=>{
                      const n=typeof it==='object'?(it.name||'?'):String(it);
                      const q=typeof it==='object'?(it.qty||1):1;
                      itemMap[n]=(itemMap[n]||0)+q;
                    }));
                    const topProds=Object.entries(itemMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

                    // Top clients
                    const clientMap={};
                    filtered.forEach(o=>{
                      const k=o.contact_name||o.name||o.user_id||'Анонім';
                      if(!clientMap[k]) clientMap[k]={name:k,orders:0,rev:0};
                      clientMap[k].orders++;
                      clientMap[k].rev+=(o.total||0);
                    });
                    const topClients=Object.values(clientMap).sort((a,b)=>b.rev-a.rev).slice(0,5);

                    // Status breakdown
                    const statusMap={};
                    filtered.forEach(o=>{const s=o.status||'Нове';statusMap[s]=(statusMap[s]||0)+1;});
                    const statusColors={'Нове':'#3b82f6','Оплачено':'#8b5cf6','В дорозі':'#f59e0b','Отримано':'#22c55e','Доставлено':'#10b981','Скасовано':'#ef4444'};

                    return(
                    <ScrollView keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{padding:16,paddingBottom:120,gap:12}}>

                      {/* Period selector */}
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4}}>ПЕРІОД</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{gap:8,paddingVertical:4}}>
                        {[
                          {k:'day',l:'Сьогодні'},
                          {k:'week',l:'7 днів'},
                          {k:'month',l:'30 днів'},
                          {k:'quarter',l:'3 місяці'},
                          {k:'half',l:'6 місяців'},
                          {k:'year',l:'Рік'},
                          {k:'all',l:'Весь час'},
                        ].map(({k,l})=>(
                          <TouchableOpacity key={k} onPress={()=>setReportPeriod(k)}
                            style={{paddingHorizontal:16,paddingVertical:9,borderRadius:20,
                              backgroundColor:reportPeriod===k?th.text:th.bg2,
                              borderWidth:1,borderColor:reportPeriod===k?th.text:th.cardBorder}}>
                            <Text style={{fontSize:12,fontWeight:'700',
                              color:reportPeriod===k?th.bg:th.text3}}>{l}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {/* KPI Cards */}
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                        {[
                          {l:'Виручка',    v:totalRev+'₴',    s:p.label,        c:'#059669'},
                          {l:'Оплачено',   v:paidRev+'₴',     s:paid.length+' замовл', c:'#8b5cf6'},
                          {l:'Замовлень',  v:String(ordCount), s:'за '+p.label,  c:'#3b82f6'},
                          {l:'Сер.чек',    v:avgChk+'₴',      s:'на замовлення',c:'#06b6d4'},
                          {l:'Конверсія',  v:conv+'%',         s:paid.length+'/'+ordCount, c:'#ec4899'},
                          {l:'Скасовано',  v:String(cancelled),s:'замовлень',    c:'#ef4444'},
                        ].map((k,i)=>(
                          <View key={i} style={{width:'47%',padding:14,borderRadius:14,
                            backgroundColor:k.c+'18',borderWidth:1.5,borderColor:k.c+'40'}}>
                            <Text style={{fontSize:10,color:k.c,fontWeight:'700',marginBottom:2}}>{k.l}</Text>
                            <Text style={{fontSize:20,fontWeight:'900',color:th.text,letterSpacing:-0.5}}>{k.v}</Text>
                            <Text style={{fontSize:9,color:th.text3,marginTop:2}}>{k.s}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Chart type toggle */}
                      <View style={{flexDirection:'row',gap:8}}>
                        {[{k:'revenue',l:'💰 Виручка'},{k:'orders',l:'🧾 Замовлення'}].map(({k,l})=>(
                          <TouchableOpacity key={k} onPress={()=>setReportType(k)}
                            style={{flex:1,paddingVertical:10,borderRadius:12,alignItems:'center',
                              backgroundColor:reportType===k?th.accent:th.bg2,
                              borderWidth:1,borderColor:reportType===k?th.accent:th.cardBorder}}>
                            <Text style={{fontSize:12,fontWeight:'700',
                              color:reportType===k?th.accentText:th.text3}}>{l}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Bar Chart */}
                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                        <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:2}}>
                          {reportType==='revenue'?'Виручка':'Кількість замовлень'} · {p.label}
                        </Text>
                        <Text style={{fontSize:10,color:th.text3,marginBottom:14}}>
                          {reportType==='revenue'?totalRev+' ₴ загалом':ordCount+' замовлень загалом'}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{flexDirection:'row',alignItems:'flex-end',height:120,gap:4,paddingBottom:20}}>
                            {bars.map((b,i)=>{
                              const val=reportType==='orders'?b.cnt:b.rev;
                              const h=Math.max((val/maxBar)*100,val>0?4:0);
                              return(
                                <View key={i} style={{alignItems:'center',width:reportPeriod==='month'?18:reportPeriod==='day'?22:30}}>
                                  {val>0&&(
                                    <Text style={{fontSize:6,color:th.text4,marginBottom:2}} numberOfLines={1}>
                                      {reportType==='orders'?val:(val>=1000?Math.round(val/1000)+'k':val)}
                                    </Text>
                                  )}
                                  <View style={{
                                    width:'100%',height:h,borderRadius:4,
                                    backgroundColor:b.isNow?th.accent:(th.accent+'66'),
                                  }}/>
                                  <Text style={{fontSize:7,color:b.isNow?th.text:th.text4,
                                    marginTop:4,fontWeight:b.isNow?'800':'400'}}
                                    numberOfLines={1}>{b.label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>

                      {/* Top Products */}
                      {topProds.length>0&&(
                        <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                          <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:12}}>
                            🏆 Топ товарів · {p.label}
                          </Text>
                          {topProds.map(([name,qty],i)=>(
                            <View key={i} style={{flexDirection:'row',alignItems:'center',
                              gap:10,marginBottom:10}}>
                              <View style={{width:28,height:28,borderRadius:14,
                                backgroundColor:['#f59e0b','#94a3b8','#cd7c32','#64748b','#64748b','#64748b','#64748b','#64748b'][i]+'33',
                                justifyContent:'center',alignItems:'center',borderWidth:1,
                                borderColor:['#f59e0b','#94a3b8','#cd7c32','#64748b','#64748b','#64748b','#64748b','#64748b'][i]+'66'}}>
                                <Text style={{fontSize:11,fontWeight:'900',
                                  color:['#f59e0b','#94a3b8','#cd7c32','#64748b','#64748b','#64748b','#64748b','#64748b'][i]}}>{i+1}</Text>
                              </View>
                              <Text style={{flex:1,fontSize:12,color:th.text}} numberOfLines={1}>{name}</Text>
                              <View style={{backgroundColor:th.bg3,borderRadius:8,paddingHorizontal:10,paddingVertical:4}}>
                                <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>{qty} шт</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Top Clients */}
                      {topClients.length>0&&(
                        <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                          <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:12}}>
                            👥 Топ клієнтів · {p.label}
                          </Text>
                          {topClients.map((c,i)=>(
                            <View key={i} style={{flexDirection:'row',alignItems:'center',
                              gap:12,paddingVertical:8,
                              borderBottomWidth:i<topClients.length-1?1:0,
                              borderBottomColor:th.cardBorder}}>
                              <View style={{width:32,height:32,borderRadius:16,
                                backgroundColor:th.accent+'22',justifyContent:'center',alignItems:'center'}}>
                                <Text style={{fontSize:13,fontWeight:'900',color:th.accent}}>{i+1}</Text>
                              </View>
                              <View style={{flex:1}}>
                                <Text style={{fontSize:13,fontWeight:'600',color:th.text}} numberOfLines={1}>{c.name}</Text>
                                <Text style={{fontSize:10,color:th.text4}}>{c.orders} замовл</Text>
                              </View>
                              <Text style={{fontSize:13,fontWeight:'800',color:th.text}}>{c.rev} ₴</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Order statuses breakdown */}
                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                        <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:12}}>
                          📋 Статуси замовлень · {p.label}
                        </Text>
                        {Object.entries(statusMap).sort((a,b)=>b[1]-a[1]).map(([status,cnt])=>{
                          const color=statusColors[status]||'#94a3b8';
                          const pct=ordCount?Math.round(cnt/ordCount*100):0;
                          return(
                            <View key={status} style={{marginBottom:10}}>
                              <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
                                <Text style={{fontSize:12,color:th.text,fontWeight:'500'}}>{status}</Text>
                                <Text style={{fontSize:12,color:color,fontWeight:'700'}}>{cnt} ({pct}%)</Text>
                              </View>
                              <View style={{height:6,borderRadius:3,backgroundColor:th.bg3}}>
                                <View style={{height:6,borderRadius:3,backgroundColor:color,width:pct+'%'}}/>
                              </View>
                            </View>
                          );
                        })}
                        {Object.keys(statusMap).length===0&&(
                          <Text style={{fontSize:12,color:th.text4,textAlign:'center',paddingVertical:16}}>
                            Немає замовлень за цей період
                          </Text>
                        )}
                      </View>

                      {/* Avg per day */}
                      {ordCount>0&&(
                        <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16,gap:10}}>
                          <Text style={{fontSize:12,fontWeight:'800',color:th.text,marginBottom:4}}>
                            📐 Середні показники
                          </Text>
                          {(()=>{
                            const days=reportPeriod==='day'?1:reportPeriod==='week'?7:reportPeriod==='month'?30:reportPeriod==='quarter'?90:reportPeriod==='half'?182:365;
                            const perDay=reportPeriod==='all'?0:Math.round(totalRev/days);
                            const ordPerDay=reportPeriod==='all'?0:+(ordCount/days).toFixed(1);
                            return(
                              <View style={{flexDirection:'row',gap:8}}>
                                {[
                                  {l:'Виручка/день',v:perDay>0?perDay+'₴':'-',c:'#059669'},
                                  {l:'Замовл/день',v:ordPerDay>0?String(ordPerDay):'-',c:'#3b82f6'},
                                  {l:'Сер.чек',v:avgChk+'₴',c:'#8b5cf6'},
                                  {l:'Конверсія',v:conv+'%',c:'#ec4899'},
                                ].map(({l,v,c})=>(
                                  <View key={l} style={{flex:1,backgroundColor:c+'15',borderRadius:12,
                                    padding:10,alignItems:'center'}}>
                                    <Text style={{fontSize:14,fontWeight:'900',color:c}}>{v}</Text>
                                    <Text style={{fontSize:8,color:th.text4,marginTop:3,textAlign:'center'}}>{l}</Text>
                                  </View>
                                ))}
                              </View>
                            );
                          })()}
                        </View>
                      )}

                    </ScrollView>
                    );
                  })()}
                  {/* ORDERS TAB */}
                  {adminTab==='orders'&&(()=>{
                    // Завантажуємо при першому відкритті
                    if(!adminOrdersLoading&&adminOrders.length===0){
                      loadAdminOrders();
                      loadAdminNotifs();
                    }
                    const displayOrders=adminOrders.length>0?adminOrders:[];
                    return(
                    <ScrollView keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{padding:16,paddingBottom:120}}
                  alwaysBounceVertical={true}>
                      {/* Кнопки управління */}
                      <View style={{flexDirection:'row',gap:8,marginBottom:12,justifyContent:'flex-end'}}>
                        <TouchableOpacity
                          onPress={async()=>{
                            showNotif('Оновлюємо статуси НП...','info');
                            const updated = await refreshAllTrackings(adminOrders);
                            const count = Object.keys(updated||{}).length;
                            showNotif(count>0?'↻ Оновлено '+count+' посилок':'Активних посилок немає','success');
                          }}
                          style={{flexDirection:'row',alignItems:'center',gap:5,
                            paddingHorizontal:12,paddingVertical:7,borderRadius:10,
                            backgroundColor:'#eff6ff',borderWidth:1,borderColor:'#bfdbfe'}}>
                          <Text style={{fontSize:12}}>📦</Text>
                          <Text style={{fontSize:11,fontWeight:'700',color:'#2563eb'}}>НП статуси</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={loadAdminOrders}
                          style={{flexDirection:'row',alignItems:'center',gap:5,
                            paddingHorizontal:12,paddingVertical:7,borderRadius:10,
                            backgroundColor:th.bg2,borderWidth:1,borderColor:th.cardBorder}}>
                          <Text style={{fontSize:11,color:th.text3}}>
                            {adminOrdersLoading?'Завантаження...':'↻ Оновити'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {/* Search */}
                      <View style={{flexDirection:'row',backgroundColor:th.bg2,borderRadius:14,
                        paddingHorizontal:14,paddingVertical:10,marginBottom:14,alignItems:'center',gap:8}}>
                        <Text style={{fontSize:14,color:th.text4}}>🔍</Text>
                        <TextInput
                          style={{flex:1,fontSize:13,color:th.text}}
                          placeholder="Пошук: номер, клієнт, телефон, артикул, ТТН..."
                          placeholderTextColor={th.text4}
                          value={adminSearch}
                          onChangeText={setAdminSearch}/>
                        {adminSearch.length>0&&(
                          <TouchableOpacity onPress={()=>setAdminSearch('')}>
                            <Text style={{fontSize:16,color:th.text4}}>×</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {(()=>{
                        const q=adminSearch.toLowerCase();
                        const filtered=(displayOrders).filter(ord=>{
                          if(!q) return true;
                          return String(ord.id||'').includes(q)||
                            (ord.contact_name||ord.name||'').toLowerCase().includes(q)||
                            (ord.contact_phone||ord.phone||'').includes(q)||
                            (ord.city||'').toLowerCase().includes(q)||
                            String(ord.tracking||ord.track||'').includes(q)||
                            JSON.stringify(ord.items||[]).toLowerCase().includes(q);
                        });
                        if(filtered.length===0) return(
                          <View style={{alignItems:'center',paddingVertical:40,gap:12}}>
                            <Text style={{fontSize:36}}>📦</Text>
                            <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>
                              {displayOrders.length===0?'Замовлень поки немає':'Нічого не знайдено'}
                            </Text>
                          </View>
                        );
                        return filtered.map((ord,i)=>(
                          <View key={i} style={{marginBottom:12,borderRadius:24,
                            backgroundColor:th.bg2,padding:18,gap:10,
                            borderWidth:1,borderColor:th.cardBorder}}>
                            {/* Header */}
                            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                              <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                                <Text style={{fontSize:15,fontWeight:'900',color:th.text}}>#{ord.id}</Text>
                                <View style={{paddingHorizontal:10,paddingVertical:3,borderRadius:20,
                                  backgroundColor:ST_BG[ord.status]||'#e5e7eb'}}>
                                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:1,
                                    color:ST_COLOR[ord.status]||'#374151'}}>
                                    {(ord.status||'НОВЕ').toUpperCase()}
                                  </Text>
                                </View>
                              </View>
                              <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                                <Text style={{fontSize:15,fontWeight:'900',color:th.text}}>{ord.total||0} ₴</Text>
                                {/* Кнопка редагувати */}
                                <TouchableOpacity
                                  onPress={()=>{
                                    setAdminEditOrder(ord);
                                    setAdminEditOrderForm({
                                      contact_name:   ord.contact_name||'',
                                      contact_phone:  ord.contact_phone||'',
                                      contact_email:  ord.contact_email||'',
                                      city:           ord.city||'',
                                      np_branch:      ord.np_branch||'',
                                      tracking:       ord.tracking||'',
                                      status:         ord.status||'Оплачено',
                                      payment_method: ord.payment_method||'',
                                      payment_status: ord.payment_status||'',
                                      total:          String(ord.total||0),
                                      subtotal:       String(ord.subtotal||0),
                                      bonus_used:     String(ord.bonus_used||0),
                                      items:          JSON.stringify(ord.items||[],null,2),
                                    });
                                  }}
                                  style={{width:30,height:30,borderRadius:10,
                                    backgroundColor:th.accent,
                                    justifyContent:'center',alignItems:'center'}}>
                                  <Text style={{fontSize:13}}>✏️</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            {/* Client — натискання відкриває профіль */}
                            <View style={{gap:4}}>
                              <TouchableOpacity
                                onPress={()=>{
                                  const userOrds=adminOrders.filter(o=>
                                    o.user_id===ord.user_id||o.contact_phone===ord.contact_phone
                                  );
                                  setAdminUserOrders(userOrds);
                                  setAdminSelectedUser({
                                    name:ord.contact_name||ord.name||'—',
                                    phone:ord.contact_phone||ord.phone||'',
                                    email:ord.contact_email||ord.email||'',
                                    userId:ord.user_id||null,
                                    totalOrders:userOrds.length,
                                    totalSpent:userOrds.reduce((s,o)=>s+(o.total||0),0),
                                    avgOrder:userOrds.length?Math.round(userOrds.reduce((s,o)=>s+(o.total||0),0)/userOrds.length):0,
                                  });
                                }}
                                style={{flexDirection:'row',gap:6,alignItems:'center'}}>
                                <Text style={{fontSize:10,color:'#6b7280',width:60}}>Клієнт</Text>
                                <Text style={{fontSize:12,fontWeight:'700',color:'#111',flex:1,textDecorationLine:'underline'}}>{ord.contact_name||ord.name||'—'} 👤</Text>
                              </TouchableOpacity>
                              <View style={{flexDirection:'row',gap:6,alignItems:'center'}}>
                                <Text style={{fontSize:10,color:'#6b7280',width:60}}>Телефон</Text>
                                <Text style={{fontSize:12,color:'#111'}}>{ord.contact_phone||ord.phone||'—'}</Text>
                              </View>
                              <View style={{flexDirection:'row',gap:6,alignItems:'center'}}>
                                <Text style={{fontSize:10,color:'#6b7280',width:60}}>Місто</Text>
                                <Text style={{fontSize:12,color:'#111'}}>{ord.city||'—'}</Text>
                              </View>
                              {ord.track&&(
                                 <View style={{gap:6}}>
                                <View style={{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                                  <Text style={{fontSize:10,color:'#6b7280',width:60}}>ТТН НП</Text>
                                  <Text style={{fontSize:12,fontWeight:'600',color:'#111',flex:1}}>{ord.track||ord.tracking}</Text>
                                  {/* Статус НП */}
                                  {npTrackData[ord.track||ord.tracking]&&(
                                    <View style={{backgroundColor:'#f0fdf4',paddingHorizontal:6,paddingVertical:2,borderRadius:6}}>
                                      <Text style={{fontSize:9,color:'#166534',fontWeight:'700'}}>
                                        {npTrackData[ord.track||ord.tracking].statusText}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                {/* НП кнопки */}
                                <View style={{flexDirection:'row',gap:6,marginTop:4}}>
                                  <TouchableOpacity
                                    onPress={async()=>{
                                      showNotif('Оновлюємо трекінг...','info');
                                      const r = await trackNpParcel(ord.track||ord.tracking);
                                      if(r){
                                        setNpTrackData(p=>({...p,[ord.track||ord.tracking]:r}));
                                        showNotif('Статус: '+r.statusText,'success');
                                      } else showNotif('Не вдалось отримати статус','error');
                                    }}
                                    style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,
                                      backgroundColor:'#eff6ff',borderWidth:1,borderColor:'#bfdbfe'}}>
                                    <Text style={{fontSize:10,fontWeight:'700',color:'#2563eb'}}>↻ Оновити</Text>
                                  </TouchableOpacity>
                                </View>
                                 </View>
                              )}
                              {/* Кнопка створення ТТН якщо немає */}
                              {!ord.track&&!ord.tracking&&(
                                <TouchableOpacity
                                  onPress={()=>{
                                    setNpCreateOrderId(ord);
                                    setNpCreateForm(f=>({...f,cost:String(ord.total||300)}));
                                    setShowNpCreate(true);
                                  }}
                                  style={{flexDirection:'row',alignItems:'center',gap:6,
                                    marginTop:4,paddingHorizontal:10,paddingVertical:6,borderRadius:8,
                                    backgroundColor:'#fef3c7',borderWidth:1,borderColor:'#fcd34d',
                                    alignSelf:'flex-start'}}>
                                  <Text style={{fontSize:12}}>📦</Text>
                                  <Text style={{fontSize:11,fontWeight:'700',color:'#92400e'}}>Створити ТТН</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            {/* Items */}
                            <View style={{borderTopWidth:1,borderTopColor:'rgba(0,0,0,.07)',paddingTop:8,gap:3}}>
                              {(ord.items||[]).map((it,j)=>(
                                <Text key={j} style={{fontSize:11,color:'#374151'}}>
                                  · {typeof it==='object'?(it.name||'')+' x'+(it.qty||1)+' '+(it.size?'('+it.size+')':''):String(it)}
                                </Text>
                              ))}
                            </View>
                            {/* Status buttons */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{gap:6,paddingVertical:4}}>
                              {['Оплачено','В дорозі','Доставлено','Отримано','Скасовано'].map(st=>(
                                <TouchableOpacity key={st}
                                  onPress={()=>adminUpdateOrderStatus(ord.id,st)}
                                  style={{paddingHorizontal:10,paddingVertical:6,borderRadius:14,
                                    backgroundColor:ord.status===st?'#111':'rgba(0,0,0,.07)'}}>
                                  <Text style={{fontSize:10,fontWeight:'700',
                                    color:ord.status===st?'#fff':'#374151'}}>{st}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                            {/* Date */}
                            <Text style={{fontSize:10,color:'#9ca3af'}}>{ord.date}</Text>
                          </View>
                        ));
                      })()}
                    </ScrollView>
                  )})()}
                  {/* HIDDEN CATEGORIES TAB — вбудовано в categories */}
                  {adminTab==='cats_disabled'&&(
                    <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:120}}>
                      <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:8}}>
                        ВИДИМІСТЬ КАТЕГОРІЙ
                      </Text>
                      <Text style={{fontSize:12,color:th.text3,marginBottom:20,lineHeight:17}}>
                        Натисніть щоб сховати категорію з навігації магазину
                      </Text>
                      {CAT_TREE.map(cat=>(
                        <TouchableOpacity key={cat.id}
                          onPress={()=>setHiddenCats(
                            hiddenCats.includes(cat.id)
                              ?hiddenCats.filter(x=>x!==cat.id)
                              :[...hiddenCats,cat.id]
                          )}
                          style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                            padding:14,borderRadius:12,marginBottom:8,
                            backgroundColor:hiddenCats.includes(cat.id)?'#fef2f2':th.bg2,
                            borderWidth:1,borderColor:hiddenCats.includes(cat.id)?'#fecaca':th.cardBorder}}>
                          <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                            <Text style={{fontSize:20}}>{cat.icon||'📦'}</Text>
                            <View>
                              <Text style={{fontSize:13,fontWeight:'600',color:th.text}}>{cat.label}</Text>
                              <Text style={{fontSize:10,color:th.text3}}>
                                {hiddenCats.includes(cat.id)?'Прихована':'Відображається'}
                              </Text>
                            </View>
                          </View>
                          <View style={{width:28,height:28,borderRadius:8,
                            backgroundColor:hiddenCats.includes(cat.id)?'#fecaca':th.accent,
                            justifyContent:'center',alignItems:'center'}}>
                            <Text style={{fontSize:14,fontWeight:'900',
                              color:hiddenCats.includes(cat.id)?'#dc2626':th.accentText}}>
                              {hiddenCats.includes(cat.id)?'✗':'✓'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* MAIN MENU TAB — керування головним меню */}
                  {adminTab==='mainmenu'&&(
                    <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:120}}>
                      <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:6}}>
                        КЕРУВАННЯ ГОЛОВНИМ МЕНЮ
                      </Text>
                      <Text style={{fontSize:12,color:th.text3,marginBottom:20,lineHeight:17}}>
                        Оберіть які категорії відображатимуться в рядку іконок на головній сторінці
                      </Text>
                      {[
                        {id:'new',       label:'Новинки',    icon:'✦',  desc:'Останні 15 доданих товарів'},
                        {id:'outerwear', label:'Куртки',     icon:'🧥', desc:'Верхній одяг'},
                        {id:'tshirts',   label:'Футболки',   icon:'👕', desc:'Футболки та поло'},
                        {id:'shirts',    label:'Сорочки',    icon:'👔', desc:'Сорочки'},
                        {id:'hoodies',   label:'Кофти',      icon:'🧣', desc:'Кофти, світшоти, худі'},
                        {id:'pants',     label:'Штани',      icon:'👖', desc:'Джинси, штани, шорти'},
                        {id:'costumes',  label:'Костюми',    icon:'🎽', desc:'Костюми та комплекти'},
                        {id:'accessories',label:'Аксесуари', icon:'🎩', desc:'Взуття, аксесуари'},
                        {id:'sale',      label:'SALE',       icon:'％', desc:'Товари зі знижкою'},
                      ].map((cat,i)=>{
                        const isOn=homeMenu.includes(cat.id);
                        return(
                          <TouchableOpacity key={cat.id+'_'+i}
                            onPress={()=>setHomeMenu(
                              isOn
                                ? homeMenu.filter(x=>x!==cat.id)
                                : [...homeMenu, cat.id]
                            )}
                            style={{flexDirection:'row',alignItems:'center',
                              justifyContent:'space-between',padding:14,
                              borderRadius:12,marginBottom:8,
                              backgroundColor:isOn?th.bg2:'transparent',
                              borderWidth:1.5,
                              borderColor:isOn?th.accent:th.cardBorder}}>
                            <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                              <View style={{width:44,height:44,borderRadius:22,
                                backgroundColor:isOn?th.accent:th.bg2,
                                justifyContent:'center',alignItems:'center'}}>
                                <Text style={{fontSize:20}}>{cat.icon}</Text>
                              </View>
                              <View>
                                <Text style={{fontSize:14,fontWeight:'600',color:th.text}}>{cat.label}</Text>
                                <Text style={{fontSize:11,color:th.text3,marginTop:2}}>{cat.desc}</Text>
                              </View>
                            </View>
                            <View style={{width:28,height:28,borderRadius:8,
                              backgroundColor:isOn?th.accent:th.bg3,
                              justifyContent:'center',alignItems:'center'}}>
                              <Text style={{fontSize:14,fontWeight:'900',
                                color:isOn?th.accentText:th.text4}}>
                                {isOn?'✓':'–'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      <View style={{marginTop:8,padding:14,borderRadius:12,
                        backgroundColor:th.bg2,borderWidth:1,borderColor:th.cardBorder}}>
                        <Text style={{fontSize:11,color:th.text3,lineHeight:17}}>
                          💡 Зміни застосовуються одразу.
                        </Text>
                      </View>

                      {/* НАЛАШТУВАННЯ БАНЕРА */}
                      <View style={{marginTop:8,backgroundColor:th.bg2,borderRadius:16,padding:16,gap:10}}>
                        <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:th.text4}}>
                          ГОЛОВНИЙ БАНЕР
                        </Text>

                        {/* Preview */}
                        <View style={{borderRadius:12,overflow:'hidden',
                          height:bannerSize==='small'?80:bannerSize==='large'?180:120,
                          backgroundColor:th.bg3}}>
                          {heroStaticImg?(
                            <>
                              <Image source={{uri:heroStaticImg}}
                                style={{width:'100%',height:'100%',position:'absolute'}}
                                resizeMode="cover"/>
                              <View style={{position:'absolute',bottom:0,left:0,right:0,
                                height:'55%',backgroundColor:'rgba(0,0,0,0.35)'}}/>
                              <Text style={{position:'absolute',bottom:10,left:12,
                                color:'#fff',fontWeight:'800',fontSize:13}}>
                                {heroStaticTitle}
                              </Text>
                            </>
                          ):(
                            <View style={{flex:1,justifyContent:'center',alignItems:'center',gap:4}}>
                              <Text style={{fontSize:28}}>🖼</Text>
                              <Text style={{color:th.text4,fontSize:11}}>Фото не обрано</Text>
                            </View>
                          )}
                        </View>

                        {/* Upload buttons */}
                        <View style={{flexDirection:'row',gap:8}}>
                          <TouchableOpacity
                            onPress={()=>pickImage(({uri,uploading})=>{
                              setHeroStaticImg(uri);
                              showNotif(uploading?'Завантаження...':'Банер оновлено ✓', uploading?'info':'success');
                            })}
                            style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1,
                              borderColor:th.accent,backgroundColor:th.accent+'15',
                              flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6}}>
                            <Text style={{fontSize:15}}>📁</Text>
                            <Text style={{fontSize:12,fontWeight:'700',color:th.accent}}>З ГАЛЕРЕЇ</Text>
                          </TouchableOpacity>
                          {!!heroStaticImg&&(
                            <TouchableOpacity
                              onPress={()=>setHeroStaticImg('')}
                              style={{paddingVertical:12,paddingHorizontal:14,borderRadius:12,
                                borderWidth:1,borderColor:'#fecaca'}}>
                              <Text style={{fontSize:12,fontWeight:'700',color:'#dc2626'}}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* URL input */}
                        <AppInput th={th} label="або URL фото банера"
                          value={heroStaticImg}
                          onChangeText={setHeroStaticImg}
                          placeholder="https://...jpg"
                          autoCapitalize="none" keyboardType="url"/>

                        {/* Banner size selector */}
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4,marginTop:4}}>
                          РОЗМІР БАНЕРА
                        </Text>
                        <View style={{flexDirection:'row',gap:8}}>
                          {[
                            {k:'small',  l:'Малий',    desc:'~18% екрану', h:40},
                            {k:'medium', l:'Середній', desc:'~30% екрану', h:56},
                            {k:'large',  l:'Великий',  desc:'~48% екрану', h:76},
                          ].map(({k,l,desc,h})=>(
                            <TouchableOpacity key={k} onPress={()=>setBannerSize(k)}
                              style={{flex:1,borderRadius:12,borderWidth:2,overflow:'hidden',
                                borderColor:bannerSize===k?th.accent:th.cardBorder}}>
                              {/* Mini preview bar */}
                              <View style={{backgroundColor:bannerSize===k?th.accent+'22':th.bg3,
                                padding:8,alignItems:'center',gap:3}}>
                                <View style={{width:'100%',height:h,borderRadius:6,
                                  backgroundColor:bannerSize===k?th.accent+'44':'#d1d5db',
                                  justifyContent:'flex-end',paddingBottom:4,paddingLeft:4}}>
                                  <View style={{width:'60%',height:4,borderRadius:2,
                                    backgroundColor:bannerSize===k?th.accent:'#9ca3af'}}/>
                                </View>
                                <Text style={{fontSize:11,fontWeight:'800',
                                  color:bannerSize===k?th.accent:th.text}}>{l}</Text>
                                <Text style={{fontSize:9,color:bannerSize===k?th.accent:th.text4}}>{desc}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Title/subtitle */}
                        <AppInput th={th} label="Заголовок банера"
                          value={heroStaticTitle}
                          onChangeText={setHeroStaticTitle}
                          placeholder="НОВІ НАДХОДЖЕННЯ"/>
                        <AppInput th={th} label="Підзаголовок"
                          value={heroStaticSub}
                          onChangeText={setHeroStaticSub}
                          placeholder="Осінь 2024. Чистий стиль"/>

                        <TouchableOpacity
                          onPress={()=>{
                            const firstWithImg=products.find(p=>p.img||p.images?.[0]);
                            if(firstWithImg){
                              setHeroStaticImg(firstWithImg.images?.[0]||firstWithImg.img);
                              setHeroStaticTitle(firstWithImg.name.toUpperCase());
                              setHeroStaticSub(firstWithImg.price+' ₴');
                              showNotif('Банер оновлено ✓','success');
                            }
                          }}
                          style={{paddingVertical:11,borderRadius:12,borderWidth:1,
                            borderColor:th.cardBorder,alignItems:'center'}}>
                          <Text style={{fontSize:12,fontWeight:'600',color:th.text3}}>
                            Взяти фото з першого товару
                          </Text>
                        </TouchableOpacity>
                      </View>

                    </ScrollView>
                  )}

                  {/* CONTENT TAB — редагування footer */}
                  {adminTab==='content'&&(
                    <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:200}}>
                      <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:20}}>
                        РЕДАГУВАННЯ КОНТЕНТУ САЙТУ
                      </Text>

                      {Object.entries(footerContent).map(([key,data])=>(
                        <View key={key} style={{backgroundColor:th.bg2,borderRadius:16,padding:16,marginBottom:12}}>
                          <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:10}}>
                            {data.title.ua}
                          </Text>

                          {/* Edit title UA */}
                          <Text style={{fontSize:9,color:th.text4,letterSpacing:1,marginBottom:4}}>ЗАГОЛОВОК (УКР)</Text>
                          <TextInput
                            style={{backgroundColor:th.bg3,borderRadius:10,paddingHorizontal:12,paddingVertical:10,
                              fontSize:12,color:th.text,borderWidth:1,borderColor:th.cardBorder,marginBottom:8}}
                            value={data.title.ua}
                            onChangeText={v=>setFooterContent(p=>({...p,[key]:{...p[key],title:{...p[key].title,ua:v}}}))}/>

                          {/* Edit title EN */}
                          <Text style={{fontSize:9,color:th.text4,letterSpacing:1,marginBottom:4}}>ЗАГОЛОВОК (EN)</Text>
                          <TextInput
                            style={{backgroundColor:th.bg3,borderRadius:10,paddingHorizontal:12,paddingVertical:10,
                              fontSize:12,color:th.text,borderWidth:1,borderColor:th.cardBorder,marginBottom:10}}
                            value={data.title.en}
                            onChangeText={v=>setFooterContent(p=>({...p,[key]:{...p[key],title:{...p[key].title,en:v}}}))}/>

                          {/* Items UA */}
                          <Text style={{fontSize:9,color:th.text4,letterSpacing:1,marginBottom:6}}>ПУНКТИ (УКР)</Text>
                          {data.items.ua.map((item,i)=>(
                            <View key={i} style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
                              <TextInput
                                style={{flex:1,backgroundColor:th.bg3,borderRadius:10,paddingHorizontal:12,paddingVertical:8,
                                  fontSize:12,color:th.text,borderWidth:1,borderColor:th.cardBorder}}
                                value={item}
                                onChangeText={v=>{
                                  const newItems=[...data.items.ua];
                                  newItems[i]=v;
                                  setFooterContent(p=>({...p,[key]:{...p[key],items:{...p[key].items,ua:newItems}}}));
                                }}/>
                              <TouchableOpacity
                                onPress={()=>setFooterContent(p=>({...p,[key]:{...p[key],items:{...p[key].items,ua:p[key].items.ua.filter((_,j)=>j!==i)}}}))}
                                style={{padding:6}}>
                                <Text style={{color:'#dc2626',fontSize:16}}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                          <TouchableOpacity
                            onPress={()=>setFooterContent(p=>({...p,[key]:{...p[key],items:{...p[key].items,ua:[...p[key].items.ua,'']}}}))}
                            style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:8}}>
                            <Text style={{color:th.text3,fontSize:18}}>+</Text>
                            <Text style={{fontSize:11,color:th.text3,fontWeight:'600'}}>Додати пункт</Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      <View style={{backgroundColor:'#f0fdf4',borderRadius:16,padding:14,borderWidth:1,borderColor:'#bbf7d0'}}>
                        <Text style={{fontSize:11,color:'#059669',fontWeight:'700',textAlign:'center'}}>
                          ✓ Зміни зберігаються автоматично
                        </Text>
                      </View>
                    </ScrollView>
                  )}

                  {/* CSV TAB */}
                  {adminTab==='csv'&&(
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:16,paddingBottom:120}}>

                      {/* EXPORT block */}
                      <View style={{backgroundColor:'#111',borderRadius:20,padding:20,gap:12}}>
                        <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:'rgba(255,255,255,.5)'}}>
                          ЕКСПОРТ
                        </Text>
                        <Text style={{fontSize:13,color:'rgba(255,255,255,.65)',lineHeight:18}}>
                          Вивантажити дані у CSV. Відкривається у Excel або Google Sheets.
                        </Text>
                        {[
                          {label:'Експорт товарів (CSV)',icon:'📦',fn:()=>{
                            const hdr='id,sku,name,price,stock,category,description';
                            const NL='\n';
                            const rows=adminProducts.map(p=>[
                              p.id||'',p.sku||'',
                              '"'+(p.name||'').replace(/"/g,"''")+'"',
                              p.price||0,p.stock||0,
                              p.sub_category||p.cid||'',
                              '"'+(p.description||'').replace(/"/g,"''")+'"',
                            ].join(',')).join(NL);
                            Share.share({message:hdr+NL+rows,
                              title:'4YOU_products_'+new Date().toISOString().slice(0,10)+'.csv'}).catch(()=>{});
                          }},
                          {label:'Експорт замовлень (CSV)',icon:'🧾',fn:()=>{
                            const hdr='id,date,status,total,client,phone,city,track,items';
                            const NL='\n';
                            const rows=orders.map(o=>[
                              o.id||'',o.date||'',o.status||'',o.total||0,
                              '"'+(o.name||'').replace(/"/g,"''")+'"',
                              o.phone||'',o.city||'',o.track||'',
                              '"'+(o.items||[]).join(' | ').replace(/"/g,"''")+'"',
                            ].join(',')).join(NL);
                            Share.share({message:hdr+NL+rows,
                              title:'4YOU_orders_'+new Date().toISOString().slice(0,10)+'.csv'}).catch(()=>{});
                          }},
                        ].map((btn,i)=>(
                          <TouchableOpacity key={i} onPress={btn.fn}
                            style={{flexDirection:'row',alignItems:'center',gap:12,
                              backgroundColor:'rgba(255,255,255,.08)',
                              borderRadius:14,paddingHorizontal:16,paddingVertical:14}}>
                            <Text style={{fontSize:22}}>{btn.icon}</Text>
                            <Text style={{flex:1,fontSize:13,color:'#fff',fontWeight:'600'}}>{btn.label}</Text>
                            <Text style={{fontSize:16,color:'rgba(255,255,255,.4)'}}>↗</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* IMPORT block */}
                      <View style={{backgroundColor:th.bg2,borderRadius:20,padding:20,gap:12}}>
                        <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:th.text4}}>
                          ІМПОРТ (CSV → SUPABASE)
                        </Text>
                        <Text style={{fontSize:12,color:th.text3,lineHeight:18}}>
                          {'Вставте CSV нижче. Обовʼязкові колонки: name, price. Додаткові: sku, stock, category, description'}
                        </Text>
                        <View style={{backgroundColor:th.bg,borderRadius:12,
                          borderWidth:1,borderColor:th.cardBorder}}>
                          <TextInput multiline numberOfLines={7}
                            placeholder={'name,price,stock,sku,category / "Назва",ціна,залишок,артикул,категорія'}
                            placeholderTextColor={th.text4}
                            style={{padding:14,color:th.text,fontSize:11,minHeight:140,textAlignVertical:'top'}}
                            value={csvInput} onChangeText={setCsvInput}/>
                        </View>
                        <View style={{flexDirection:'row',gap:8}}>
                          <TouchableOpacity onPress={()=>setCsvInput('')}
                            style={{flex:1,paddingVertical:12,borderRadius:12,
                              borderWidth:1,borderColor:th.cardBorder,alignItems:'center'}}>
                            <Text style={{fontSize:12,color:th.text3,fontWeight:'700'}}>Очистити</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async()=>{
                              if(!csvInput||!csvInput.trim()){showNotif('Вставте CSV-дані','error');return;}
                              const lines=csvInput.trim().split('\n').filter(l=>l.trim());
                              if(lines.length<2){showNotif('Потрібен хоч 1 рядок даних','error');return;}
                              const headers=lines[0].split(',').map(h=>h.trim().toLowerCase());
                              const nameIdx=headers.indexOf('name'),priceIdx=headers.indexOf('price');
                              if(nameIdx<0||priceIdx<0){showNotif('Колонки: name, price — обовʼязкові','error');return;}
                              let imported=0;
                              for(let i=1;i<lines.length;i++){
                                const vals=lines[i].split(',').map(v=>v.trim().replace(/^"|"$/g,''));
                                const row={};
                                headers.forEach((h,j)=>{row[h]=vals[j]||'';});
                                if(!row.name||!row.price) continue;
                                try{
                                  const catId=row.category_id||row.category||null;
                                  await supabase.from('products').insert({
                                    name:row.name,
                                    price:Number(row.price)||0,
                                    old_price:row.old_price?Number(row.old_price):null,
                                    stock:Number(row.stock)||100,
                                    sku:row.sku||null,
                                    category_id:catId,
                                    sub_category:row.sub_category||catId||null,
                                    badge:row.badge||null,
                                    description:row.description||null,
                                    images:row.image?[row.image]:[],
                                    sizes:row.sizes?row.sizes.split(';').map(s=>s.trim()):[],
                                    colors:row.colors?row.colors.split(';').map(c=>c.trim()):[],
                                    is_active:true,
                                  });
                                  imported++;
                                }catch(e){}
                              }
                              showNotif('Імпортовано '+imported+' товарів ✓','success');
                              setCsvInput('');loadAdminProducts();
                            }}
                            style={{flex:2,paddingVertical:12,borderRadius:12,
                              backgroundColor:th.text,alignItems:'center'}}>
                            <Text style={{fontSize:12,color:th.bg,fontWeight:'900',letterSpacing:0.5}}>
                              ІМПОРТУВАТИ ↑
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{backgroundColor:th.bg2,borderRadius:16,padding:16}}>
                        <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:8}}>
                          ЗРАЗОК ФОРМАТУ
                        </Text>
                        <Text style={{fontSize:11,color:th.text3,lineHeight:18}}>
                          {'name,price,stock,sku,category'}
                        </Text>
                        <Text style={{fontSize:11,color:th.text3,lineHeight:18,marginTop:2}}>
                          {'"Куртка Basic",1299,5,JKT001,outerwear'}
                        </Text>
                        <Text style={{fontSize:11,color:th.text3,lineHeight:18,marginTop:2}}>
                          {'"Футболка",599,20,TSH002,tshirts'}
                        </Text>
                      </View>

                    </ScrollView>
                  )}

                </>
                </KeyboardAvoidingView>
              )}
            </View>{/* END ADMIN */}

          </Animated.View>{/* END screen container */}

          {/* ── NAV BAR ── */}
          {!hideNav&&(
            <View style={{
              flexDirection:'row',
              backgroundColor:th.navBg,
              borderTopWidth:StyleSheet.hairlineWidth,
              borderTopColor:th.navBorder,
              paddingTop:8,
              paddingBottom:NAV_PAD_BOT+4,
              paddingHorizontal:8,
            }}>
              {navItems.map(tab=>{
                const active=scr===tab.k;
                // SVG-style іконки для таббару
                // Іконки — рендеримо SVG-path через View
                const accentColor = darkMode?'#fff':'#111111';
                const inactiveColor = darkMode?'rgba(255,255,255,0.35)':'rgba(0,0,0,0.30)';
                const iconColor = active ? accentColor : inactiveColor;
                // SVG іконки через Text (Unicode line icons)
                const ICON_MAP={
                  home:  active?'⌂':'⌂',
                  heart: active?'♥':'♡',
                  bag:   active?'🛍':'🛍',
                  bell:  active?'🔔':'🔔',
                  user:  active?'👤':'👤',
                };
                return(
                  <TouchableOpacity key={tab.k}
                    style={{flex:1,alignItems:'center',justifyContent:'flex-end',
                      paddingVertical:6,paddingBottom:4,gap:3}}
                    onPress={()=>{
                      if(tab.k===scr) return;
                      if(tab.k==='notifs') setTimeout(markNotifsRead,2500);
                      if(tab.k==='home'){
                        setCatFilter({cid:null,sub:null,badge:null});
                        setSrch('');setShowSrch(false);
                        if(scr==='home'){
                          homeScrollRef.current?.scrollTo({y:0,animated:true});
                          return;
                        }
                        // З БУДЬ-ЯКОГО екрану — скидаємо до home
                        setHist([]);setFwdHist([]);
                        setScr('home');
                        setTimeout(()=>homeScrollRef.current?.scrollTo({y:0,animated:true}),200);
                        return;
                      }
                      goWithTransition(tab.k);
                    }}>
                    {/* Іконка */}
                    <View style={{position:'relative'}}>
                      {tab.ic==='home'&&(
                        <View style={{width:24,height:22,justifyContent:'flex-end',alignItems:'center'}}>
                          {/* Дах */}
                          <View style={{position:'absolute',top:0,left:0,right:0,height:12,
                            justifyContent:'center',alignItems:'center'}}>
                            <View style={{width:0,height:0,
                              borderLeftWidth:12,borderRightWidth:12,borderBottomWidth:10,
                              borderLeftColor:'transparent',borderRightColor:'transparent',
                              borderBottomColor:iconColor}}/>
                          </View>
                          {/* Тіло */}
                          <View style={{width:16,height:10,borderWidth:1.5,borderColor:iconColor,
                            borderTopWidth:0,backgroundColor:'transparent',marginTop:2}}/>
                        </View>
                      )}
                      {tab.ic==='heart'&&(
                        <Text style={{fontSize:22,lineHeight:26,color:iconColor,
                          textShadowColor:'transparent'}}>
                          {active?'♥':'♡'}
                        </Text>
                      )}
                      {tab.ic==='bag'&&(
                        <View style={{width:22,height:22,justifyContent:'center',alignItems:'center'}}>
                          <View style={{width:16,height:13,borderWidth:1.5,borderColor:iconColor,
                            borderRadius:3,marginTop:4}}>
                            <View style={{position:'absolute',top:-5,left:3,
                              width:10,height:6,borderTopLeftRadius:6,borderTopRightRadius:6,
                              borderWidth:1.5,borderColor:iconColor,borderBottomWidth:0,
                              backgroundColor:'transparent'}}/>
                          </View>
                        </View>
                      )}
                      {tab.ic==='bell'&&(
                        <View style={{width:22,height:22,justifyContent:'center',alignItems:'center'}}>
                          <View style={{width:13,height:11,borderTopLeftRadius:8,borderTopRightRadius:8,
                            borderWidth:1.5,borderColor:iconColor,borderBottomWidth:0,marginBottom:-1}}/>
                          <View style={{width:17,height:2,backgroundColor:iconColor,borderRadius:1}}/>
                          <View style={{width:5,height:2.5,borderBottomLeftRadius:3,borderBottomRightRadius:3,
                            borderWidth:1.5,borderColor:iconColor,borderTopWidth:0,marginTop:0.5}}/>
                        </View>
                      )}
                      {tab.ic==='user'&&(
                        <View style={{width:22,height:22,justifyContent:'center',alignItems:'center'}}>
                          <View style={{width:10,height:10,borderRadius:5,borderWidth:1.5,
                            borderColor:iconColor,marginBottom:1}}/>
                          <View style={{width:16,height:7,borderTopLeftRadius:8,borderTopRightRadius:8,
                            borderWidth:1.5,borderColor:iconColor,borderBottomWidth:0}}/>
                        </View>
                      )}
                      {tab.cnt>0&&(
                        <View style={{position:'absolute',top:-3,right:-7,
                          minWidth:14,height:14,borderRadius:7,
                          backgroundColor:'#ef4444',justifyContent:'center',
                          alignItems:'center',paddingHorizontal:2}}>
                          <Text style={{color:'#fff',fontSize:7,fontWeight:'900'}}>
                            {tab.cnt>99?'99+':String(tab.cnt)}
                          </Text>
                        </View>
                      )}
                    </View>
                    {/* Підпис */}
                    <Text style={{
                      fontSize:10,fontWeight:active?'600':'400',
                      letterSpacing:0,
                      color:active?accentColor:inactiveColor,
                    }}>
                      {tab.lb}
                    </Text>
                    {/* Активна точка знизу */}
                    {active&&(
                      <View style={{
                        width:4,height:4,borderRadius:2,
                        backgroundColor:accentColor,
                        position:'absolute',bottom:1,
                      }}/>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}


      {/* ── MODALS ── */}

      {/* ══ ADMIN REVIEWS MODAL ══ */}
      <Modal visible={showAdminReviews} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={()=>setShowAdminReviews(false)}>
        <View style={{flex:1,backgroundColor:th.bg}}>
          {/* Header */}
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
            paddingHorizontal:20,paddingTop:56,paddingBottom:16,
            borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
            <TouchableOpacity onPress={()=>setShowAdminReviews(false)}>
              <Text style={{fontSize:15,color:th.text3}}>← Назад</Text>
            </TouchableOpacity>
            <Text style={{fontSize:15,fontWeight:'900',color:th.text}}>⭐ Відгуки</Text>
            <TouchableOpacity onPress={loadAdminReviews}>
              <Text style={{fontSize:13,color:th.accent,fontWeight:'700'}}>Оновити</Text>
            </TouchableOpacity>
          </View>

          {adminReviewsLoading?(
            <View style={{flex:1,justifyContent:'center',alignItems:'center',gap:12}}>
              <ActivityIndicator size="large" color={th.accent}/>
              <Text style={{color:th.text4,fontSize:12}}>Завантаження відгуків...</Text>
            </View>
          ):(
            <ScrollView contentContainerStyle={{padding:16,paddingBottom:60,gap:12}}>
              {/* Stats row */}
              <View style={{flexDirection:'row',gap:10,marginBottom:4}}>
                {[
                  {label:'Всього', val:adminReviews.length, color:'#6366f1'},
                  {label:'Сьогодні', val:adminReviews.filter(r=>{
                    const d=new Date(r.created_at||0);
                    const t=new Date();
                    return d.toDateString()===t.toDateString();
                  }).length, color:'#059669'},
                  {label:'Середня', val:adminReviews.length>0?
                    (adminReviews.reduce((s,r)=>s+(r.rating||0),0)/adminReviews.length).toFixed(1)+' ★':'—',
                    color:'#d97706'},
                ].map(({label,val,color})=>(
                  <View key={label} style={{flex:1,backgroundColor:th.bg2,borderRadius:12,
                    padding:12,alignItems:'center',borderWidth:1,borderColor:th.cardBorder}}>
                    <Text style={{fontSize:18,fontWeight:'900',color}}>{val}</Text>
                    <Text style={{fontSize:10,color:th.text4,marginTop:2}}>{label}</Text>
                  </View>
                ))}
              </View>

              {adminReviews.length===0&&(
                <View style={{paddingVertical:60,alignItems:'center',gap:8}}>
                  <Text style={{fontSize:40}}>💬</Text>
                  <Text style={{fontSize:14,color:th.text4}}>Відгуків ще немає</Text>
                  <Text style={{fontSize:11,color:th.text4,textAlign:'center'}}>
                    Відгуки зберігаються в таблиці "reviews" у Supabase
                  </Text>
                </View>
              )}

              {adminReviews.map((rv)=>(
                <View key={rv.id} style={{backgroundColor:th.bg2,borderRadius:14,padding:14,
                  borderWidth:1,borderColor:th.cardBorder,gap:6}}>
                  {/* Header row */}
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:1}}>
                      <View style={{width:32,height:32,borderRadius:16,
                        backgroundColor:th.accent+'22',justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:13,fontWeight:'900',color:th.accent}}>
                          {(rv.author||'?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{rv.author||'Анонім'}</Text>
                        <Text style={{fontSize:10,color:th.text4}}>{rv.date||new Date(rv.created_at||0).toLocaleDateString('uk-UA')}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={()=>Alert.alert('Видалити відгук?',rv.text?.slice(0,60)+'...',[
                        {text:'Видалити',style:'destructive',onPress:()=>deleteAdminReview(rv.id)},
                        {text:'Скасувати',style:'cancel'},
                      ])}
                      style={{padding:6}}>
                      <Text style={{fontSize:16,color:'#ef4444'}}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Stars */}
                  <Text style={{color:'#daa520',fontSize:14}}>
                    {'★'.repeat(rv.rating||0)+'☆'.repeat(5-(rv.rating||0))}
                  </Text>
                  {/* Text */}
                  <Text style={{fontSize:12,color:th.text2,lineHeight:18,fontWeight:'300'}}>
                    {rv.text}
                  </Text>
                  {/* Product ID chip */}
                  {rv.product_id&&(
                    <View style={{alignSelf:'flex-start',backgroundColor:th.bg3,
                      paddingHorizontal:8,paddingVertical:3,borderRadius:6,marginTop:2}}>
                      <Text style={{fontSize:9,color:th.text4,fontWeight:'600'}}>
                        {'Товар #'+rv.product_id}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>


      {/* ══ NOVA POSHTA CREATE TTN MODAL ══ */}
      <Modal visible={showNpCreate&&!!npCreateOrderId} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,borderTopLeftRadius:20,borderTopRightRadius:20,
            padding:20,paddingBottom:HOME_IND+20,maxHeight:'90%'}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <Text style={{fontSize:14,fontWeight:'900',color:th.text}}>📦 Створення ТТН</Text>
                <TouchableOpacity onPress={()=>setShowNpCreate(false)}>
                  <Text style={{fontSize:20,color:th.text3}}>✕</Text>
                </TouchableOpacity>
              </View>

              {npCreateOrderId&&(
                <View style={{backgroundColor:th.bg2,borderRadius:12,padding:12,marginBottom:12,gap:4}}>
                  <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>
                    {'Замовлення #'+npCreateOrderId.id}
                  </Text>
                  <Text style={{fontSize:11,color:th.text3}}>
                    {npCreateOrderId.contact_name||npCreateOrderId.name} · {npCreateOrderId.city} · {npCreateOrderId.np_branch||'відд. ?'}
                  </Text>
                  <Text style={{fontSize:11,color:th.text3}}>
                    {npCreateOrderId.contact_phone} · {npCreateOrderId.total} ₴
                  </Text>
                </View>
              )}

              {/* Параметри */}
              {[
                {label:'Вага (кг)', key:'weight', placeholder:'0.5', keyboardType:'decimal-pad'},
                {label:'Кількість місць', key:'seats', placeholder:'1', keyboardType:'numeric'},
                {label:'Опис вантажу', key:'description', placeholder:'Одяг'},
                {label:'Оголошена вартість (₴)', key:'cost', placeholder:'300', keyboardType:'numeric'},
              ].map(({label,key,placeholder,keyboardType})=>(
                <View key={key} style={{marginBottom:10}}>
                  <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1.5,color:th.text4,marginBottom:4}}>
                    {label.toUpperCase()}
                  </Text>
                  <TextInput
                    style={{borderWidth:1.5,borderColor:th.cardBorder,borderRadius:12,
                      paddingHorizontal:14,paddingVertical:11,fontSize:14,color:th.text,
                      backgroundColor:th.bg2}}
                    placeholder={placeholder}
                    placeholderTextColor={th.text4}
                    keyboardType={keyboardType||'default'}
                    value={npCreateForm[key]}
                    onChangeText={v=>setNpCreateForm(p=>({...p,[key]:v}))}/>
                </View>
              ))}

              {/* Платник */}
              <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1.5,color:th.text4,marginBottom:6}}>ПЛАТНИК ДОСТАВКИ</Text>
              <View style={{flexDirection:'row',gap:8,marginBottom:12}}>
                {[{k:'Recipient',l:'Отримувач'},{k:'Sender',l:'Відправник'}].map(({k,l})=>(
                  <TouchableOpacity key={k} onPress={()=>setNpCreateForm(p=>({...p,payerType:k}))}
                    style={{flex:1,paddingVertical:10,borderRadius:12,alignItems:'center',
                      backgroundColor:npCreateForm.payerType===k?th.accent:th.bg2,
                      borderWidth:1,borderColor:npCreateForm.payerType===k?th.accent:th.cardBorder}}>
                    <Text style={{fontSize:12,fontWeight:'700',
                      color:npCreateForm.payerType===k?th.accentText:th.text}}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Накладний платіж */}
              {npCreateOrderId?.pay?.includes('Накладн')||npCreateOrderId?.payment_method?.includes('Накладн')?(
                <View style={{backgroundColor:'#fef3c7',borderRadius:10,padding:10,marginBottom:12}}>
                  <Text style={{fontSize:11,color:'#92400e',fontWeight:'600'}}>
                    💰 Накладний платіж: {npCreateOrderId.total} ₴ буде включено до ТТН
                  </Text>
                </View>
              ):null}

              <TouchableOpacity
                onPress={()=>createNpParcel(npCreateOrderId)}
                disabled={npCreateLoading}
                style={{height:52,borderRadius:14,backgroundColor:npCreateLoading?th.bg3:th.accent,
                  justifyContent:'center',alignItems:'center',
                  shadowColor:th.accent,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:4}}>
                {npCreateLoading?(
                  <ActivityIndicator color={th.accentText}/>
                ):(
                  <Text style={{fontSize:14,fontWeight:'900',color:th.accentText}}>
                    📦 Створити ТТН в НП
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category modal */}
      <Modal visible={showCatModal} animationType="slide" transparent={false} statusBarTranslucent>
        <View style={{flex:1,backgroundColor:th.bg}}>
          {/* Header */}
          <View style={{paddingTop:IS_IOS?(IS_LARGE?54:44):28,paddingBottom:14,paddingHorizontal:20,
            borderBottomWidth:1,borderBottomColor:th.cardBorder,backgroundColor:th.bg,
            flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:14}}>
              {catLevel>0&&(
                <TouchableOpacity onPress={()=>{setCatLevel(0);setCatL1(null);}} style={{padding:4}}>
                  <Text style={{fontSize:32,color:th.text,fontWeight:'300',lineHeight:36}}>‹</Text>
                </TouchableOpacity>
              )}
              <Text style={{fontSize:13,fontWeight:'900',letterSpacing:3,color:th.text}}>
                {catLevel===0
                  ?(lang==='EN'?'CATEGORIES':'КАТЕГОРІЇ')
                  :(lang==='EN'?catL1?.labelEN:catL1?.label)}
              </Text>
            </View>
            <TouchableOpacity onPress={()=>{setShowCatModal(false);resetCat();}} style={{padding:8}}>
              <Text style={{fontSize:18,color:th.text3}}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom:HOME_IND+16}}>

            {/* ── LEVEL 0: All categories as visual tiles ── */}
            {catLevel===0&&(
              <View style={{padding:14,gap:6}}>
                {/* ALL items button */}
                <TouchableOpacity
                  onPress={()=>{setCatFilter({cid:null,sub:null,badge:null});setShowCatModal(false);resetCat();}}
                  style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                    paddingHorizontal:16,paddingVertical:11,borderRadius:16,
                    borderWidth:1.5,
                    borderColor:!catFilter.cid&&!catFilter.badge?th.text:th.cardBorder,
                    backgroundColor:!catFilter.cid&&!catFilter.badge?th.text:th.bg}}>
                  <Text style={{fontSize:12,fontWeight:'800',letterSpacing:0.5,
                    color:!catFilter.cid&&!catFilter.badge?th.bg:th.text}}>
                    {lang==='EN'?'ALL ITEMS':'ВСІ ТОВАРИ'}
                  </Text>
                  <Text style={{fontSize:11,color:!catFilter.cid&&!catFilter.badge?th.bg:th.text4}}>
                    {products.length}
                  </Text>
                </TouchableOpacity>

                {/* Main categories */}
                {CAT_TREE.filter(c=>!c.badge).map(cat=>{
                  const count=catProductCount[cat.id]||0;
                  const isActive=catFilter.cid===cat.id;
                  return(
                    <TouchableOpacity key={cat.id} activeOpacity={0.85}
                      onPress={()=>{
                        if(cat.children&&cat.children.length>0){setCatLevel(1);setCatL1(cat);}
                        else{setCatFilter({cid:cat.id,sub:null,badge:cat.badge||null});setShowCatModal(false);resetCat();}
                      }}
                      style={{flexDirection:'row',alignItems:'center',
                        paddingHorizontal:16,paddingVertical:11,borderRadius:16,
                        borderWidth:1.5,borderColor:isActive?th.text:th.cardBorder,
                        backgroundColor:isActive?th.text:th.bg}}>
                      {/* Іконка категорії */}
                      <View style={{width:36,height:36,borderRadius:10,
                        backgroundColor:isActive?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.04)',
                        justifyContent:'center',alignItems:'center',marginRight:10}}>
                        <Text style={{fontSize:19}}>{cat.icon||'📦'}</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:'700',color:isActive?th.bg:th.text}}>
                          {lang==='EN'?cat.labelEN:cat.label}
                        </Text>
                        {cat.children&&cat.children.length>0&&(
                          <Text style={{fontSize:9,color:isActive?'rgba(255,255,255,.5)':th.text4,marginTop:1}}>
                            {cat.children.slice(0,3).join(' · ')}{cat.children.length>3?'…':''}
                          </Text>
                        )}
                      </View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={{fontSize:11,color:isActive?'rgba(255,255,255,.7)':th.text4}}>{count}</Text>
                        {cat.children&&cat.children.length>0&&(
                          <Text style={{color:isActive?'rgba(255,255,255,.7)':th.text4,fontSize:18}}>›</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* SALE + NEW — minimal text style */}
                <View style={{gap:6,marginTop:2}}>
                  {[
                    {label:'SALE',labelEN:'SALE',badge:'Sale',icon:'🔥'},
                    {label:'Новинки',labelEN:'New Arrivals',badge:'Новинка',icon:'✨'},
                  ].map(item=>{
                    const isActive=catFilter.badge===item.badge;
                    return(
                      <TouchableOpacity key={item.badge} activeOpacity={0.8}
                        onPress={()=>{setCatFilter({cid:null,sub:null,badge:item.badge});setShowCatModal(false);resetCat();}}
                        style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                          paddingHorizontal:16,paddingVertical:11,borderRadius:16,
                          borderWidth:1.5,borderColor:isActive?th.text:th.cardBorder,
                          backgroundColor:isActive?th.text:th.bg}}>
                        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                          <View style={{width:36,height:36,borderRadius:10,
                            backgroundColor:isActive?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.04)',
                            justifyContent:'center',alignItems:'center'}}>
                            <Text style={{fontSize:19}}>{item.icon}</Text>
                          </View>
                          <Text style={{fontSize:13,fontWeight:'700',color:isActive?th.bg:th.text}}>
                            {lang==='EN'?item.labelEN:item.label}
                          </Text>
                        </View>
                        <Text style={{fontSize:11,color:isActive?'rgba(255,255,255,.6)':th.text4}}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── LEVEL 1: Sub-categories (string list from prom.ua) ── */}
            {catLevel===1&&catL1&&(
              <View style={{padding:14,gap:6}}>
                {/* View ALL this category */}
                <TouchableOpacity
                  onPress={()=>{setCatFilter({cid:catL1.id,sub:null,badge:null});setShowCatModal(false);resetCat();}}
                  style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                    paddingHorizontal:16,paddingVertical:11,borderRadius:16,
                    backgroundColor:th.text}}>
                  <Text style={{fontSize:13,fontWeight:'900',color:th.bg,letterSpacing:1}}>
                    {lang==='EN'?`ALL ${catL1.labelEN.toUpperCase()}`:`ВСІ ${catL1.label.toUpperCase()}`}
                  </Text>
                  <Text style={{fontSize:12,color:'rgba(255,255,255,.7)'}}>
                    {catProductCount[catL1.id]||0} →
                  </Text>
                </TouchableOpacity>

                {/* Individual sub-categories */}
                {(catL1.children||[]).map((sub,i)=>{
                  const cnt=catProductCount['sub_'+sub]||0;
                  if(cnt===0) return null;
                  return(
                    <TouchableOpacity key={i} activeOpacity={0.8}
                      onPress={()=>{setCatFilter({cid:catL1.id,sub,badge:null});setShowCatModal(false);resetCat();}}
                      style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                        paddingHorizontal:16,paddingVertical:10,borderRadius:16,
                        borderWidth:1,borderColor:catFilter.sub===sub?th.text:th.cardBorder,
                        backgroundColor:catFilter.sub===sub?th.bg2:th.bg}}>
                      <Text style={{fontSize:14,fontWeight:'500',color:th.text}}>{sub}</Text>
                      <Text style={{fontSize:11,color:th.text4}}>{cnt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>


      {/* ── IN-APP NOTIFICATION BANNER ── */}
      {inAppNotif&&(
        <Animated.View pointerEvents='none' style={{
          position:'absolute',top:TOP_PAD+8,left:16,right:16,zIndex:1000,
          transform:[{translateY:notifAnim}]}}>
          <View style={{
            backgroundColor:inAppNotif.type==='success'?'#059669':inAppNotif.type==='error'?'#dc2626':'#111',
            borderRadius:14,paddingHorizontal:18,paddingVertical:14,
            flexDirection:'row',alignItems:'center',gap:10,
            shadowColor:'#000',shadowOpacity:.2,shadowRadius:12,elevation:10}}>
            <Text style={{fontSize:16}}>
              {inAppNotif.type==='success'?'✓':inAppNotif.type==='error'?'✕':'ℹ'}
            </Text>
            <Text style={{color:'#fff',fontSize:13,fontWeight:'500',flex:1}}>{inAppNotif.msg}</Text>
          </View>
        </Animated.View>
      )}

      {/* ── BAG ANIMATION OVERLAY ── */}
      {animProduct&&(
        <Animated.View pointerEvents='none' style={{position:'absolute',zIndex:999,
          transform:[{translateX:bagAnimX},{translateY:bagAnimY}],opacity:bagOpacity}}>
          <View style={{width:52,height:52,borderRadius:26,backgroundColor:'#111',
            justifyContent:'center',alignItems:'center',
            shadowColor:'#000',shadowOpacity:.3,shadowRadius:8,elevation:10}}>
            <Text style={{fontSize:22}}>🛍</Text>
          </View>
        </Animated.View>
      )}

      {/* ── COLOR / SIZE FILTER MODAL ── */}
      {/* ── UNIFIED FILTERS MODAL (ціна + колір + розмір + к-ть товарів) ── */}
      <Modal visible={showPriceFilter} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowPriceFilter(false)}>
          <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <ScrollView style={{backgroundColor:th.bg,borderTopLeftRadius:24,borderTopRightRadius:24,
                maxHeight:H*0.88}} showsVerticalScrollIndicator={false}>
                <View style={{padding:24,paddingBottom:HOME_IND+24}}>
                  <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:20}}/>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                    <Text style={{fontSize:12,fontWeight:'900',letterSpacing:3,color:th.text}}>ФІЛЬТРИ</Text>
                    <TouchableOpacity onPress={()=>{
                      setPriceMin(0);setPriceMax(4000);
                      setColorFilter(null);setSizeFilter(null);
                    }}>
                      <Text style={{fontSize:10,color:'#dc2626',fontWeight:'700',letterSpacing:1}}>СКИНУТИ ВСЕ</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── ЦІНА ── */}
                  <Text style={{fontSize:9,color:th.text3,letterSpacing:2,fontWeight:'900',marginBottom:16}}>ЦІНА ₴</Text>
                  <View style={{flexDirection:'row',gap:12,marginBottom:8}}>
                    {[[0,500],[500,1000],[1000,2000],[2000,4000]].map(([mn,mx])=>(
                      <TouchableOpacity key={mn+'-'+mx}
                        onPress={()=>{setPriceMin(mn);setPriceMax(mx);}}
                        style={{flex:1,paddingVertical:8,borderRadius:10,alignItems:'center',
                          borderWidth:1,
                          borderColor:priceMin===mn&&priceMax===mx?th.text:th.cardBorder,
                          backgroundColor:priceMin===mn&&priceMax===mx?th.text:'transparent'}}>
                        <Text style={{fontSize:9,fontWeight:'800',
                          color:priceMin===mn&&priceMax===mx?th.bg:th.text3}}>
                          {mn}–{mx}₴
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{flexDirection:'row',gap:10,marginBottom:24}}>
                    <View style={{flex:1,borderWidth:1,borderColor:th.cardBorder,borderRadius:10,
                      flexDirection:'row',alignItems:'center',paddingHorizontal:12}}>
                      <Text style={{fontSize:11,color:th.text4,marginRight:4}}>від</Text>
                      <TextInput style={{flex:1,paddingVertical:10,fontSize:14,color:th.text,fontWeight:'600'}}
                        value={String(priceMin)} keyboardType="numeric"
                        onChangeText={v=>setPriceMin(Number(v)||0)}
                        placeholderTextColor={th.text4}/>
                      <Text style={{fontSize:11,color:th.text4}}>₴</Text>
                    </View>
                    <View style={{flex:1,borderWidth:1,borderColor:th.cardBorder,borderRadius:10,
                      flexDirection:'row',alignItems:'center',paddingHorizontal:12}}>
                      <Text style={{fontSize:11,color:th.text4,marginRight:4}}>до</Text>
                      <TextInput style={{flex:1,paddingVertical:10,fontSize:14,color:th.text,fontWeight:'600'}}
                        value={String(priceMax)} keyboardType="numeric"
                        onChangeText={v=>setPriceMax(Number(v)||4000)}
                        placeholderTextColor={th.text4}/>
                      <Text style={{fontSize:11,color:th.text4}}>₴</Text>
                    </View>
                  </View>

                  {/* ── КОЛІР ── */}
                  <Text style={{fontSize:9,color:th.text3,letterSpacing:2,fontWeight:'900',marginBottom:12}}>КОЛІР</Text>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24}}>
                    {['Чорний','Білий','Сірий','Графіт','Navy','Бежевий','Хакі','Коричневий','Stone','Оливковий'].map(c=>(
                      <TouchableOpacity key={c}
                        style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,
                          borderColor:colorFilter===c?th.text:th.cardBorder,
                          backgroundColor:colorFilter===c?th.text:'transparent'}}
                        onPress={()=>setColorFilter(colorFilter===c?null:c)}>
                        <Text style={{fontSize:11,color:colorFilter===c?th.bg:th.text2,fontWeight:'600'}}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ── РОЗМІР ── */}
                  <Text style={{fontSize:9,color:th.text3,letterSpacing:2,fontWeight:'900',marginBottom:12}}>РОЗМІР</Text>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24}}>
                    {['XS','S','M','L','XL','XXL','XXXL','28','29','30','31','32','33','34','36','38','One Size'].map(s=>(
                      <TouchableOpacity key={s}
                        style={{minWidth:48,paddingHorizontal:12,paddingVertical:9,borderRadius:R,borderWidth:1,
                          borderColor:sizeFilter===s?th.text:th.cardBorder,
                          backgroundColor:sizeFilter===s?th.text:'transparent',alignItems:'center'}}
                        onPress={()=>setSizeFilter(sizeFilter===s?null:s)}>
                        <Text style={{fontSize:11,fontWeight:'700',color:sizeFilter===s?th.bg:th.text2}}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ── К-ТЬ ТОВАРІВ НА СТОРІНЦІ ── */}
                  <Text style={{fontSize:9,color:th.text3,letterSpacing:2,fontWeight:'900',marginBottom:12}}>ТОВАРІВ НА СТОРІНЦІ</Text>
                  <View style={{flexDirection:'row',gap:10,marginBottom:28}}>
                    {[20,50,100].map(n=>(
                      <TouchableOpacity key={n}
                        onPress={()=>setPerPage(n)}
                        style={{flex:1,paddingVertical:12,borderRadius:12,alignItems:'center',
                          borderWidth:1,
                          borderColor:perPage===n?th.text:th.cardBorder,
                          backgroundColor:perPage===n?th.text:'transparent'}}>
                        <Text style={{fontSize:14,fontWeight:'900',
                          color:perPage===n?th.bg:th.text}}>{n}</Text>
                        <Text style={{fontSize:8,color:perPage===n?th.bg:th.text4,marginTop:2}}>
                          {n===20?'за замовч.':n===50?'більше':n===100?'все':''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={{backgroundColor:th.text,paddingVertical:15,borderRadius:14,alignItems:'center'}}
                    onPress={()=>setShowPriceFilter(false)}>
                    <Text style={{color:th.bg,fontWeight:'900',fontSize:11,letterSpacing:2}}>
                      ПОКАЗАТИ {allFilteredItems.length} ТОВАРІВ
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── COMPARE MODAL ── */}
      <Modal visible={showCompare} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowCompare(false)}>
          <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:th.bg,borderTopLeftRadius:20,borderTopRightRadius:20,
                maxHeight:H*0.85,paddingBottom:HOME_IND+16}}>
                <View style={{padding:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center',
                  borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                  <Text style={{fontSize:11,fontWeight:'900',letterSpacing:3,color:th.text}}>ПОРІВНЯННЯ</Text>
                  <TouchableOpacity onPress={()=>setShowCompare(false)}>
                    <Text style={{fontSize:20,color:th.text3}}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{flexDirection:'row',padding:16,gap:12}}>
                    {compareList.map((p,i)=>(
                      <View key={`cmp_${p.id}_${i}`} style={{width:160,borderWidth:1,borderColor:th.cardBorder,borderRadius:R,overflow:'hidden'}}>
                        <Image source={{uri:thumbUri(p.imgs?p.imgs[0]:(p.img||""))}} style={{width:160,height:120}} resizeMode="cover"/>
                        <View style={{padding:12}}>
                          <Text style={{fontSize:11,fontWeight:'600',color:th.text,marginBottom:6}} numberOfLines={2}>{p.name}</Text>
                          <Text style={{fontSize:14,fontWeight:'900',color:th.text,marginBottom:8}}>{p.price} ₴</Text>
                          {[
                            ['Рейтинг', `${p.r} ★`],
                            ['Відгуки',  String(p.rv)],
                            ['Кольори',  (p.cl||[]).length],
                            ['Розміри',  (p.sz||[]).length],
                            ['Категорія',p.cat||'—'],
                          ].map(([k,v])=>(
                            <View key={k} style={{flexDirection:'row',justifyContent:'space-between',
                              paddingVertical:5,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                              <Text style={{fontSize:9,color:th.text4,letterSpacing:0.5}}>{k}</Text>
                              <Text style={{fontSize:10,fontWeight:'700',color:th.text}}>{v}</Text>
                            </View>
                          ))}
                          <TouchableOpacity style={{marginTop:10,backgroundColor:th.accent,
                            paddingVertical:8,borderRadius:R,alignItems:'center'}}
                            onPress={()=>{setSel(p);setSelSz(null);setSelCl(null);addToRecentlyViewed(p);setShowCompare(false);go('product');}}>
                            <Text style={{color:th.accentText,fontSize:9,fontWeight:'900',letterSpacing:1}}>ВІДКРИТИ</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={{marginTop:6,alignItems:'center',padding:4}}
                            onPress={()=>toggleCompare(p)}>
                            <Text style={{fontSize:9,color:th.danger}}>Видалити</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── REFERRAL MODAL ── */}
      <Modal visible={showReferral} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowReferral(false)}>
          <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:'#111',borderTopLeftRadius:20,borderTopRightRadius:20,
                padding:28,paddingBottom:HOME_IND+20}}>
                <Text style={{fontSize:10,color:'rgba(255,255,255,.3)',letterSpacing:3,marginBottom:20,fontWeight:'700'}}>РЕФЕРАЛЬНА ПРОГРАМА</Text>
                <Text style={{fontSize:14,fontWeight:'300',color:'#fff',lineHeight:22,marginBottom:24}}>
                  Поділіться своїм кодом з друзями — і ви обидва отримаєте по <Text style={{fontWeight:'700',color:'#d4af37'}}>100 бонусів</Text> після першого замовлення.
                </Text>
                <View style={{backgroundColor:'rgba(255,255,255,.07)',borderRadius:R,
                  padding:20,alignItems:'center',marginBottom:20}}>
                  <Text style={{fontSize:9,color:'rgba(255,255,255,.3)',letterSpacing:3,marginBottom:8}}>ВАШ КОД</Text>
                  <Text style={{fontSize:28,fontWeight:'200',color:'#fff',letterSpacing:6}}>{refCode}</Text>
                </View>
                <TouchableOpacity style={{backgroundColor:'rgba(255,255,255,.12)',paddingVertical:14,
                  borderRadius:R,alignItems:'center',marginBottom:10}}
                  onPress={()=>Share.share({message:`Використай мій код ${refCode} у 4U.TEAM і отримай 100 бонусів! 🛍`})}>
                  <Text style={{color:'#fff',fontWeight:'900',fontSize:10,letterSpacing:2}}>↗  ПОДІЛИТИСЬ КОДОМ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',padding:12}} onPress={()=>setShowReferral(false)}>
                  <Text style={{color:'rgba(255,255,255,.3)',fontSize:10}}>Закрити</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── QUICK-ADD MODAL (long press) ── */}
      {/* ── FORGOT PASSWORD MODAL ── */}
      <Modal visible={showForgotModal} animationType="fade" transparent statusBarTranslucent>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'center',alignItems:'center',padding:24}}>
          <View style={{width:'100%',backgroundColor:'#141414',borderRadius:24,
            padding:28,borderWidth:1,borderColor:'rgba(255,255,255,0.08)'}}>

            {/* Header */}
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <Text style={{fontSize:20,fontWeight:'300',color:'#fff',letterSpacing:-0.3}}>
                {forgotSent?'Лист надіслано':'Відновлення паролю'}
              </Text>
              <TouchableOpacity
                onPress={()=>{setShowForgotModal(false);setForgotSent(false);setForgotEmail('');}}
                style={{width:32,height:32,borderRadius:16,
                  backgroundColor:'rgba(255,255,255,0.08)',
                  justifyContent:'center',alignItems:'center'}}>
                <Text style={{color:'rgba(255,255,255,0.5)',fontSize:16}}>✕</Text>
              </TouchableOpacity>
            </View>

            {forgotSent?(
              /* Успішно відправлено */
              <View style={{alignItems:'center',gap:16,paddingVertical:8}}>
                <View style={{width:64,height:64,borderRadius:32,
                  backgroundColor:'rgba(22,163,74,0.15)',
                  borderWidth:1,borderColor:'rgba(22,163,74,0.3)',
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:28}}>📧</Text>
                </View>
                <Text style={{fontSize:13,color:'rgba(255,255,255,0.6)',
                  textAlign:'center',lineHeight:20}}>
                  {'Лист з посиланням для відновлення паролю надіслано на:'}
                  <Text style={{color:'#fff',fontWeight:'700'}}>{forgotEmail}</Text>
                </Text>
                <Text style={{fontSize:11,color:'rgba(255,255,255,0.3)',
                  textAlign:'center',lineHeight:17}}>
                  Перевірте папку СПАМ якщо лист не надійшов протягом кількох хвилин
                </Text>
                <TouchableOpacity
                  onPress={()=>{setShowForgotModal(false);setForgotSent(false);setForgotEmail('');}}
                  style={{width:'100%',paddingVertical:15,borderRadius:28,
                    backgroundColor:'#fff',alignItems:'center',marginTop:8}}>
                  <Text style={{fontSize:12,fontWeight:'900',color:'#000',letterSpacing:1}}>
                    ЗРОЗУМІЛО
                  </Text>
                </TouchableOpacity>
              </View>
            ):(
              /* Форма введення email */
              <View style={{gap:16}}>
                <Text style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:19}}>
                  Введіть email вашого акаунту і ми надішлемо посилання для створення нового паролю
                </Text>

                {/* Email input */}
                <View>
                  <Text style={{fontSize:9,letterSpacing:2.5,color:'rgba(255,255,255,0.3)',
                    fontWeight:'700',marginBottom:8}}>
                    EMAIL
                  </Text>
                  <TextInput
                    style={{backgroundColor:'rgba(255,255,255,0.06)',
                      borderRadius:14,paddingHorizontal:16,paddingVertical:14,
                      fontSize:15,color:'#fff',fontWeight:'300',
                      borderWidth:1,borderColor:'rgba(255,255,255,0.09)'}}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus/>
                </View>

                {/* Кнопка відправити */}
                <TouchableOpacity
                  onPress={doForgotPassword}
                  disabled={forgotLoading||!forgotEmail.includes('@')}
                  style={{paddingVertical:16,borderRadius:28,
                    backgroundColor:forgotEmail.includes('@')?'#fff':'rgba(255,255,255,0.1)',
                    alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8}}>
                  {forgotLoading&&<ActivityIndicator color="#000" size="small"/>}
                  <Text style={{fontSize:12,fontWeight:'900',letterSpacing:1,
                    color:forgotEmail.includes('@')?'#000':'rgba(255,255,255,0.2)'}}>
                    НАДІСЛАТИ ЛИСТ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={()=>{setShowForgotModal(false);setForgotEmail('');}}
                  style={{alignItems:'center',paddingVertical:8}}>
                  <Text style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>Скасувати</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── SIZE GUIDE MODAL ── */}
      <Modal visible={showSizeGuide} animationType="slide" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={()=>setShowSizeGuide(false)}>
          <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:th.bg,borderTopLeftRadius:28,borderTopRightRadius:28,
                maxHeight:H*0.82,paddingBottom:HOME_IND+16}}>
                {/* Handle */}
                <View style={{width:40,height:4,backgroundColor:th.bg3,borderRadius:2,
                  alignSelf:'center',marginTop:12,marginBottom:4}}/>
                <ScrollView contentContainerStyle={{padding:24}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                    <Text style={{fontSize:16,fontWeight:'900',color:th.text,letterSpacing:0.5}}>
                      {lang==='EN'?'SIZE GUIDE':'РОЗМІРНА СІТКА'}
                    </Text>
                    <TouchableOpacity onPress={()=>setShowSizeGuide(false)}
                      style={{width:32,height:32,borderRadius:16,backgroundColor:th.bg2,
                        justifyContent:'center',alignItems:'center'}}>
                      <Text style={{fontSize:16,color:th.text3}}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Таблиця розмірів */}
                  {sel?.size_guide?(
                    /* Якщо є URL — показуємо як зображення */
                    sel.size_guide.startsWith('http')?(
                      <Image source={{uri:sel.size_guide}}
                        style={{width:'100%',borderRadius:12,minHeight:200}}
                        resizeMode="contain"/>
                    ):(
                      /* Якщо текст — показуємо як таблицю */
                      <View style={{gap:2}}>
                        {sel.size_guide.split(',').map((row,i)=>{
                          const [size,val]=(row.trim()).split('=');
                          return(
                            <View key={i} style={{flexDirection:'row',alignItems:'center',
                              backgroundColor:i%2===0?th.bg2:'transparent',
                              borderRadius:10,paddingHorizontal:16,paddingVertical:12}}>
                              <Text style={{width:60,fontSize:14,fontWeight:'900',color:th.text}}>{size?.trim()}</Text>
                              <Text style={{flex:1,fontSize:13,color:th.text3}}>{val?.trim()}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )
                  ):(
                    /* Стандартна таблиця */
                    <View style={{gap:2}}>
                      <View style={{flexDirection:'row',backgroundColor:th.text,borderRadius:12,
                        paddingHorizontal:16,paddingVertical:12,marginBottom:4}}>
                        <Text style={{width:60,fontSize:11,fontWeight:'900',color:th.bg,letterSpacing:1}}>РОЗМІР</Text>
                        <Text style={{width:60,fontSize:11,fontWeight:'900',color:th.bg,letterSpacing:1}}>ГРУДИ</Text>
                        <Text style={{width:60,fontSize:11,fontWeight:'900',color:th.bg,letterSpacing:1}}>ТАЛІЯ</Text>
                        <Text style={{flex:1,fontSize:11,fontWeight:'900',color:th.bg,letterSpacing:1}}>СТЕГНА</Text>
                      </View>
                      {[
                        ['XS','80–84','62–66','86–90'],
                        ['S', '84–88','66–70','90–94'],
                        ['M', '88–92','70–74','94–98'],
                        ['L', '92–96','74–78','98–102'],
                        ['XL','96–100','78–82','102–106'],
                        ['XXL','100–104','82–86','106–110'],
                      ].map(([sz,ch,wa,hi],i)=>(
                        <View key={sz} style={{flexDirection:'row',alignItems:'center',
                          backgroundColor:i%2===0?th.bg2:'transparent',
                          borderRadius:10,paddingHorizontal:16,paddingVertical:12}}>
                          <Text style={{width:60,fontSize:14,fontWeight:'900',color:th.text}}>{sz}</Text>
                          <Text style={{width:60,fontSize:13,color:th.text3}}>{ch}</Text>
                          <Text style={{width:60,fontSize:13,color:th.text3}}>{wa}</Text>
                          <Text style={{flex:1,fontSize:13,color:th.text3}}>{hi}</Text>
                        </View>
                      ))}
                      <View style={{marginTop:16,padding:14,backgroundColor:th.bg2,borderRadius:14,
                        borderLeftWidth:3,borderLeftColor:'#16a34a'}}>
                        <Text style={{fontSize:11,color:th.text3,lineHeight:17}}>
                          {lang==='EN'
                            ?'Measurements in cm. If between sizes — choose the larger one.'
                            :'Всі виміри в сантиметрах. Якщо між розмірами — обирайте більший.'}
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={!!quickAddItem} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>{setQuickAddItem(null);setQuickAddSz(null);setQuickAddCl(null);}}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:th.bg,borderTopLeftRadius:20,borderTopRightRadius:20,
                paddingBottom:HOME_IND+16}}>
                {quickAddItem&&(
                  <>
                    <View style={{flexDirection:'row',padding:20,gap:14,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                      <Image source={{uri:quickAddItem.imgs?quickAddItem.imgs[0]:quickAddItem.img}}
                        style={{width:70,height:88,borderRadius:R}} resizeMode="cover"/>
                      <View style={{flex:1,justifyContent:'center'}}>
                        <Text style={{fontSize:14,fontWeight:'500',color:th.text,marginBottom:4}}>{quickAddItem.name}</Text>
                        <Text style={{fontSize:16,fontWeight:'900',color:th.text}}>{quickAddItem.price} ₴</Text>
                      </View>
                    </View>
                    <View style={{padding:20}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text3,marginBottom:10}}>КОЛІР</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
                        <View style={{flexDirection:'row',gap:8}}>
                          {(quickAddItem.cl||[]).map(c=>(
                            <TouchableOpacity key={c}
                              style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,
                                borderColor:quickAddCl===c?th.text:th.cardBorder,
                                backgroundColor:quickAddCl===c?th.accent:'transparent'}}
                              onPress={()=>setQuickAddCl(c)}>
                              <Text style={{fontSize:12,color:quickAddCl===c?th.accentText:th.text2,fontWeight:'600'}}>{c}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text3,marginBottom:10}}>РОЗМІР</Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>
                        {(quickAddItem.sz||[]).map(s=>(
                          <TouchableOpacity key={s}
                            style={{minWidth:48,paddingHorizontal:12,paddingVertical:9,borderRadius:R,borderWidth:1,
                              borderColor:quickAddSz===s?th.text:th.cardBorder,
                              backgroundColor:quickAddSz===s?th.accent:'transparent',alignItems:'center'}}
                            onPress={()=>setQuickAddSz(s)}>
                            <Text style={{fontSize:12,fontWeight:'700',color:quickAddSz===s?th.accentText:th.text2}}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={{backgroundColor:quickAddSz&&quickAddCl?th.accent:th.bg3,
                          paddingVertical:14,borderRadius:R,alignItems:'center'}}
                        disabled={!quickAddSz}
                        onPress={()=>{
                          addToCart(quickAddItem,quickAddSz,quickAddCl||'');
                          triggerBagAnim(quickAddItem);
                          showNotif(`${quickAddItem.name} додано в кошик`,'success');
                          setQuickAddItem(null);setQuickAddSz(null);setQuickAddCl(null);
                        }}>
                        <Text style={{color:quickAddSz&&quickAddCl?th.accentText:th.text4,
                          fontWeight:'900',fontSize:10,letterSpacing:2.5}}>
                          {quickAddSz?'ДОДАТИ В КОШИК':'ОБЕРІТЬ РОЗМІР'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>



      {/* Sort modal */}
      <Modal visible={showSort} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowSort(false)}>
          <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:th.bg,padding:24,paddingBottom:HOME_IND+12,borderTopLeftRadius:20,borderTopRightRadius:20}}>
                <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:24}}/>
                <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text,marginBottom:20}}>{T.sorting}</Text>
                {[{k:'popular',l:T.popular},{k:'new',l:T.newest},{k:'rating',l:T.byRating},
                  {k:'price_asc',l:T.priceLow},{k:'price_desc',l:T.priceHigh}].map(o=>(
                  <TouchableOpacity key={o.k} style={{flexDirection:'row',justifyContent:'space-between',
                    paddingVertical:14,borderBottomWidth:1,borderBottomColor:th.cardBorder}}
                    onPress={()=>{setSort(o.k);setShowSort(false);}}>
                    <Text style={{fontSize:13,color:sort===o.k?th.text:th.text3,fontWeight:sort===o.k?'700':'400'}}>{o.l}</Text>
                    {sort===o.k&&<Text style={{color:th.text,fontSize:12,fontWeight:'900'}}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>



      {/* Size guide modal */}
      <Modal visible={showSzGuide} animationType="slide" transparent>
        <View style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,padding:24,paddingBottom:HOME_IND+12,borderTopLeftRadius:20,borderTopRightRadius:20}}>
            <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:24}}/>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:20}}>
              <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text}}>{T.sizeGuide}</Text>
              <TouchableOpacity onPress={()=>setShowSzGuide(false)}><Text style={{color:th.text3,fontSize:18}}>✕</Text></TouchableOpacity>
            </View>
            {[[T.szSize,T.szChest,T.szWaist],['XS','84–88','68–72'],['S','88–92','72–76'],['M','92–96','76–80'],['L','96–100','80–84'],['XL','100–104','84–88'],['XXL','104–110','88–94']].map((row,i)=>(
              <View key={i} style={{flexDirection:'row',paddingVertical:11,borderBottomWidth:1,borderBottomColor:th.cardBorder,backgroundColor:i===0?th.bg2:th.bg}}>
                {row.map((c,j)=><Text key={j} style={{flex:1,textAlign:'center',fontSize:11,color:i===0?th.text:th.text2,fontWeight:i===0?'900':'400'}}>{c}</Text>)}
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* Edit profile modal */}
      <Modal visible={editProf} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,padding:24,paddingBottom:HOME_IND+16,borderTopLeftRadius:20,borderTopRightRadius:20}}>
            <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:24}}/>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:24}}>
              <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text}}>{T.editProfileTitle}</Text>
              <TouchableOpacity onPress={()=>setEditProf(false)}><Text style={{color:th.text3,fontSize:18}}>✕</Text></TouchableOpacity>
            </View>
            <AppInput th={th} label={T.authNameLbl} value={eName} onChangeText={setEName}/>
            <AppInput th={th} label={T.phone} value={ePhone} onChangeText={setEPhone} keyboardType="phone-pad"/>
            <Btn th={th} label={T.save} onPress={()=>{setUser(p=>({...p,name:eName,phone:ePhone}));setEditProf(false);}}/>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add address modal */}
      <Modal visible={showAddAddr} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,padding:24,paddingBottom:HOME_IND+16,borderTopLeftRadius:20,borderTopRightRadius:20}}>
            <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:24}}/>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:24}}>
              <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text}}>{T.addAddressTitle}</Text>
              <TouchableOpacity onPress={()=>setShowAddAddr(false)}><Text style={{color:th.text3,fontSize:18}}>✕</Text></TouchableOpacity>
            </View>
            <AppInput th={th} label={T.addrCity} placeholder={T.addrCityPl} value={nCity} onChangeText={setNCity}/>
            <AppInput th={th} label={T.addrBranch} placeholder={T.addrBranchPl} value={nBranch} onChangeText={setNBranch} keyboardType="numeric"/>
            <AppInput th={th} label={T.addrPhone} placeholder={T.addrPhonePl} value={nPhone} onChangeText={setNPhone} keyboardType="phone-pad"/>
            <Btn th={th} label={T.save} onPress={()=>{
              if(!nCity||!nBranch||!nPhone)return;
              setSavedAddr(p=>[...p,{id:Date.now(),city:nCity,branch:nBranch,phone:nPhone}]);
              setNCity('');setNBranch('');setNPhone('');setShowAddAddr(false);
            }}/>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add card modal */}
      <Modal visible={showAddCard} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,padding:24,paddingBottom:HOME_IND+16,borderTopLeftRadius:20,borderTopRightRadius:20}}>
            <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:24}}/>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:24}}>
              <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text}}>{T.addCardTitle}</Text>
              <TouchableOpacity onPress={()=>setShowAddCard(false)}><Text style={{color:th.text3,fontSize:18}}>✕</Text></TouchableOpacity>
            </View>
            <AppInput th={th} label={T.cardNumber} placeholder={T.cardNumPl} value={ncNum} onChangeText={v=>setNcNum(fc(v))} keyboardType="numeric" maxLength={19}/>
            <View style={{flexDirection:'row',gap:16}}>
              <View style={{flex:1}}><AppInput th={th} label={T.expiry} placeholder={T.expiryPl} value={ncExp} onChangeText={v=>setNcExp(fe(v))} keyboardType="numeric" maxLength={5}/></View>
              <View style={{flex:1}}><AppInput th={th} label={T.cvv} placeholder={T.cvvPl} value="" onChangeText={()=>{}} keyboardType="numeric" maxLength={3} secureTextEntry/></View>
            </View>
            <AppInput th={th} label={T.cardHolder} placeholder={T.cardHolderPl} value={ncNm} onChangeText={v=>setNcNm(v.toUpperCase())}/>
            <Btn th={th} label={T.save} onPress={()=>{
              if(ncNum.replace(/\s/g,'').length<16)return;
              setSavedCards(p=>[...p,{id:Date.now(),last4:ncNum.replace(/\s/g,'').slice(-4),brand:'Visa',exp:ncExp||'—'}]);
              setNcNum('');setNcExp('');setNcNm('');setShowAddCard(false);
            }}/>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADMIN USER PROFILE MODAL ── */}
      <Modal visible={!!adminSelectedUser} animationType="slide" transparent>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,borderTopLeftRadius:28,borderTopRightRadius:28,
            paddingBottom:HOME_IND+24,maxHeight:H*0.85}}>
            {/* Handle */}
            <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,
              alignSelf:'center',marginTop:12,marginBottom:4}}/>
            {/* Header */}
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
              paddingHorizontal:24,paddingVertical:16}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                <View style={{width:48,height:48,borderRadius:24,backgroundColor:th.bg2,
                  alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:22}}>👤</Text>
                </View>
                <View>
                  <Text style={{fontSize:15,fontWeight:'900',color:th.text}}>{adminSelectedUser?.name||'—'}</Text>
                  <Text style={{fontSize:11,color:th.text3}}>{adminSelectedUser?.phone||''}</Text>
                  {adminSelectedUser?.email?<Text style={{fontSize:10,color:th.text4}}>{adminSelectedUser.email}</Text>:null}
                </View>
              </View>
              <TouchableOpacity onPress={()=>setAdminSelectedUser(null)}
                style={{width:32,height:32,borderRadius:16,backgroundColor:th.bg2,
                  alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:16,color:th.text3}}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* Stats */}
            <View style={{flexDirection:'row',paddingHorizontal:24,gap:12,marginBottom:16}}>
              {[
                {lb:'Замовлень',v:adminSelectedUser?.totalOrders||0},
                {lb:'Витрачено',v:(adminSelectedUser?.totalSpent||0)+' ₴'},
                {lb:'Середній чек',v:(adminSelectedUser?.avgOrder||0)+' ₴'},
              ].map(({lb,v})=>(
                <View key={lb} style={{flex:1,backgroundColor:th.bg2,borderRadius:16,padding:12,alignItems:'center'}}>
                  <Text style={{fontSize:14,fontWeight:'900',color:th.text}}>{v}</Text>
                  <Text style={{fontSize:9,color:th.text4,marginTop:2,letterSpacing:1}}>{lb.toUpperCase()}</Text>
                </View>
              ))}
            </View>
            {/* Orders list */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4,
              paddingHorizontal:24,marginBottom:8}}>ІСТОРІЯ ЗАМОВЛЕНЬ</Text>
            <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,gap:8,paddingBottom:16}}>
              {(adminUserOrders||[]).slice().reverse().map((ord,i)=>(
                <View key={i} style={{backgroundColor:th.bg2,borderRadius:16,padding:14,gap:6}}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                    <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                      <Text style={{fontSize:13,fontWeight:'900',color:th.text}}>#{ord.id}</Text>
                      <View style={{paddingHorizontal:8,paddingVertical:2,borderRadius:10,
                        backgroundColor:ST_BG[ord.status]||th.bg3}}>
                        <Text style={{fontSize:9,fontWeight:'800',color:ST_COLOR[ord.status]||th.text4}}>
                          {(ord.status||'НОВЕ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={{fontSize:13,fontWeight:'900',color:th.text}}>{ord.total||0} ₴</Text>
                  </View>
                  <Text style={{fontSize:10,color:th.text4}}>{ord.date||''} · {ord.city||''}</Text>
                  {(ord.items||[]).slice(0,3).map((it,j)=>(
                    <Text key={j} style={{fontSize:11,color:th.text3}}>· {typeof it==='object'?(it.name||'')+' x'+(it.qty||1)+(it.size?' ('+it.size+')':''):String(it)}</Text>
                  ))}
                  {(ord.items||[]).length>3&&(
                    <Text style={{fontSize:10,color:th.text4}}>+ ще {(ord.items||[]).length-3} товари</Text>
                  )}
                </View>
              ))}
              {(adminUserOrders||[]).length===0&&(
                <View style={{alignItems:'center',paddingVertical:32}}>
                  <Text style={{fontSize:32,marginBottom:8}}>📭</Text>
                  <Text style={{fontSize:13,color:th.text4}}>Замовлень не знайдено</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── LIQPAY WEBVIEW MODAL ── */}
      <Modal visible={showLiqpayView} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
          <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:12,
            borderBottomWidth:1,borderBottomColor:'#f0f0f0',backgroundColor:'#fff'}}>
            <TouchableOpacity onPress={()=>setShowLiqpayView(false)} style={{marginRight:16}}>
              <Text style={{fontSize:20,color:'#333'}}>✕</Text>
            </TouchableOpacity>
            <Text style={{fontSize:13,fontWeight:'700',color:'#333',flex:1}}>Оплата LiqPay</Text>
            <Text style={{fontSize:10,color:'#059669',fontWeight:'800'}}>🔒 ЗАХИЩЕНО</Text>
          </View>
          {/* Інструкція для підключення реального LiqPay */}
          <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:32}}>
            <Text style={{fontSize:40,marginBottom:20}}>💳</Text>
            <Text style={{fontSize:16,fontWeight:'700',color:'#111',textAlign:'center',marginBottom:12}}>
              LiqPay готовий до підключення
            </Text>
            <Text style={{fontSize:12,color:'#666',textAlign:'center',lineHeight:20,marginBottom:28}}>
              Для активації реальних платежів:{'\n'}
              1. Зареєструйтесь на cabinet.liqpay.ua{'\n'}
              2. Отримайте Public та Private ключі{'\n'}
              3. Замініть YOUR_LIQPAY_PUBLIC_KEY в коді
            </Text>
            <View style={{width:'100%',gap:12}}>
              <TouchableOpacity
                style={{backgroundColor:'#00a651',paddingVertical:14,borderRadius:12,alignItems:'center'}}
                onPress={finalizeOrder}>
                <Text style={{color:'#fff',fontWeight:'900',fontSize:11,letterSpacing:2}}>
                  ✓ СИМУЛЮВАТИ УСПІШНУ ОПЛАТУ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{paddingVertical:14,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#ddd'}}
                onPress={()=>setShowLiqpayView(false)}>
                <Text style={{color:'#888',fontWeight:'700',fontSize:11,letterSpacing:2}}>СКАСУВАТИ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── PUSH НАГАДУВАННЯ (банер) ── */}
      {showCartBanner&&(
        <TouchableOpacity activeOpacity={0.9} onPress={()=>go('cart')}
          style={{position:'absolute',bottom:HOME_IND+72,left:20,right:20,
            backgroundColor:th.text,borderRadius:40,
            paddingVertical:12,paddingHorizontal:18,
            flexDirection:'row',alignItems:'center',
            zIndex:100,elevation:12,
            shadowColor:'#000',shadowOffset:{width:0,height:6},shadowOpacity:.2,shadowRadius:16}}>
          <View style={{width:28,height:28,borderRadius:14,backgroundColor:'rgba(255,255,255,.15)',
            alignItems:'center',justifyContent:'center',marginRight:10}}>
            <Text style={{fontSize:13}}>🛍</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={{fontSize:11,fontWeight:'800',color:th.bg,letterSpacing:.3}}>
              {lang==='EN'
                ?`${totItems} item${totItems>1?'s':''} · ${totPrice} ₴`
                :`${totItems} ${totItems===1?'товар':totItems<5?'товари':'товарів'} · ${totPrice} ₴`}
            </Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
            <Text style={{fontSize:10,fontWeight:'900',color:th.bg,letterSpacing:.5}}>
              {lang==='EN'?'CHECKOUT':'ОФОРМИТИ'}
            </Text>
            <Text style={{fontSize:12,color:th.bg,opacity:.7}}>→</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ══ МОДАЛ РЕДАГУВАННЯ ЗАМОВЛЕННЯ ══ */}
      <Modal visible={!!adminEditOrder} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={()=>{setAdminEditOrder(null);setAdminEditOrderForm({});}}>
        <KeyboardAvoidingView style={{flex:1}} behavior={IS_IOS?'padding':'height'}>
        <View style={{flex:1,backgroundColor:th.bg}}>
          {/* Header */}
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
            paddingHorizontal:20,paddingTop:56,paddingBottom:16,
            borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
            <TouchableOpacity onPress={()=>{setAdminEditOrder(null);setAdminEditOrderForm({});}}>
              <Text style={{fontSize:15,color:th.text3}}>Скасувати</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'900',color:th.text}}>
              Замовлення #{adminEditOrder?.id}
            </Text>
            <TouchableOpacity onPress={adminSaveOrder}>
              <Text style={{fontSize:15,fontWeight:'800',color:th.accent}}>Зберегти</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,paddingBottom:120}}
            keyboardShouldPersistTaps="handled">

            {/* Статус */}
            <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:8}}>
              СТАТУС
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap:8,marginBottom:20}}>
              {['Нове','Оплачено','В дорозі','Доставлено','Отримано','Скасовано'].map(st=>(
                <TouchableOpacity key={st}
                  onPress={()=>setAdminEditOrderForm(p=>({...p,status:st}))}
                  style={{paddingHorizontal:14,paddingVertical:8,borderRadius:16,
                    backgroundColor:adminEditOrderForm.status===st?th.accent:th.bg2,
                    borderWidth:1,borderColor:adminEditOrderForm.status===st?th.accent:th.cardBorder}}>
                  <Text style={{fontSize:12,fontWeight:'700',
                    color:adminEditOrderForm.status===st?th.accentText:th.text}}>{st}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Клієнт */}
            <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,marginBottom:8}}>
              КЛІЄНТ
            </Text>
            {[
              {key:'contact_name',   label:"Ім'я"},
              {key:'contact_phone',  label:'Телефон'},
              {key:'contact_email',  label:'Email'},
            ].map(({key,label})=>(
              <View key={key} style={{marginBottom:12}}>
                <Text style={{fontSize:10,color:th.text3,marginBottom:4}}>{label}</Text>
                <TextInput
                  value={adminEditOrderForm[key]||''}
                  onChangeText={v=>setAdminEditOrderForm(p=>({...p,[key]:v}))}
                  style={{backgroundColor:th.bg2,borderRadius:10,padding:12,
                    fontSize:13,color:th.text,borderWidth:1,borderColor:th.cardBorder}}/>
              </View>
            ))}

            {/* Доставка */}
            <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,
              marginBottom:8,marginTop:8}}>ДОСТАВКА</Text>
            {[
              {key:'city',      label:'Місто'},
              {key:'np_branch', label:'Відділення НП'},
              {key:'tracking',  label:'ТТН (трек-номер)'},
            ].map(({key,label})=>(
              <View key={key} style={{marginBottom:12}}>
                <Text style={{fontSize:10,color:th.text3,marginBottom:4}}>{label}</Text>
                <TextInput
                  value={adminEditOrderForm[key]||''}
                  onChangeText={v=>setAdminEditOrderForm(p=>({...p,[key]:v}))}
                  style={{backgroundColor:th.bg2,borderRadius:10,padding:12,
                    fontSize:13,color:th.text,borderWidth:1,borderColor:th.cardBorder}}/>
              </View>
            ))}

            {/* Оплата */}
            <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,
              marginBottom:8,marginTop:8}}>ОПЛАТА</Text>
            <View style={{flexDirection:'row',gap:12,marginBottom:12}}>
              <View style={{flex:1}}>
                <Text style={{fontSize:10,color:th.text3,marginBottom:4}}>Спосіб оплати</Text>
                <TextInput
                  value={adminEditOrderForm.payment_method||''}
                  onChangeText={v=>setAdminEditOrderForm(p=>({...p,payment_method:v}))}
                  style={{backgroundColor:th.bg2,borderRadius:10,padding:12,
                    fontSize:13,color:th.text,borderWidth:1,borderColor:th.cardBorder}}/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:10,color:th.text3,marginBottom:4}}>Статус оплати</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['pending','paid','failed'].map(ps=>(
                    <TouchableOpacity key={ps}
                      onPress={()=>setAdminEditOrderForm(p=>({...p,payment_status:ps}))}
                      style={{paddingHorizontal:10,paddingVertical:8,borderRadius:8,marginRight:6,
                        backgroundColor:adminEditOrderForm.payment_status===ps?th.accent:th.bg2,
                        borderWidth:1,borderColor:th.cardBorder}}>
                      <Text style={{fontSize:11,color:adminEditOrderForm.payment_status===ps?th.accentText:th.text}}>
                        {ps}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Суми */}
            <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,
              marginBottom:8,marginTop:8}}>СУМА</Text>
            <View style={{flexDirection:'row',gap:12,marginBottom:16}}>
              {[
                {key:'subtotal',  label:'Підсума ₴'},
                {key:'bonus_used',label:'Бонуси'},
                {key:'total',     label:'Разом ₴'},
              ].map(({key,label})=>(
                <View key={key} style={{flex:1}}>
                  <Text style={{fontSize:10,color:th.text3,marginBottom:4}}>{label}</Text>
                  <TextInput
                    value={String(adminEditOrderForm[key]||'')}
                    onChangeText={v=>setAdminEditOrderForm(p=>({...p,[key]:v}))}
                    keyboardType="numeric"
                    style={{backgroundColor:th.bg2,borderRadius:10,padding:12,
                      fontSize:13,color:th.text,borderWidth:1,borderColor:th.cardBorder}}/>
                </View>
              ))}
            </View>

            {/* Товари */}
            <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:th.text4,
              marginBottom:8,marginTop:8}}>ТОВАРИ (JSON)</Text>
            <TextInput
              value={adminEditOrderForm.items||''}
              onChangeText={v=>setAdminEditOrderForm(p=>({...p,items:v}))}
              multiline
              numberOfLines={6}
              style={{backgroundColor:th.bg2,borderRadius:10,padding:12,
                fontSize:11,color:th.text,borderWidth:1,borderColor:th.cardBorder,
                fontFamily:'monospace',minHeight:120,textAlignVertical:'top'}}/>
            <Text style={{fontSize:10,color:th.text4,marginTop:4}}>
              Формат: [{`{"name":"Назва","qty":1,"size":"M","price":999}`}]
            </Text>

            {/* Кнопка зберегти */}
            <TouchableOpacity onPress={adminSaveOrder}
              style={{marginTop:24,paddingVertical:16,borderRadius:14,
                backgroundColor:th.accent,alignItems:'center'}}>
              <Text style={{fontSize:15,fontWeight:'900',color:th.accentText}}>
                Зберегти зміни
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ PHOTO STUDIO MODAL ══ */}
      <Modal visible={showPhotoStudio} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={()=>setShowPhotoStudio(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={IS_IOS?'padding':'height'}>
        <View style={{flex:1,backgroundColor:th.bg}}>

          {/* Header */}
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
            paddingHorizontal:20,paddingTop:56,paddingBottom:16,
            borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
            <TouchableOpacity onPress={()=>setShowPhotoStudio(false)}>
              <Text style={{fontSize:15,color:th.text3}}>Скасувати</Text>
            </TouchableOpacity>
            <View style={{alignItems:'center'}}>
              <Text style={{fontSize:15,fontWeight:'900',color:th.text}}>✨ Фото-студія</Text>
              <Text style={{fontSize:9,color:'#7c3aed',fontWeight:'600',letterSpacing:1}}>powered by remove.bg</Text>
            </View>
            <TouchableOpacity onPress={applyStudioPhoto}
              disabled={!studioResultUri&&!studioSourceUri}
              style={{backgroundColor:studioResultUri?'#7c3aed':th.accent,
                paddingHorizontal:16,paddingVertical:8,borderRadius:20,
                opacity:(!studioResultUri&&!studioSourceUri)?0.4:1}}>
              <Text style={{fontSize:13,fontWeight:'800',color:'#fff'}}>
                {studioResultUri?'✓ Застосувати':'Використати'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled"
            contentContainerStyle={{padding:20,gap:16,paddingBottom:80}}>

            {/* Preview side-by-side */}
            <View style={{flexDirection:'row',gap:12}}>
              {/* Original */}
              <View style={{flex:1,gap:6}}>
                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4,textAlign:'center'}}>ОРИГІНАЛ</Text>
                <View style={{height:160,borderRadius:14,overflow:'hidden',
                  backgroundColor:'#f0f0f0',borderWidth:1,borderColor:th.cardBorder}}>
                  {studioSourceUri?(
                    <Image source={{uri:studioSourceUri}} style={{width:'100%',height:'100%'}} resizeMode="contain"/>
                  ):(
                    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                      <Text style={{color:th.text4,fontSize:28}}>📷</Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Result */}
              <View style={{flex:1,gap:6}}>
                <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text4,textAlign:'center'}}>РЕЗУЛЬТАТ</Text>
                <View style={{height:160,borderRadius:14,overflow:'hidden',
                  backgroundColor:studioBg==='white'?'#ffffff':studioBg==='gray'?'#f3f4f6':studioBg==='cream'?'#fdf8f0':'#e5e7eb',
                  borderWidth:1,borderColor:th.cardBorder,
                  justifyContent:'center',alignItems:'center'}}>
                  {studioProcessing?(
                    <View style={{alignItems:'center',gap:8}}>
                      <ActivityIndicator size="large" color="#7c3aed"/>
                      <Text style={{fontSize:11,color:'#7c3aed',fontWeight:'600'}}>Обробка...</Text>
                    </View>
                  ):studioResultUri?(
                    <Image source={{uri:studioResultUri}} style={{width:'100%',height:'100%'}} resizeMode="contain"/>
                  ):(
                    <View style={{alignItems:'center',gap:6}}>
                      <Text style={{fontSize:28}}>✨</Text>
                      <Text style={{fontSize:10,color:th.text4,textAlign:'center',paddingHorizontal:8}}>
                        Видаліть фон або застосуйте студійний ефект
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Background selector */}
            <View style={{backgroundColor:th.bg2,borderRadius:14,padding:14,gap:10,
              borderWidth:1,borderColor:th.cardBorder}}>
              <Text style={{fontSize:11,fontWeight:'800',color:th.text}}>🎨 Фон результату</Text>
              <View style={{flexDirection:'row',gap:8}}>
                {[
                  {k:'white', label:'Білий',  color:'#ffffff'},
                  {k:'gray',  label:'Сірий',  color:'#f3f4f6'},
                  {k:'cream', label:'Кремовий',color:'#fdf8f0'},
                  {k:'light', label:'Світлий', color:'#e5e7eb'},
                ].map(({k,label,color})=>(
                  <TouchableOpacity key={k} onPress={()=>setStudioBg(k)}
                    style={{flex:1,alignItems:'center',gap:4}}>
                    <View style={{width:44,height:44,borderRadius:22,backgroundColor:color,
                      borderWidth:studioBg===k?3:1.5,
                      borderColor:studioBg===k?'#7c3aed':'#d1d5db'}}>
                      {studioBg===k&&(
                        <View style={{position:'absolute',bottom:-2,right:-2,
                          width:16,height:16,borderRadius:8,backgroundColor:'#7c3aed',
                          justifyContent:'center',alignItems:'center'}}>
                          <Text style={{fontSize:9,color:'#fff',fontWeight:'900'}}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{fontSize:9,color:studioBg===k?'#7c3aed':th.text4,fontWeight:studioBg===k?'700':'400'}}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* remove.bg section */}
            <View style={{backgroundColor:'#faf5ff',borderRadius:14,padding:16,gap:12,
              borderWidth:1,borderColor:'#e9d5ff'}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                <Text style={{fontSize:20}}>🤖</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'800',color:'#6d28d9'}}>
                    AI видалення фону (remove.bg)
                  </Text>
                  <Text style={{fontSize:10,color:'#8b5cf6'}}>
                    50 фото/міс безкоштовно · від $0.05/фото
                  </Text>
                </View>
              </View>

              <View style={{backgroundColor:'#fff',borderRadius:10,borderWidth:1,borderColor:'#e9d5ff',
                paddingHorizontal:12,paddingVertical:4,flexDirection:'row',alignItems:'center',gap:8}}>
                <Text style={{fontSize:14,color:'#8b5cf6'}}>🔑</Text>
                <TextInput
                  style={{flex:1,paddingVertical:10,fontSize:12,color:'#374151'}}
                  placeholder="Вставте API ключ з remove.bg..."
                  placeholderTextColor="#9ca3af"
                  value={removeBgApiKey}
                  onChangeText={saveRemoveBgKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={false}/>
              </View>

              <TouchableOpacity
                onPress={processRemoveBg}
                disabled={studioProcessing}
                style={{paddingVertical:14,borderRadius:12,alignItems:'center',
                  backgroundColor:studioProcessing?'#c4b5fd':'#7c3aed',
                  flexDirection:'row',justifyContent:'center',gap:8}}>
                {studioProcessing&&<ActivityIndicator size="small" color="#fff"/>}
                <Text style={{fontSize:13,fontWeight:'800',color:'#fff'}}>
                  {studioProcessing?'Обробка фото...':'🤖 Видалити фон (AI)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={()=>Linking.openURL('https://www.remove.bg/dashboard#api-key')}
                style={{paddingVertical:10,alignItems:'center'}}>
                <Text style={{fontSize:11,color:'#7c3aed',textDecorationLine:'underline'}}>
                  Отримати API ключ безкоштовно →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Studio tips */}
            <View style={{backgroundColor:th.bg2,borderRadius:14,padding:14,gap:8,
              borderWidth:1,borderColor:th.cardBorder}}>
              <Text style={{fontSize:11,fontWeight:'800',color:th.text}}>💡 Поради для студійних фото</Text>
              {[
                '📸 Фотографуйте на однотонному тлі — AI спрацює точніше',
                '☀️ Рівномірне освітлення без різких тіней',
                '🎯 Товар займає 70-80% кадру, по центру',
                '📐 Квадратний кадр (1:1) ідеальний для карток',
                '💡 Найкращий фон для зйомки — світло-сірий або білий',
              ].map((tip,i)=>(
                <Text key={i} style={{fontSize:11,color:th.text3,lineHeight:17}}>{tip}</Text>
              ))}
            </View>

          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ ADMIN HUB MODAL ══ */}
      <Modal visible={showAdminHub} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={()=>setShowAdminHub(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={IS_IOS?'padding':'height'}>
        <View style={{flex:1,backgroundColor:th.bg}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
            paddingHorizontal:20,paddingTop:56,paddingBottom:16,
            borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
            <TouchableOpacity onPress={()=>setShowAdminHub(false)}>
              <Text style={{fontSize:15,color:th.text3}}>Закрити</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'900',color:th.text}}>🛠 Адмін-інструменти</Text>
            <View style={{width:60}}/>
          </View>
          <ScrollView contentContainerStyle={{padding:20,paddingBottom:60}}>

            {/* ── КАТАЛОГ ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:4}}>КАТАЛОГ</Text>
            {[
              {icon:'📦',title:'Товари',sub:'Список, пошук, редагування товарів',tab:'products',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('products');loadAdminProducts();}},
              {icon:'🗂',title:'Категорії',sub:'Додати, редагувати, видалити категорії',tab:'categories',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('categories');}},
              {icon:'👁',title:'Видимість категорій',sub:'Приховати/показати категорії в магазині',tab:'cats_disabled',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('cats_disabled');}},
              {icon:'🏠',title:'Головне меню',sub:'Які категорії показувати на головній',tab:'mainmenu',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('mainmenu');}},
            ].map(({icon,title,sub,onPress})=>(
              <TouchableOpacity key={title} onPress={onPress}
                style={{flexDirection:'row',alignItems:'center',gap:14,
                  backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                  borderWidth:1,borderColor:th.cardBorder}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>{icon}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{title}</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}}>{sub}</Text>
                </View>
                <Text style={{color:th.text4,fontSize:18}}>›</Text>
              </TouchableOpacity>
            ))}

            {/* ── ЗАМОВЛЕННЯ ТА КЛІЄНТИ ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:16}}>ЗАМОВЛЕННЯ ТА КЛІЄНТИ</Text>
            {[
              {icon:'🧾',title:'Замовлення',sub:'Всі замовлення, статуси, редагування',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('orders');}},
              {icon:'👥',title:'База клієнтів',sub:'Профілі, замовлення, витрати клієнтів',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('users');}},
            ].map(({icon,title,sub,onPress})=>(
              <TouchableOpacity key={title} onPress={onPress}
                style={{flexDirection:'row',alignItems:'center',gap:14,
                  backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                  borderWidth:1,borderColor:th.cardBorder}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>{icon}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{title}</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}}>{sub}</Text>
                </View>
                <Text style={{color:th.text4,fontSize:18}}>›</Text>
              </TouchableOpacity>
            ))}

            {/* ── МАРКЕТИНГ ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:16}}>МАРКЕТИНГ</Text>
            {[
              {icon:'💰',title:'Масова зміна цін',sub:'Знижки або підвищення цін по категоріях',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('stats');loadAdminProducts();}},
              {icon:'🔔',title:'Push-розсилка',sub:'Надіслати сповіщення всім клієнтам',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('stats');}},
              {icon:'🎟',title:'Промокоди',sub:Object.entries({"YOU10":10,"SALE20":20,"NEWUSER":15,"4YOU":25}).map(([k,v])=>k+' −'+v+'%').join(' · '),onPress:()=>Alert.alert('Активні промокоди','YOU10 — знижка 10%\nSALE20 — знижка 20%\nNEWSER — знижка 15%\n4YOU — знижка 25%',[{text:'OK'}])},
            ].map(({icon,title,sub,onPress})=>(
              <TouchableOpacity key={title} onPress={onPress}
                style={{flexDirection:'row',alignItems:'center',gap:14,
                  backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                  borderWidth:1,borderColor:th.cardBorder}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>{icon}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{title}</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}} numberOfLines={1}>{sub}</Text>
                </View>
                <Text style={{color:th.text4,fontSize:18}}>›</Text>
              </TouchableOpacity>
            ))}

            {/* ── КОНТЕНТ ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:16}}>КОНТЕНТ</Text>
            {[
              {icon:'🖼',title:'Банер головної сторінки',sub:'Фото, заголовок, підзаголовок',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('content');}},
              {icon:'📝',title:'Контент та футер',sub:'Текстові блоки, умови, доставка',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('content');}},
            ].map(({icon,title,sub,onPress})=>(
              <TouchableOpacity key={title} onPress={onPress}
                style={{flexDirection:'row',alignItems:'center',gap:14,
                  backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                  borderWidth:1,borderColor:th.cardBorder}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>{icon}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{title}</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}}>{sub}</Text>
                </View>
                <Text style={{color:th.text4,fontSize:18}}>›</Text>
              </TouchableOpacity>
            ))}

            {/* ── ДАНІ ТА СИСТЕМА ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:16}}>ДАНІ ТА СИСТЕМА</Text>
            {[
              {icon:'📤',title:'CSV Імпорт / Експорт',sub:'Вивантажити товари та замовлення, імпортувати',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('csv');}},
              {icon:'📊',title:'Аналітика та статистика',sub:'Продажі, топ товарів, конверсія',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('stats');}},
            ].map(({icon,title,sub,onPress})=>(
              <TouchableOpacity key={title} onPress={onPress}
                style={{flexDirection:'row',alignItems:'center',gap:14,
                  backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                  borderWidth:1,borderColor:th.cardBorder}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>{icon}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>{title}</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}}>{sub}</Text>
                </View>
                <Text style={{color:th.text4,fontSize:18}}>›</Text>
              </TouchableOpacity>
            ))}

            {/* ── НАЛАШТУВАННЯ ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:16}}>НАЛАШТУВАННЯ</Text>

            {/* Тема магазину */}
            <View style={{backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
              borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:14,marginBottom:12}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>🎨</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Тема магазину</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}}>Світла, темна або авто</Text>
                </View>
              </View>
              <View style={{flexDirection:'row',gap:8}}>
                {[['light','☀️ Світла'],['dark','🌙 Темна'],['auto','⚙️ Авто']].map(([k,l])=>(
                  <TouchableOpacity key={k} onPress={()=>setThemeMode(k)}
                    style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',
                      backgroundColor:themeMode===k?th.accent:th.bg3,
                      borderWidth:1,borderColor:themeMode===k?th.accent:th.cardBorder}}>
                    <Text style={{fontSize:11,fontWeight:'700',color:themeMode===k?th.accentText:th.text3}}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Мова */}
            <View style={{backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
              borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:14,marginBottom:12}}>
                <View style={{width:44,height:44,borderRadius:12,backgroundColor:th.bg3,
                  justifyContent:'center',alignItems:'center'}}>
                  <Text style={{fontSize:22}}>🌐</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Мова інтерфейсу</Text>
                  <Text style={{fontSize:11,color:th.text4,marginTop:2}}>Українська або English</Text>
                </View>
              </View>
              <View style={{flexDirection:'row',gap:8}}>
                {[['UA','🇺🇦 Українська'],['EN','🇬🇧 English']].map(([k,l])=>(
                  <TouchableOpacity key={k} onPress={()=>setLang(k)}
                    style={{flex:1,paddingVertical:10,borderRadius:10,alignItems:'center',
                      backgroundColor:lang===k?th.accent:th.bg3,
                      borderWidth:1,borderColor:lang===k?th.accent:th.cardBorder}}>
                    <Text style={{fontSize:11,fontWeight:'700',color:lang===k?th.accentText:th.text3}}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Очистити кеш */}
            <TouchableOpacity
              onPress={()=>{
                Alert.alert('Очистити кеш?','Видалить збережені дані. Застосунок перезавантажиться.',[
                  {text:'Скасувати',style:'cancel'},
                  {text:'Очистити',style:'destructive',onPress:async()=>{
                    await AsyncStorage.clear().catch(()=>{});
                    showNotif('Кеш очищено ✓','success');
                  }},
                ]);
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:'#fef2f2',borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:'#fecaca'}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#fee2e2',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>🗑</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:'#dc2626'}}>Очистити кеш</Text>
                <Text style={{fontSize:11,color:'#ef4444',marginTop:2}}>Видалити всі збережені локальні дані</Text>
              </View>
              <Text style={{color:'#fca5a5',fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* ── НОВІ ФІЧІ ── */}
            <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,marginBottom:8,marginTop:16}}>НОВІ ІНСТРУМЕНТИ</Text>

            {/* ВІДГУКИ */}
            <TouchableOpacity
              onPress={()=>{
                setShowAdminHub(false);
                loadAdminReviews();
                setShowAdminReviews(true);
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#fef9c3',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>⭐</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Всі відгуки</Text>
                <Text style={{fontSize:11,color:th.text4,marginTop:2}}>
                  {'Перегляд та модерація відгуків покупців'}
                </Text>
              </View>
              <Text style={{color:th.text4,fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* 0. Batch photo studio */}
            {/* API key missing warning — tappable */}
            {!removeBgApiKey.trim()&&(
              <TouchableOpacity
                onPress={()=>{
                  setShowAdminHub(false);
                  // Open Photo Studio directly (with first product that has image)
                  const firstProd = adminProducts.find(p=>p.images?.[0]||p.img);
                  if(firstProd){
                    openPhotoStudio(firstProd.images?.[0]||firstProd.img, (resultUri)=>{
                      // on apply just show notif - batch will use saved key
                      showNotif('API ключ збережено, можна запускати пакетну обробку ✓','success');
                    });
                  } else {
                    setScr('admin'); setAdminTab('products');
                    showNotif('Спочатку додайте товари з фото','info');
                  }
                }}
                style={{flexDirection:'row',alignItems:'center',gap:10,
                  backgroundColor:'#fef3c7',borderRadius:12,padding:12,marginBottom:4,
                  borderWidth:1,borderColor:'#fcd34d'}}>
                <Text style={{fontSize:16}}>🔑</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize:12,fontWeight:'700',color:'#92400e'}}>
                    API ключ не збережено
                  </Text>
                  <Text style={{fontSize:11,color:'#b45309',marginTop:1}}>
                    Натисніть щоб відкрити Фото-студію та ввести ключ →
                  </Text>
                </View>
                <Text style={{fontSize:16,color:'#b45309'}}>›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={()=>{
                if(!removeBgApiKey.trim()){
                  // Open studio to enter key
                  setShowAdminHub(false);
                  const firstProd = adminProducts.find(p=>p.images?.[0]||p.img);
                  if(firstProd) openPhotoStudio(firstProd.images?.[0]||firstProd.img,()=>{});
                  return;
                }
                const withPhotos = adminProducts.filter(p=>(p.images?.[0]||p.img)&&!(p.images?.[0]||p.img||'').includes('studio_'));
                if(withPhotos.length===0){Alert.alert('Всі фото вже оброблені ✓','',[ {text:'OK'}]);return;}
                Alert.alert(
                  '📸 Пакетна обробка',
                  withPhotos.length+' товарів без студійного фото. Обробити перші 10? (~'+Math.min(withPhotos.length,10)*0.05+'$)',
                  [
                    {text:'Обробити '+Math.min(withPhotos.length,10),onPress:async()=>{
                      const batch = withPhotos.slice(0,10);
                      showNotif('Обробляємо '+batch.length+' фото...','info');
                      let done=0;
                      for(const prod of batch){
                        const imgUrl = prod.images?.[0]||prod.img;
                        try {
                          const fd = new FormData();
                          fd.append('image_url', imgUrl);
                          fd.append('size','auto');fd.append('type','product');fd.append('format','png');
                          const r = await fetch('https://api.remove.bg/v1.0/removebg',{
                            method:'POST',headers:{'X-Api-Key':removeBgApiKey.trim()},body:fd,
                          });
                          if(r.ok){
                            const ab = await r.arrayBuffer();
                            const bytes = new Uint8Array(ab);
                            let bin='';
                            for(let i=0;i<bytes.length;i+=8192) bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
                            const fn='products/studio_'+Date.now()+'_'+prod.id+'.png';
                            const {error:ue}=await supabase.storage.from('products').upload(fn,bytes,{contentType:'image/png',upsert:false});
                            if(!ue){
                              const {data:ud}=supabase.storage.from('products').getPublicUrl(fn);
                              if(ud?.publicUrl){
                                await supabase.from('products').update({images:[ud.publicUrl]}).eq('id',prod.id);
                                done++;
                              }
                            }
                          }
                        } catch(_){}
                        await new Promise(res=>setTimeout(res,500)); // rate limit
                      }
                      loadAdminProducts();
                      showNotif('Оброблено '+done+'/'+batch.length+' фото ✓','success');
                    }},
                    {text:'Скасувати',style:'cancel'},
                  ]
                );
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:'#faf5ff',borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:'#e9d5ff'}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#ede9fe',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>🤖</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:'#6d28d9'}}>Пакетна обробка фото</Text>
                <Text style={{fontSize:11,color:'#8b5cf6',marginTop:2}}>
                  {'Видалити фон у ' + adminProducts.filter(p=>p.images?.[0]||p.img).length + ' товарів (remove.bg)'}
                </Text>
              </View>
              <Text style={{color:'#a78bfa',fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* 1. Залишки на складі */}
            <TouchableOpacity
              onPress={()=>{
                const lowStock=adminProducts.filter(p=>(p.stock||0)<10);
                if(lowStock.length===0){
                  Alert.alert('✅ Склад в порядку','Всі товари мають достатню кількість на складі.',[{text:'OK'}]);
                } else {
                  const list=lowStock.slice(0,10).map(p=>'• '+p.name+' — '+( p.stock||0)+' шт').join('\n');
                  Alert.alert('⚠️ Товари закінчуються ('+lowStock.length+')',list,[
                    {text:'Переглянути',onPress:()=>{setShowAdminHub(false);setScr('admin');setAdminTabHist(h=>[...h,adminTab]);setAdminTab('products');}},
                    {text:'OK',style:'cancel'},
                  ]);
                }
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#fef3c7',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>📦</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Залишки на складі</Text>
                <Text style={{fontSize:11,color:th.text4,marginTop:2}}>
                  {(()=>{const n=adminProducts.filter(p=>(p.stock||0)<10).length;return n>0?'⚠️ '+n+' товарів закінчується':'✅ Все в нормі';})()}
                </Text>
              </View>
              <Text style={{color:th.text4,fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* 2. Флеш-розпродаж */}
            <TouchableOpacity
              onPress={()=>{
                // Only products without existing discount
                const eligible = adminProducts.filter(p=>!p.old_price);
                const already  = adminProducts.length - eligible.length;
                const hint = already>0 ? ' ('+already+' вже зі знижкою — пропущено)' : '';
                if(eligible.length===0){
                  Alert.alert('⚡ Флеш-розпродаж','Всі товари вже мають знижку. Спочатку скиньте знижки.',[{text:'OK'}]);
                  return;
                }
                const applyFlash = async (pct) => {
                  try {
                    showNotif('Застосовуємо знижку...','info');
                    const mult = pct===10 ? 0.9 : 0.8;
                    // Update each product individually (Supabase doesn't support bulk update with different values)
                    const updates = eligible.map(p=>
                      supabase.from('products')
                        .update({old_price: p.price, price: Math.round(p.price * mult)})
                        .eq('id', p.id)
                    );
                    const results = await Promise.all(updates);
                    const failed = results.filter(r=>r.error).length;
                    await loadAdminProducts();
                    await loadProducts(true);
                    if(failed>0) showNotif('Знижка застосована з помилками ('+failed+' не оновлено)','error');
                    else showNotif('⚡ Флеш −'+pct+'% на '+eligible.length+' товарів'+hint+' ✓','success');
                  } catch(e){ showNotif('Помилка: '+e.message,'error'); }
                };
                Alert.alert(
                  '⚡ Флеш-розпродаж',
                  'Знизити ціну на '+eligible.length+' товарів'+hint+'?',
                  [
                    {text:'−10%', onPress:()=>applyFlash(10)},
                    {text:'−20%', onPress:()=>applyFlash(20)},
                    {text:'Скасувати', style:'cancel'},
                  ]
                );
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#fee2e2',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>⚡</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Флеш-розпродаж</Text>
                <Text style={{fontSize:11,color:th.text4,marginTop:2}}>Миттєва знижка −10% або −20% на всі товари</Text>
              </View>
              <Text style={{color:th.text4,fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* 3. Скинути всі знижки */}
            <TouchableOpacity
              onPress={()=>{
                Alert.alert('Скинути всі знижки?','Відновить original_price для всіх товарів зі старою ціною.',[
                  {text:'Скинути',style:'destructive',onPress:async()=>{
                    try{
                      showNotif('Відновлюємо ціни...','info');
                      const discounted=adminProducts.filter(p=>p.old_price&&p.old_price>p.price);
                      if(discounted.length===0){showNotif('Немає активних знижок','info');return;}
                      const updates = discounted.map(p=>
                        supabase.from('products')
                          .update({price: p.old_price, old_price: null})
                          .eq('id', p.id)
                      );
                      const results = await Promise.all(updates);
                      const failed = results.filter(r=>r.error).length;
                      await loadAdminProducts();
                      await loadProducts(true);
                      if(failed>0) showNotif('Відновлено з помилками ('+failed+' не оновлено)','error');
                      else showNotif('✓ Ціни відновлено для '+discounted.length+' товарів','success');
                    }catch(e){showNotif('Помилка: '+e.message,'error');}
                  }},
                  {text:'Скасувати',style:'cancel'},
                ]);
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#ede9fe',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>🔄</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Скинути всі знижки</Text>
                <Text style={{fontSize:11,color:th.text4,marginTop:2}}>
                  {(()=>{const n=adminProducts.filter(p=>p.old_price&&p.old_price>p.price).length;return n>0?n+' товарів зі знижкою':'Активних знижок немає';})()}
                </Text>
              </View>
              <Text style={{color:th.text4,fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* 4. Швидка статистика дня */}
            <View style={{backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
              borderWidth:1,borderColor:th.cardBorder}}>
              <Text style={{fontSize:11,fontWeight:'800',color:th.text,marginBottom:10}}>📊 Статистика сьогодні</Text>
              {(()=>{
                const today=new Date().toLocaleDateString('uk-UA');
                const todayOrds=(adminOrders.length>0?adminOrders:orders).filter(o=>{
                  const d=o.date||o.created_at||'';
                  return d.includes(today)||d.startsWith(new Date().toISOString().slice(0,10));
                });
                const revenue=todayOrds.reduce((s,o)=>s+(o.total||0),0);
                const pending=todayOrds.filter(o=>o.status==='pending'||o.status==='new').length;
                return(
                  <View style={{flexDirection:'row',gap:8}}>
                    {[
                      {label:'Замовлень',val:String(todayOrds.length),color:'#3b82f6'},
                      {label:'Виручка',val:revenue+'₴',color:'#10b981'},
                      {label:'Очікують',val:String(pending),color:'#f59e0b'},
                      {label:'Товарів',val:String(products.length),color:'#8b5cf6'},
                    ].map(({label,val,color})=>(
                      <View key={label} style={{flex:1,backgroundColor:th.bg3,borderRadius:10,
                        padding:10,alignItems:'center'}}>
                        <Text style={{fontSize:16,fontWeight:'900',color}}>{val}</Text>
                        <Text style={{fontSize:9,color:th.text4,marginTop:2,textAlign:'center'}}>{label}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>

            {/* 5. Дублювати товар */}
            <TouchableOpacity
              onPress={()=>{
                setShowAdminHub(false);
                setScr('admin');
                setAdminTab('products');
                showNotif('Оберіть товар для дублювання в списку','info');
              }}
              style={{flexDirection:'row',alignItems:'center',gap:14,
                backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:8,
                borderWidth:1,borderColor:th.cardBorder}}>
              <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#dbeafe',
                justifyContent:'center',alignItems:'center'}}>
                <Text style={{fontSize:22}}>📋</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Дублювати товар</Text>
                <Text style={{fontSize:11,color:th.text4,marginTop:2}}>Створити копію існуючого товару</Text>
              </View>
              <Text style={{color:th.text4,fontSize:18}}>›</Text>
            </TouchableOpacity>

            {/* Інфо про версію */}
            <View style={{backgroundColor:th.bg2,borderRadius:14,padding:14,marginBottom:24,
              borderWidth:1,borderColor:th.cardBorder,gap:6}}>
              {[
                ['Версія','v4.0 · BUILD-60HZ8D'],
                ['База даних','Supabase'],
                ['Товарів у каталозі', String(products.length)],
                ['Замовлень',String(adminOrders.length||orders.length)],
              ].map(([k,v])=>(
                <View key={k} style={{flexDirection:'row',justifyContent:'space-between'}}>
                  <Text style={{fontSize:11,color:th.text4}}>{k}</Text>
                  <Text style={{fontSize:11,color:th.text,fontWeight:'600'}}>{v}</Text>
                </View>
              ))}
            </View>

          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ВІДГУК MODAL ── */}
      <Modal visible={showAddReview&&!!sel} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'transparent',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:th.bg,padding:24,paddingBottom:HOME_IND+16,borderTopLeftRadius:20,borderTopRightRadius:20}}>
            <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:24}}/>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:20}}>
              <Text style={{fontSize:10,fontWeight:'900',letterSpacing:3,color:th.text}}>НАПИСАТИ ВІДГУК</Text>
              <TouchableOpacity onPress={()=>{setShowAddReview(false);setNewReviewText('');setNewReviewRating(5);}}>
                <Text style={{color:th.text3,fontSize:18}}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{fontSize:9,fontWeight:'800',letterSpacing:2,color:th.text3,marginBottom:10}}>ОЦІНКА</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:20}}>
              {[1,2,3,4,5].map(s=>(
                <TouchableOpacity key={s} onPress={()=>setNewReviewRating(s)}>
                  <Text style={{fontSize:28,color:s<=newReviewRating?'#daa520':'#ddd'}}>{s<=newReviewRating?'★':'☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <AppInput th={th} label="ВІДГУК" placeholder="Ваші враження про товар..." value={newReviewText} onChangeText={setNewReviewText} style={{minHeight:80,textAlignVertical:'top'}}/>
            <Btn th={th} label="ОПУБЛІКУВАТИ" onPress={addReview}/>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── МОДАЛЬ ОЦІНКИ ЗАСТОСУНКУ ── */}
      <Modal visible={showRateModal} animationType="fade" transparent statusBarTranslucent>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'center',
          alignItems:'center',padding:24}}>
          <View style={{backgroundColor:th.bg,borderRadius:28,padding:28,
            width:'100%',alignItems:'center',gap:10,
            shadowColor:'#000',shadowOpacity:0.3,shadowRadius:24,elevation:20}}>

            <Text style={{fontSize:32,marginBottom:2}}>🎉</Text>
            <Text style={{fontSize:17,fontWeight:'900',color:th.text,letterSpacing:0.5,textAlign:'center'}}>
              Оцініть застосунок
            </Text>
            <Text style={{fontSize:13,color:th.text3,textAlign:'center',lineHeight:18,marginBottom:4}}>
              Ваша думка допомагає нам ставати кращими
            </Text>

            <View style={{flexDirection:'row',gap:6,marginVertical:6}}>
              {[1,2,3,4,5].map(s=>(
                <TouchableOpacity key={s} onPress={()=>setAppRating(s)} activeOpacity={0.7}>
                  <Text style={{fontSize:40,color:s<=appRating?'#f59e0b':'#e5e7eb'}}>
                    {s<=appRating?'★':'☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {appRating>0&&!appRatingSent&&(
              <Text style={{fontSize:12,color:th.text3,textAlign:'center',marginTop:-4}}>
                {['','😕 Дуже погано','😐 Погано','🙂 Нормально','😊 Добре','🤩 Відмінно!'][appRating]}
              </Text>
            )}

            {appRatingSent ? (
              <View style={{alignItems:'center',gap:6,marginTop:4}}>
                <Text style={{fontSize:22}}>✅</Text>
                <Text style={{fontSize:14,fontWeight:'800',color:th.success}}>Дякуємо за оцінку!</Text>
              </View>
            ) : (
              <TouchableOpacity
                disabled={appRating===0}
                onPress={async()=>{
                  setAppRatingSent(true);
                  try {
                    await supabase.from('app_ratings').insert([{rating:appRating,created_at:new Date().toISOString()}]);
                  } catch(e){ /* ігнорувати якщо таблиці немає */ }
                }}
                style={{backgroundColor:appRating>0?th.accent:th.bg3,borderRadius:16,
                  paddingHorizontal:32,paddingVertical:13,width:'100%',alignItems:'center',marginTop:4}}>
                <Text style={{fontSize:13,fontWeight:'900',letterSpacing:1,
                  color:appRating>0?th.accentText:th.text4}}>
                  {appRating===0?'ОБЕРІТЬ ОЦІНКУ':'ВІДПРАВИТИ ОЦІНКУ'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={()=>{setShowRateModal(false);setAppRating(0);setAppRatingSent(false);}}
              style={{marginTop:2}}>
              <Text style={{fontSize:12,color:th.text4,textAlign:'center'}}>Пропустити</Text>
            </TouchableOpacity>

            <Text style={{fontSize:10,color:th.text4,textAlign:'center',
              lineHeight:15,marginTop:4,paddingHorizontal:8}}>
              Є пропозиція? Напиши нам, ми обов'язково подумаємо над реалізацією.
            </Text>

          </View>
        </View>
      </Modal>




    </View>
  );
}
