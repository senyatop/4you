// ═══════════════════════════════════════════════════
// 4YOU.STORE — App.js  BUILD-8K99NZ-SIX077  v3.5.0
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
import { supabase } from './supabase';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Modal, Switch, StatusBar,
  Dimensions, Platform, Image, ActivityIndicator,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
  Share, Animated, PanResponder, Appearance, RefreshControl
} from 'react-native';

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
const GUTTER = 10;
const CARD_W = (W - GUTTER * 3) / 2;
const CARD_H = CARD_W * 1.4;
const BRAND = '4YOU.STORE';
const ADMIN_EMAILS = ['misha.pff@gmail.com','admin@4you.store']; // всі адміни
const ADMIN_EMAIL = ADMIN_EMAILS[0]; // основний
const R = 16;
const NP_KEY = 'YOUR_NOVAPOSHTA_API_KEY';

const ui = (id, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

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
    version:'4YOU.STORE v3.1 · BUILD-8K99NZ-SIX077',
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
    ob1title:'Стиль без зусиль', ob1sub:'Понад 60 позицій одягу та аксесуарів',
    ob2title:'Швидка доставка', ob2sub:'Нова Пошта по всій Україні',
    ob3title:'Бонуси за кожне замовлення', ob3sub:'5% від суми повертається на ваш рахунок',
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
    version:'4YOU.STORE v3.1 · BUILD-8K99NZ-SIX077',
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
    ob1title:'Effortless style', ob1sub:'Over 60 clothing & accessories',
    ob2title:'Fast delivery', ob2sub:'Nova Poshta across all Ukraine',
    ob3title:'Bonuses for every order', ob3sub:'5% cashback on every completed order',
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
    bg:'#0f0f0f',bg2:'#1a1a1a',bg3:'#2a2a2a',
    card:'#1a1a1a',cardBorder:'#2a2a2a',
    text:'#f0f0f0',text2:'#ccc',text3:'#888',text4:'#555',
    accent:'#f0f0f0',accentText:'#111',
    danger:'#ef4444',success:'#22c55e',info:'#60a5fa',
    navBg:'#0f0f0f',navBorder:'#2a2a2a',
    inputBg:'#1a1a1a',inputBorder:'#333',inputText:'#f0f0f0',
  }
};

// ── CATEGORIES ────────────────────────────────────────────────────────────
const CAT_TREE = [
  {id:'outerwear',label:'Верхній одяг',labelEN:'Outerwear',cid:'outerwear',icon:'🧥',
    children:['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки']},
  {id:'hoodies',label:'Кофти',labelEN:'Hoodies & Knits',cid:'hoodies',icon:'👕',
    children:['Кофти','Світшоти','Світшоти БРЕНД','Світери']},
  {id:'tshirts',label:'Футболки',labelEN:'T-Shirts & Shirts',cid:'tshirts',icon:'👔',
    children:['Футболки','Сорочки']},
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
          flexDirection:'row',justifyContent:'center',gap:6,pointerEvents:'none'}}>
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
      )}
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
  const opacity = anim.interpolate({inputRange:[0,1],outputRange:[0.35,0.7]});
  return <Animated.View style={[{width,height,borderRadius:R,backgroundColor:'#ccc',opacity},style]}/>;
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
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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
  const translateX  = useRef(new Animated.Value(0)).current;
  const fillProgress= useRef(new Animated.Value(0)).current;  // 0→1 fill animation
  const rowHeight   = useRef(new Animated.Value(116)).current;
  const deletingRef = useRef(false);
  const undoTimerRef= useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | filling | done
  const DISMISS = -W * 0.42;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_,g) =>
      phase === 'idle' && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8,
    onPanResponderMove: (_,g) => {
      if(phase !== 'idle') return;
      translateX.setValue(g.dx < 0 ? Math.max(g.dx, -W) : g.dx * 0.07);
    },
    onPanResponderRelease: (_,g) => {
      if(phase !== 'idle') return;
      if(g.dx < DISMISS || g.vx < -1.0) {
        startDelete();
      } else {
        Animated.spring(translateX,{toValue:0,useNativeDriver:true,tension:200,friction:12}).start();
      }
    },
  })).current;

  const startDelete = () => {
    if(deletingRef.current) return;
    deletingRef.current = true;
    setPhase('filling');
    // Slide card back to 0 first (snap back)
    Animated.spring(translateX,{toValue:0,useNativeDriver:true,tension:300,friction:15}).start();
    // Fill red progress bar left→right over 5s
    fillProgress.setValue(0);
    Animated.timing(fillProgress,{toValue:1,duration:5000,useNativeDriver:false}).start(({finished})=>{
      if(finished) commitDelete();
    });
    // Start 5s undo timer
    undoTimerRef.current = setTimeout(()=>commitDelete(), 5100);
  };

  const undoDelete = () => {
    clearTimeout(undoTimerRef.current);
    fillProgress.stopAnimation();
    fillProgress.setValue(0);
    deletingRef.current = false;
    setPhase('idle');
  };

  const commitDelete = () => {
    clearTimeout(undoTimerRef.current);
    setPhase('done');
    // Collapse row
    Animated.parallel([
      Animated.timing(rowHeight,{toValue:0,duration:280,useNativeDriver:false}),
    ]).start(()=>onDelete(item.key));
  };

  useEffect(()=>()=>{
    clearTimeout(undoTimerRef.current);
    fillProgress.stopAnimation();
  },[]);

  return(
    <Animated.View style={{height:rowHeight,overflow:'hidden'}}>
      {phase === 'filling' || phase === 'done' ? (
        /* ── UNDO STATE ── */
        <View style={{flex:1,flexDirection:'row',alignItems:'center',
          paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:th.cardBorder,
          backgroundColor:th.bg,position:'relative',overflow:'hidden'}}>
          {/* Red fill bar */}
          <Animated.View style={{position:'absolute',left:0,top:0,bottom:0,
            backgroundColor:'#fee2e2',
            width:fillProgress.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}/>
          <View style={{flex:1,zIndex:1}}>
            <Text style={{fontSize:12,fontWeight:'600',color:'#dc2626'}}>Товар видалено</Text>
            <Text style={{fontSize:10,color:'#ef4444',marginTop:2}}>Натисніть "Скасувати" щоб повернути</Text>
          </View>
          <TouchableOpacity onPress={undoDelete}
            style={{zIndex:1,paddingHorizontal:14,paddingVertical:8,borderRadius:10,
              backgroundColor:'#dc2626'}}>
            <Text style={{color:'#fff',fontSize:11,fontWeight:'900',letterSpacing:0.5}}>Скасувати</Text>
          </TouchableOpacity>
        </View>
      ):(
        /* ── NORMAL STATE ── */
        <View style={{position:'relative',flex:1}}>
          {/* Swipe hint */}
          <Animated.View style={{position:'absolute',left:0,top:0,bottom:0,right:0,
            backgroundColor:'#fee2e2',justifyContent:'center',alignItems:'flex-end',paddingRight:20,
            opacity:translateX.interpolate({inputRange:[-W,-60,-5,0],outputRange:[1,0.8,0.05,0],extrapolate:'clamp'})}}>
            <Text style={{color:'#dc2626',fontSize:11,fontWeight:'900',letterSpacing:1}}>ВИДАЛИТИ</Text>
          </Animated.View>

          <Animated.View {...pan.panHandlers}
            style={{transform:[{translateX}],backgroundColor:th.bg,
              flex:1,flexDirection:'row',paddingVertical:12,
              borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
            <Image source={{uri:item.imgs?.[0]||item.img}}
              style={{width:72,height:90,borderRadius:R}} resizeMode="cover"/>
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
              <TouchableOpacity onPress={startDelete} style={{paddingVertical:6,paddingHorizontal:8}}>
                <Text style={{color:'#dc2626',fontSize:10,fontWeight:'800',letterSpacing:0.5}}>видалити</Text>
              </TouchableOpacity>
              <Text style={{fontSize:13,fontWeight:'900',color:th.text}}>{item.price*item.qty} ₴</Text>
            </View>
          </Animated.View>
        </View>
      )}
    </Animated.View>
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
  gridContent: {flexDirection:'row',flexWrap:'wrap',paddingHorizontal:GUTTER,paddingTop:GUTTER,paddingBottom:NAV_BOT+8},
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
      <Text style={{fontSize:14,fontWeight:'900',letterSpacing:6,color:th.text}}>4YOU.STORE</Text>
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

  const [_appLoaded,setAppLoaded]=useState(false);
  const systemDark=Appearance.getColorScheme()==='dark';
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
  const [quickAddSz,setQuickAddSz]=useState(null);
  const [quickAddCl,setQuickAddCl]=useState(null);
  const [lang,setLangRaw]=useState('UA');
  // ── PRODUCTS (з Supabase або fallback на MOCK_P) ─────────────────────────
  const [products, setProducts] = useState(MOCK_P);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perPage, setPerPage] = useState(25); // 10 / 25 / 50
  const [heroIdx, setHeroIdx] = useState(0);
  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroTimer = useRef(null);
  const marqueeX   = useRef(new Animated.Value(0)).current;
  const [footerOpen,setFooterOpen] = useState({info:false,service:false,signup:false});

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
        'Куртки':'outerwear','Бомбери':'outerwear','Кожанки':'outerwear',
        'Пальто':'outerwear','Парки':'outerwear','Дублянки':'outerwear','Джинсовки':'outerwear',
        'Кофти':'hoodies','Світшоти':'hoodies','Світшоти БРЕНД':'hoodies','Світери':'hoodies',
        'Футболки':'tshirts','Сорочки':'tshirts',
        'Джинси':'pants','Джинси класика':'pants','Спортивні штани':'pants',
        'Брюки':'pants','Шорти':'pants','Плавальні шорти':'pants',
        'Костюми':'costumes','Комплекти':'costumes',
        'Взуття':'accessories','Труси':'accessories','Головні убори':'accessories',
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
          cid:SUB_TO_CID_MAP[p.sub_category]||p.category_id||'tshirts',
          cat:p.sub_category||'',sz:p.sizes||[],cl:p.colors||[],
          r:parseFloat(p.rating)||0,rv:p.reviews_count||0,badge:p.badge||null,
          desc:p.description||'',tags:p.tags||[],stock:p.stock||100,
        }));
        allProds=[...allProds,...mapped];
        if(!isRefresh) setProducts(p=>page===0?mapped:[...p,...mapped]);
        hasMore=data.length===PAGE_SIZE;page++;
      }
      if(isRefresh) setProducts(allProds);
    }catch(e){console.warn('Products load error:',e.message);}
    finally{setProductsLoading(false);setRefreshing(false);}
  };

  useEffect(()=>{ loadProducts(false); },[]);


  const setLang=(v)=>{setLangRaw(v);AsyncStorage.setItem('lang',v).catch(()=>{});};
  // CRITICAL: useMemo prevents new object references on every render.
  // Without this, th changes on every setState → AppInput gets new style prop
  // → React Native on iOS dismisses keyboard during layout recalc.
  const th=useMemo(()=>THEMES[darkMode?'dark':'light'],[darkMode]);
  const T=useMemo(()=>LANG[lang]||LANG.UA,[lang]);

  // Nav
  const [scr,setScr]=useState('onboarding');
  const [hist,setHist]=useState([]);
  const go=s=>{setHist(h=>[...h,scr]);setScr(s);};
  const back=()=>{const h=[...hist];const p=h.pop()||'home';setHist(h);setScr(p);};

  // Scroll position
  const homeScrollY=useRef(0);
  const homeScrollRef=useRef(null);

  // Auth
  const [loggedIn,setLoggedInRaw]=useState(false);
  const isLocalAdmin = useRef(false); // true = admin@4you.store, bypass Supabase
  const isAdmin=loggedIn&&(isLocalAdmin.current||ADMIN_EMAILS.includes((user?.email||'').trim().toLowerCase()));
  const [adminTab,setAdminTab]=useState('products'); // products | orders | stats
  const [adminProducts,setAdminProducts]=useState([]);
  const [adminLoading,setAdminLoading]=useState(false);
  const [adminEdit,setAdminEdit]=useState(null);
  const [adminEditForm,setAdminEditForm]=useState({});
  const [adminSearch,setAdminSearch]=useState('');
  const [adminOrders,setAdminOrders]=useState([]);
  const [showAddProduct,setShowAddProduct]=useState(false);
  const [addProdForm,setAddProdForm]=useState({name:'',price:'',stock:'',sub_category:'',description:''});
  const [pushToken,setPushToken]=useState(null);
  const [notifPerm,setNotifPerm]=useState(false);
  const setLoggedIn=(v)=>{
    setLoggedInRaw(v);
    AsyncStorage.setItem('loggedIn',JSON.stringify(v)).catch(()=>{});
    if(!v){
      isLocalAdmin.current=false;
      AsyncStorage.removeItem('isLocalAdmin').catch(()=>{});
    }
  };
  const [authMode,setAuthMode]=useState('login');
  const [authEmail,setAuthEmail]=useState('');
  const [authPass,setAuthPass]=useState('');
  const [authName,setAuthName]=useState('');
  const [authErr,setAuthErr]=useState('');
  const [user,setUserRaw]=useState({name:'',email:'',phone:'+380671234567',bonuses:250});
  const setUser=(v)=>{setUserRaw(v);AsyncStorage.setItem('user',JSON.stringify(v)).catch(()=>{});};

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
  const [showCartModal,setShowCartModal]=useState(false);
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
      AsyncStorage.setItem('recentlyViewed',JSON.stringify(val)).catch(()=>{});
      return val;
    });
  },[]);

  // Image skeleton loading
  const [imgLoaded,setImgLoaded]=useState({});

  // Search history
  const [searchHistory,setSearchHistoryRaw]=useState([]);
  const setSearchHistory=useCallback((v)=>{
    setSearchHistoryRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      AsyncStorage.setItem('searchHistory',JSON.stringify(val)).catch(()=>{});
      return val;
    });
  },[]);
  const [showSuggestions,setShowSuggestions]=useState(false);

  // LiqPay WebView
  const [showLiqpayView,setShowLiqpayView]=useState(false);
  const [liqpayUrl,setLiqpayUrl]=useState('');

  // Cart & wishlist
  const [wish,setWishRaw]=useState([]);
  const setWish=useCallback((v)=>{
    setWishRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      AsyncStorage.setItem('wish',JSON.stringify(val)).catch(()=>{});
      return val;
    });
  },[]);
  const [cart,setCartRaw]=useState([]);
  const setCart=useCallback((v)=>{
    setCartRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      AsyncStorage.setItem('cart',JSON.stringify(val)).catch(()=>{});
      return val;
    });
  },[]);
  const [promo,setPromo]=useState('');
  const [promoApplied,setPromoApplied]=useState(null);
  const [promoErr,setPromoErr]=useState('');
  const [useBonuses,setUseBonuses]=useState(false);


  // ── HERO: auto-slide every 4s ────────────────────────────────────────────
  useEffect(()=>{
    Animated.loop(
      Animated.timing(marqueeX,{toValue:-1,duration:18000,useNativeDriver:true})
    ).start();
    heroTimer.current = setInterval(()=>{
      // Slow cross-fade: fade out over 800ms, switch, fade in over 1200ms
      Animated.timing(heroAnim,{toValue:1,duration:800,useNativeDriver:true}).start(()=>{
        setHeroIdx(p=>(p+1)%Math.max(1,heroSlides.length));
        Animated.timing(heroAnim,{toValue:0,duration:1200,useNativeDriver:true}).start();
      });
    },6000); // 6s
    return ()=>clearInterval(heroTimer.current);
  },[]);

  // ── SUPABASE: авто-вхід ──────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){
        const {data:p}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();
        if(p){
          setUserRaw({name:p.name||'',email:p.email||'',phone:p.phone||'',bonuses:p.bonuses||0});
          setLoggedInRaw(true);
        }
      }
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      // Не скидаємо локальний адмін-акаунт
      if(!session&&!isLocalAdmin.current){
        setLoggedInRaw(false);
        setUserRaw({name:'',email:'',phone:'',bonuses:0});
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── ASYNCSTORAGE: load all persisted data on startup ──────────────────
  useEffect(()=>{
    (async()=>{
      try {
        const keys=['cart','wish','orders','user','loggedIn','searchHistory',
                    'recentlyViewed','themeMode','lang','isLocalAdmin'];
        const pairs=await AsyncStorage.multiGet(keys);
        const data=Object.fromEntries(pairs.map(([k,v])=>[k,v]));

        if(data.themeMode)             setThemeModeRaw(data.themeMode);
        if(data.lang)                  setLangRaw(data.lang);
        if(data.loggedIn)              setLoggedInRaw(JSON.parse(data.loggedIn));
        if(data.user)                  setUserRaw(JSON.parse(data.user));
        if(data.cart)                  setCartRaw(JSON.parse(data.cart));
        if(data.wish)                  setWishRaw(JSON.parse(data.wish));
        if(data.orders)                setOrdersRaw(JSON.parse(data.orders));
        if(data.searchHistory)         setSearchHistoryRaw(JSON.parse(data.searchHistory));
        if(data.recentlyViewed)        setRecentlyViewedRaw(JSON.parse(data.recentlyViewed));
        if(data.isLocalAdmin==='true')  isLocalAdmin.current=true;
      } catch(e) {
        // If storage fails, app works with defaults
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
  const [npLoading,setNpLoading]=useState(false);
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

  const MOCK_ORDERS=[
    {id:'4YOU001',date:'20.01.2026',status:'Доставлено',items:['Basic White Tee ×2'],total:1398,track:'59000123456789',city:'Київ',pay:'LiqPay',bonusEarned:70},
    {id:'4YOU002',date:'10.02.2026',status:'В дорозі',items:['Classic Field Jacket ×1'],total:2499,track:'59000987654321',city:'Харків',pay:'Картка',bonusEarned:0},
  ];
  const [orders,setOrdersRaw]=useState(MOCK_ORDERS);
  const setOrders=useCallback((v)=>{
    setOrdersRaw(prev=>{
      const val=typeof v==='function'?v(prev):v;
      AsyncStorage.setItem('orders',JSON.stringify(val)).catch(()=>{});
      return val;
    });
  },[]);
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
  const toggleWish=id=>setWish(p=>p.includes(id)?p.filter(i=>i!==id):[...id,...p].includes(id)?p.filter(i=>i!==id):[...p,id]);

  // ── ADMIN: load all products from Supabase ──────────────────────
  const loadAdminProducts = async () => {
    setAdminLoading(true);
    try {
      const {data} = await supabase.from('products')
        .select('id,name,price,category_id,sub_category,is_active,stock,images')
        .order('id',{ascending:true});
      setAdminProducts(data||[]);
    } catch(e){console.warn(e);}
    finally{setAdminLoading(false);}
  };

  const adminSaveProduct = async (prod) => {
    try {
      await supabase.from('products').update({
        name: prod.name,
        price: Number(prod.price),
        is_active: prod.is_active,
        stock: Number(prod.stock),
      }).eq('id', prod.id);
      setAdminEdit(null);
      loadAdminProducts();
      showNotif('Товар оновлено ✓','success');
    } catch(e){ showNotif('Помилка збереження','error'); }
  };

  const adminToggleActive = async (id, current) => {
    await supabase.from('products').update({is_active:!current}).eq('id',id);
    setAdminProducts(p=>p.map(x=>x.id===id?{...x,is_active:!current}:x));
  };

  const adminDeleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id',id);
    setAdminProducts(p=>p.filter(x=>x.id!==id));
    showNotif('Товар видалено','info');
  };

  const adminAddProduct = async () => {
    if(!addProdForm.name.trim()||!addProdForm.price) return showNotif('Заповніть назву та ціну','error');
    try{
      const {data,error} = await supabase.from('products').insert({
        name: addProdForm.name.trim(),
        price: Number(addProdForm.price),
        stock: Number(addProdForm.stock)||0,
        sub_category: addProdForm.sub_category.trim()||'Інше',
        description: addProdForm.description.trim(),
        is_active: true,
        images: [],
        sizes: [],
        colors: [],
        badge: null,
      }).select().single();
      if(error) throw error;
      showNotif('Товар додано ✓','success');
      setShowAddProduct(false);
      setAddProdForm({name:'',price:'',stock:'',sub_category:'',description:''});
      loadAdminProducts();
    }catch(e){ showNotif('Помилка: '+e.message,'error'); }
  };

  const shareProduct = async (p) => {
    try {
      await Share.share({
        message: `${p.name} — ${p.price} ₴\n4YOU.STORE`,
        title: p.name,
      });
    } catch(e) {}
  };

  const addReview = () => {
    if(!newReviewText.trim()) return;
    const r = {
      id: Date.now(),
      author: loggedIn ? user.name||'Покупець' : 'Анонім',
      rating: newReviewRating,
      text: newReviewText.trim(),
      date: new Date().toLocaleDateString('uk-UA'),
    };
    setReviews(prev=>({...prev, [sel.id]: [r, ...(prev[sel.id]||[])]}));
    setNewReviewText('');setNewReviewRating(5);setShowAddReview(false);
  };

  // Scroll product screen to top whenever a new product is opened
  useEffect(()=>{
    if(sel&&productScrollRef.current){
      productScrollRef.current.scrollTo({y:0,animated:false});
    }
  },[sel]);

  const addToRecentlyViewed = (p) => {
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
      'costumes':['Костюми','Комплекти'],
      'accessories':['Взуття','Труси','Головні убори'],
    };
    let r=products.filter(p=>{
      let mCat=true;
      if(catFilter.badge) mCat=p.badge===catFilter.badge;
      else if(catFilter.sub) mCat=p.cat===catFilter.sub;
      else if(catFilter.cid){
        const allowed=SUB_CAT_MAP[catFilter.cid];
        if(allowed) mCat=allowed.includes(p.cat)||p.cid===catFilter.cid;
        else mCat=p.cid===catFilter.cid;
      }
      const mPrice = p.price>=priceMin && p.price<=priceMax;
      const mColor = !colorFilter || (p.cl||[]).includes(colorFilter);
      const mSize  = !sizeFilter  || (p.sz||[]).includes(sizeFilter);
      return mCat&&mPrice&&mColor&&mSize&&p.name.toLowerCase().includes(srch.toLowerCase());
    });
    if(sort==='price_asc') r=[...r].sort((a,b)=>a.price-b.price);
    if(sort==='price_desc') r=[...r].sort((a,b)=>b.price-a.price);
    if(sort==='new') r=[...r].sort((a,b)=>(b.badge==='Новинка'?1:0)-(a.badge==='Новинка'?1:0));
    if(sort==='rating') r=[...r].sort((a,b)=>b.r-a.r);
    return r;
  },[catFilter,srch,sort,priceMin,priceMax,colorFilter,sizeFilter,products]);

  const filteredItems=useMemo(()=>allFilteredItems.slice(0,perPage),[allFilteredItems,perPage]);

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

  const doAuth=async()=>{
    if(!authEmail.includes('@'))return setAuthErr(T.errEmail);
    if(authPass.length<6)return setAuthErr(T.errPass);
    if(authMode==='register'&&!authName)return setAuthErr(T.errName);
    setAuthErr('');
    try{
      if(authMode==='register'){
        const {data,error}=await supabase.auth.signUp({
          email:authEmail.trim().toLowerCase(),
          password:authPass,
          options:{data:{name:authName.trim()}}
        });
        if(error)throw error;
        setUser({name:authName.trim(),email:authEmail.trim(),phone:'',bonuses:0});
      } else {
        // Адмін-акаунт (локальний, без Supabase)
        if(authEmail.trim().toLowerCase()==='admin@4you.store'&&authPass==='4YouAdmin2024'){
          const adminUser={name:'Адміністратор',email:'admin@4you.store',phone:'',bonuses:0};
          isLocalAdmin.current=true;
          setUserRaw(adminUser);
          setLoggedInRaw(true);
          AsyncStorage.setItem('user',JSON.stringify(adminUser));
          AsyncStorage.setItem('loggedIn','true');
          AsyncStorage.setItem('isLocalAdmin','true');
          setScr('profile');return;
        }
        const {data,error}=await supabase.auth.signInWithPassword({
          email:authEmail.trim().toLowerCase(),
          password:authPass,
        });
        if(error)throw error;
        const {data:profile}=await supabase.from('profiles').select('*').eq('id',data.user.id).single();
        if(profile) setUser({name:profile.name||'',email:profile.email||authEmail,phone:profile.phone||'',bonuses:profile.bonuses||0});
      }
      setLoggedIn(true);setScr('home');
    }catch(e){
      if(e.message==='Invalid login credentials') setAuthErr('Невірний email або пароль');
      else if(e.message==='User already registered') setAuthErr('Цей email вже зареєстровано');
      else setAuthErr(e.message);
    }
  };

  const fetchNP=async city=>{
    if(!city) return;
    setNpLoading(true);setNpErr(false);setNpBranches([]);
    try{
      const res=await fetch('https://api.novaposhta.ua/v2.0/json/',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({apiKey:NP_KEY,modelName:'Address',calledMethod:'getWarehouses',
          methodProperties:{CityName:city,Limit:50,Language:'UA'}})});
      const data=await res.json();
      if(data.success&&data.data) setNpBranches(data.data.map(b=>({ref:b.Ref,desc:b.Description,addr:b.ShortAddress})));
      else setNpErr(true);
    }catch(e){setNpErr(true);}
    setNpLoading(false);
  };

  // ── Після успішної оплати (викликається з WebView callback або після COD/card) ──
  const finalizeOrder=()=>{
    const earned=Math.floor(totPrice*0.05);
    const o={id:'4YOU0'+(orders.length+3),date:new Date().toLocaleDateString('uk-UA'),
      status:'Оплачено',items:cart.map(i=>`${i.name} (${i.color}, ${i.size}) ×${i.qty}`),
      total:totPrice,track:'590'+Math.floor(Math.random()*1e9),
      city:dCity,pay:payM==='card'?'Картка':payM==='liqpay'?'LiqPay':'Накладний платіж',bonusEarned:earned};
    setOrders(p=>[o,...p]);
    if(bonusUsed>0) setUser(u=>({...u,bonuses:u.bonuses-bonusUsed+earned}));
    else setUser(u=>({...u,bonuses:u.bonuses+earned}));
    // Зберегти замовлення в Supabase
    supabase.auth.getUser().then(({data:{user:authUser}})=>{
      if(!authUser) return;
      supabase.from('orders').insert({
        user_id:authUser.id,
        items:cart.map(i=>({name:i.name,qty:i.qty,size:i.size,color:i.color,price:i.price})),
        subtotal:cart.reduce((s,i)=>s+i.price*i.qty,0),
        bonus_used:bonusUsed||0,
        total:totPrice,
        bonus_earned:earned,
        city:dCity,np_branch:dBranch,
        contact_name:dName,contact_phone:dPhone,
        payment_method:payM==='liqpay'?'LiqPay':payM==='card'?'Картка':'Накладний',
        status:'Оплачено',payment_status:'paid',
      });
      supabase.from('profiles').update({
        bonuses:Math.max(0,(user.bonuses||0)-(bonusUsed||0)+earned)
      }).eq('id',authUser.id);
    });
    setCart([]);setPromoApplied(null);setPromo('');setUseBonuses(false);
    setDName('');setDPhone('');setDCity('');setDBranch('');
    setPayM(null);setCNum('');setCExp('');setCCVV('');setCNm('');
    setPaying(false);setShowLiqpayView(false);setScr('success');
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
      // ── LiqPay: відкрити WebView ──
      // Замініть PUBLIC_KEY та PRIVATE_KEY на ваші ключі з cabinet.liqpay.ua
      const LIQPAY_PUBLIC  = 'YOUR_LIQPAY_PUBLIC_KEY';
      const orderId = '4YOU0'+(orders.length+3)+'-'+Date.now();
      const dataObj = {
        version:3, public_key:LIQPAY_PUBLIC,
        action:'pay', amount:totPrice, currency:'UAH',
        description:`4YOU.STORE #${orderId}`,
        order_id:orderId, language:'uk',
        result_url:'https://4you.store/success',
      };
      // У продакшн підпис генерується на бекенді!
      // Тут для демо відкриваємо стандартну сторінку LiqPay
      const encoded = btoa(JSON.stringify(dataObj));
      setLiqpayUrl(`https://www.liqpay.ua/api/3/checkout?data=${encoded}&signature=DEMO`);
      setShowLiqpayView(true);
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
    {k:'home',ic:'⊞',lb:T.catalog},
    {k:'wishlist',ic:'♡',lb:T.wishlist,cnt:wish.length},
    {k:'cart',ic:'⊡',lb:T.cart,cnt:totItems},
    {k:'orders',ic:'↗',lb:T.orders},
    {k:'profile',ic:'○',lb:T.account},
  ];

  const obSlides=[
    {icon:'🛍',title:T.ob1title,sub:T.ob1sub,color:'#111'},
    {icon:'🚀',title:T.ob2title,sub:T.ob2sub,color:'#1d4ed8'},
    {icon:'⭐',title:T.ob3title,sub:T.ob3sub,color:'#059669'},
  ];

  const filtBranches=npBranches.filter(b=>
    b.desc.toLowerCase().includes(branchSearch.toLowerCase())||
    b.addr.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────
  // Onboarding and Auth are fullscreen overlays (no header/nav needed)
  // They stay mounted but hidden so they don't interfere with main app state
  
  // Show splash while AsyncStorage loads
  if(!_appLoaded){
    return(
      <View style={{flex:1,backgroundColor:'#111',justifyContent:'center',alignItems:'center'}}>
        <StatusBar barStyle="light-content"/>
        <Text style={{fontSize:32,fontWeight:'200',color:'#fff',letterSpacing:8,marginBottom:8}}>4YOU</Text>
        <Text style={{fontSize:10,color:'rgba(255,255,255,.3)',letterSpacing:4}}>STORE</Text>
        <ActivityIndicator color="rgba(255,255,255,.4)" style={{marginTop:32}}/>
      </View>
    );
  }

  return (
    <View style={{flex:1,backgroundColor:th.bg,paddingTop:IS_IOS?(IS_LARGE?47:20):0}}>
      <StatusBar barStyle={darkMode?'light-content':'dark-content'} backgroundColor={th.bg}/>
      {/* ── LOADING SPLASH ── */}
      {productsLoading&&!['onboarding','auth'].includes(scr)&&(
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:999}}>
          <LoadingSplash th={th}/>
        </View>
      )}
      {/* ── ONBOARDING ── */}
      {scr==='onboarding'&&(
        <SafeAreaView style={{flex:1,backgroundColor:th.bg}}>
          <View style={{flex:1,padding:32,justifyContent:'space-between'}}>
            <View style={{alignItems:'center',flex:1,justifyContent:'center'}}>
              <Text style={{fontSize:12,fontWeight:'900',letterSpacing:5,color:th.text4,marginBottom:48}}>{BRAND}</Text>
              <View style={{width:120,height:120,borderRadius:60,backgroundColor:obSlides[obStep].color+'18',justifyContent:'center',alignItems:'center',marginBottom:36}}>
                <Text style={{fontSize:52}}>{obSlides[obStep].icon}</Text>
              </View>
              <Text style={{fontSize:26,fontWeight:'200',color:th.text,textAlign:'center',letterSpacing:.5,marginBottom:14}}>{obSlides[obStep].title}</Text>
              <Text style={{fontSize:14,color:th.text3,textAlign:'center',lineHeight:22,fontWeight:'300'}}>{obSlides[obStep].sub}</Text>
              <View style={{flexDirection:'row',gap:8,marginTop:40}}>
                {obSlides.map((_,i)=>(
                  <View key={i} style={{width:i===obStep?24:8,height:8,borderRadius:4,backgroundColor:i===obStep?th.text:th.text4}}/>
                ))}
              </View>
            </View>
            <View style={{gap:12}}>
              {obStep<obSlides.length-1?(
                <>
                  <Btn th={th} label='→' onPress={()=>setObStep(s=>s+1)}/>
                  <TouchableOpacity onPress={()=>setObStep(obSlides.length-1)} style={{alignItems:'center',padding:10}}>
                    <Text style={{color:th.text4,fontSize:11,letterSpacing:1}}>{T.obSkip}</Text>
                  </TouchableOpacity>
                </>
              ):(
                <>
                  <Btn th={th} label={T.loginOrReg.toUpperCase()} onPress={()=>setScr('auth')}/>
                  <Btn th={th} label={T.continueGuest.toUpperCase()} onPress={()=>setScr('home')} ghost/>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ── AUTH ── */}
      {scr==='auth'&&(
        <SafeAreaView style={{flex:1,backgroundColor:th.bg}}>
          <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1}}>
            <ScrollView contentContainerStyle={{padding:28}} keyboardShouldPersistTaps="handled">
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:32}}>
                <TouchableOpacity onPress={()=>setScr('home')} style={{padding:8}}>
                  <Text style={{fontSize:20,color:th.text3}}>✕</Text>
                </TouchableOpacity>
                <Text style={{fontSize:12,fontWeight:'900',letterSpacing:5,color:th.text}}>{BRAND}</Text>
                <View style={{width:40}}/>
              </View>
              <Text style={{fontSize:24,fontWeight:'200',color:th.text,marginBottom:24,letterSpacing:.5}}>
                {authMode==='login'?T.loginTitle:T.registerTitle}
              </Text>
              <View style={{flexDirection:'row',backgroundColor:th.bg2,borderRadius:R,padding:4,marginBottom:24}}>
                {['login','register'].map(m=>(
                  <TouchableOpacity key={m} style={[{flex:1,paddingVertical:10,alignItems:'center',borderRadius:R-4},
                    authMode===m&&{backgroundColor:th.card}]} onPress={()=>{setAuthMode(m);setAuthErr('');}}>
                    <Text style={[{fontSize:11,fontWeight:'700',letterSpacing:1.5,color:th.text3},authMode===m&&{color:th.text}]}>
                      {m==='login'?T.loginTitle:T.registerTitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {authMode==='register'&&<AppInput th={th} label={T.authNameLbl} placeholder={T.authNamePl} value={authName} onChangeText={setAuthName}/>}
              <AppInput th={th} label={T.authEmailLbl} placeholder={T.authEmailPl} value={authEmail} onChangeText={setAuthEmail} keyboardType="email-address"/>
              <AppInput th={th} label={T.authPassLbl} placeholder={T.authPassPl} value={authPass} onChangeText={setAuthPass} secureTextEntry/>
              {authErr?<Text style={{color:th.danger,marginBottom:12,fontSize:12}}>{authErr}</Text>:null}
              <Btn th={th} label={authMode==='login'?T.loginSubmit:T.registerSubmit} onPress={doAuth} style={{marginTop:4,marginBottom:12}}/>
              <Btn th={th} label={T.guestContinue} onPress={()=>setScr('home')} ghost/>
              {authMode==='login'&&(
                <TouchableOpacity style={{marginTop:20,alignItems:'center'}}>
                  <Text style={{fontSize:11,color:th.text4,textDecorationLine:'underline'}}>{T.forgotPass}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      {/* ── MAIN APP (all screens always mounted, shown via display flex/none) ── */}
      {!['onboarding','auth'].includes(scr)&&(
        <View style={{flex:1,flexDirection:'column'}}>
          {/* ── HEADER (Kleidermafia style) ── */}
          <View style={{backgroundColor:th.bg,borderBottomWidth:1,borderBottomColor:th.navBorder}}>
            <View style={{flexDirection:'row',alignItems:'center',
              paddingHorizontal:16,paddingTop:IS_IOS?(IS_LARGE?8:4):8,paddingBottom:10}}>
              {/* Left — fixed 80px to mirror right side exactly */}
              <View style={{width:80,alignItems:'flex-start'}}>
                {showBack&&(
                  <TouchableOpacity onPress={back} style={{padding:4}}>
                    <Text style={{fontSize:22,color:th.text,fontWeight:'200'}}>‹</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Center: brand — perfectly centered */}
              <TouchableOpacity onPress={()=>{setScr('home');setCatFilter({cid:null,sub:null,badge:null});setSrch('');setShowSrch(false);setTimeout(()=>homeScrollRef.current?.scrollTo({y:0,animated:true}),50);}}
                style={{flex:1,alignItems:'center'}} activeOpacity={0.75}>
                <Text style={{fontSize:13,fontWeight:'900',letterSpacing:6,color:th.text,
                  textTransform:'uppercase',textAlign:'center'}} numberOfLines={1}>
                  {scr==='home'||scr==='success'?BRAND:TITLES[scr]||BRAND}
                </Text>
              </TouchableOpacity>
              {/* Right — same 80px */}
              <View style={{width:80,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:12}}>
                {scr==='home'&&(
                  <TouchableOpacity onPress={()=>{setShowSrch(v=>!v);if(showSrch)setSrch('');}} style={{padding:4}}>
                    <Text style={{fontSize:20,color:th.text,fontWeight:'200'}}>{showSrch?'✕':'⌕'}</Text>
                  </TouchableOpacity>
                )}
                {(scr==='home'||scr==='product')&&(
                  <TouchableOpacity
                    onPress={()=>setScr('cart')}
                    style={{borderWidth:1.5,borderColor:th.text,paddingHorizontal:10,paddingVertical:5,
                      borderRadius:20,flexDirection:'row',alignItems:'center',gap:4}}>
                    <Text style={{fontSize:8.5,fontWeight:'900',letterSpacing:0.5,color:th.text}}>
                      {lang==='EN'?'BAG':'КОШИК'}
                    </Text>
                    {totItems>0&&(
                      <View style={{backgroundColor:th.text,borderRadius:10,
                        minWidth:16,height:16,alignItems:'center',justifyContent:'center'}}>
                        <Text style={{fontSize:9,fontWeight:'900',color:th.bg}}>{totItems}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          {/* Screen container — ALL screens always rendered, toggled by display */}
          <View style={{flex:1}}>

            {/* ══ HOME ══════════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='home'?'flex':'none'}}>
              {showSrch&&(
                <View style={{backgroundColor:th.bg,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                  <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,gap:12}}>
                    <TextInput style={{flex:1,backgroundColor:th.bg2,paddingHorizontal:14,paddingVertical:10,
                      fontSize:13,borderRadius:R,color:th.inputText}}
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
                          {products.filter(p=>
                            p.name.toLowerCase().includes(srch.toLowerCase())||
                            (p.tags||[]).some(t=>t.includes(srch.toLowerCase()))
                          ).slice(0,6).map(p=>(
                            <TouchableOpacity key={p.id}
                              style={{flexDirection:'row',alignItems:'center',
                                paddingHorizontal:16,paddingVertical:10,gap:12}}
                              onPress={()=>{
                                setSel(p);setSelSz(null);setSelCl(null);
                                addToRecentlyViewed(p);
                                setSearchHistory(prev=>[p.name,...prev.filter(h=>h!==p.name)].slice(0,10));
                                setShowSuggestions(false);setShowSrch(false);setSrch('');
                                go('product');
                              }}>
                              <Image source={{uri:p.imgs?p.imgs[0]:p.img}}
                                style={{width:40,height:40,borderRadius:8}} resizeMode="cover"/>
                              <View style={{flex:1}}>
                                <Text style={{fontSize:12,color:th.text,fontWeight:'500'}} numberOfLines={1}>
                                  {p.name}
                                </Text>
                                <Text style={{fontSize:10,color:th.text4,marginTop:1}}>{p.price} ₴ · {p.cat}</Text>
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
              <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:GUTTER,paddingVertical:10,
                borderBottomWidth:1,borderBottomColor:th.cardBorder,gap:8,backgroundColor:th.bg}}>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:8,
                  borderWidth:1,borderColor:th.text,borderRadius:R,maxWidth:W*0.42}} onPress={()=>setShowCatModal(true)}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2,color:th.text}} numberOfLines={1}>{getCatLabel()}</Text>
                  <Text style={{fontSize:8,color:th.text3,marginLeft:6}}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:8,
                    borderWidth:1,borderColor:priceMin>0||priceMax<4000?th.text:th.cardBorder,
                    borderRadius:R,backgroundColor:priceMin>0||priceMax<4000?th.accent:'transparent',gap:4}}
                  onPress={()=>setShowPriceFilter(true)}>
                  <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1,
                    color:priceMin>0||priceMax<4000?th.accentText:th.text3}}>₴</Text>
                  {(priceMin>0||priceMax<4000)&&(
                    <Text style={{fontSize:8,fontWeight:'700',color:th.accentText}}>{priceMin}–{priceMax}</Text>
                  )}
                </TouchableOpacity>
                {/* Color/Size filter button */}
                <TouchableOpacity
                  style={{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:8,
                    borderWidth:1,gap:3,
                    borderColor:colorFilter||sizeFilter?th.text:th.cardBorder,
                    borderRadius:R,backgroundColor:colorFilter||sizeFilter?th.accent:'transparent'}}
                  onPress={()=>setShowColorSizeFilter(true)}>
                  <Text style={{fontSize:10,color:colorFilter||sizeFilter?th.accentText:th.text3}}>◈</Text>
                  {(colorFilter||sizeFilter)&&(
                    <Text style={{fontSize:8,fontWeight:'700',color:th.accentText}}>
                      {[colorFilter,sizeFilter].filter(Boolean).join('·')}
                    </Text>
                  )}
                </TouchableOpacity>
                {compareList.length>0&&(
                  <TouchableOpacity
                    style={{paddingHorizontal:10,paddingVertical:8,borderRadius:R,
                      backgroundColor:th.info,borderWidth:1,borderColor:th.info}}
                    onPress={()=>setShowCompare(true)}>
                    <Text style={{fontSize:9,fontWeight:'900',color:'#fff'}}>= {compareList.length}</Text>
                  </TouchableOpacity>
                )}
                <View style={{flex:1}}/>
                <Text style={{fontSize:9,color:th.text4}}>{allFilteredItems.length} товарів</Text>
                <TouchableOpacity style={{paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:th.cardBorder,borderRadius:R}}
                  onPress={()=>setShowSort(true)}>
                  <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1,color:th.text3}}>
                    ⇅ {sort==='popular'?T.popular:sort==='price_asc'?'↑':sort==='price_desc'?'↓':sort==='new'?T.newest:T.byRating}
                  </Text>
                </TouchableOpacity>
              </View>
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

                {/* ── HERO BANNER (Kleidermafia style) ── */}
                {!srch&&!catFilter.cid&&!catFilter.badge&&(
                  <View style={{width:'100%',marginBottom:0}}>
                    {/* Hero slide */}
                    <TouchableOpacity activeOpacity={0.95}
                      onPress={()=>{setCatFilter({cid:heroSlides[heroIdx]?.cid,sub:null,badge:null});}}>
                      <Animated.View style={{opacity:heroAnim.interpolate({inputRange:[0,1],outputRange:[1,0],extrapolate:'clamp'})}}>
                        <View style={{width:'100%',height:H*0.52,backgroundColor:'#111'}}>
                          {!!(heroSlides[heroIdx]?.img)&&(
                            <Image
                              source={{uri:heroSlides[heroIdx].img}}
                              style={{width:'100%',height:'100%',resizeMode:'cover'}}/>
                          )}
                        </View>
                        <View style={{position:'absolute',bottom:0,left:0,right:0,
                          paddingHorizontal:20,paddingBottom:28,paddingTop:60,
                          background:'transparent'}}>
                          <View style={{backgroundColor:'rgba(0,0,0,0.45)',
                            position:'absolute',bottom:0,left:0,right:0,top:0}}/>
                          <Text style={{fontSize:9,fontWeight:'900',letterSpacing:4,
                            color:'rgba(255,255,255,0.7)',marginBottom:6}}>4YOU.STORE</Text>
                          <Text style={{fontSize:34,fontWeight:'900',color:'#fff',
                            letterSpacing:-0.5,lineHeight:38,marginBottom:6}}>
                            {heroSlides[heroIdx]?.title||''}
                          </Text>
                          <Text style={{fontSize:11,color:'rgba(255,255,255,0.75)',
                            letterSpacing:1,marginBottom:18}}>
                            {heroSlides[heroIdx]?.sub||''}
                          </Text>
                          <View style={{flexDirection:'row',alignItems:'center',gap:16}}>
                            <View style={{backgroundColor:'#fff',paddingHorizontal:20,
                              paddingVertical:10,borderRadius:2}}>
                              <Text style={{fontSize:10,fontWeight:'900',letterSpacing:2,color:'#111'}}>
                                ДИВИТИСЬ →
                              </Text>
                            </View>
                            {/* Dots */}
                            <View style={{flexDirection:'row',gap:6}}>
                              {heroSlides.map((_,i)=>(
                                <TouchableOpacity key={i} onPress={()=>setHeroIdx(i)}>
                                  <View style={{width:i===heroIdx?20:6,height:6,borderRadius:3,
                                    backgroundColor:i===heroIdx?'#fff':'rgba(255,255,255,0.4)',}}/>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        </View>
                      </Animated.View>
                    </TouchableOpacity>

                    {/* ── CATEGORY GRID: Kleidermafia 2-column style ── */}
                    <View style={{paddingTop:16,paddingBottom:4}}>
                      <View style={{flexDirection:'row',justifyContent:'space-between',
                        alignItems:'center',paddingHorizontal:16,marginBottom:12}}>
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:4,color:th.text}}>
                          {lang==='EN'?'SHOP BY CATEGORY':'КАТЕГОРІЇ'}
                        </Text>
                        <TouchableOpacity onPress={()=>setShowCatModal(true)}>
                          <Text style={{fontSize:9,color:th.text3,letterSpacing:1}}>
                            {lang==='EN'?'ALL →':'ВСЕ →'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {/* First row: 2 big tiles */}
                      <View style={{flexDirection:'row',paddingHorizontal:16,gap:8,marginBottom:8}}>
                        {catTiles.slice(0,2).map((cat)=>(
                          <TouchableOpacity key={cat.id} activeOpacity={0.85}
                            onPress={()=>setCatFilter({cid:cat.id,sub:null,badge:null})}
                            style={{flex:1,height:200,borderRadius:4,overflow:'hidden',
                              borderWidth:catFilter.cid===cat.id?2.5:0,borderColor:'#fff'}}>
                            {!!cat.img&&<Image source={{uri:cat.img}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>}
                            <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
                              backgroundColor:catFilter.cid===cat.id?'rgba(0,0,0,0.15)':'rgba(0,0,0,0.28)'}}/>
                            <View style={{position:'absolute',bottom:14,left:14,right:14}}>
                              <Text style={{fontSize:16,fontWeight:'900',color:'#fff',
                                letterSpacing:0.5,textShadowColor:'rgba(0,0,0,0.5)',
                                textShadowOffset:{width:0,height:1},textShadowRadius:4}}>
                                {lang==='EN'?CAT_TREE.find(t=>t.id===cat.id)?.labelEN||cat.label:cat.label}
                              </Text>
                              <Text style={{fontSize:9,color:'rgba(255,255,255,0.8)',
                                letterSpacing:1,marginTop:3,fontWeight:'600'}}>
                                {lang==='EN'?'SHOP NOW →':'ДИВИТИСЬ →'}
                              </Text>
                            </View>
                            {catFilter.cid===cat.id&&(
                              <View style={{position:'absolute',top:10,right:10,
                                backgroundColor:'#fff',paddingHorizontal:8,paddingVertical:3,borderRadius:2}}>
                                <Text style={{fontSize:8,fontWeight:'900',color:'#111',letterSpacing:1}}>✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                      {/* Second row: 3 smaller tiles */}
                      <View style={{flexDirection:'row',paddingHorizontal:16,gap:8,marginBottom:8}}>
                        {catTiles.slice(2,5).map((cat)=>(
                          <TouchableOpacity key={cat.id} activeOpacity={0.85}
                            onPress={()=>setCatFilter({cid:cat.id,sub:null,badge:null})}
                            style={{flex:1,height:130,borderRadius:4,overflow:'hidden',
                              borderWidth:catFilter.cid===cat.id?2.5:0,borderColor:'#fff'}}>
                            {!!cat.img&&<Image source={{uri:cat.img}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>}
                            <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
                              backgroundColor:catFilter.cid===cat.id?'rgba(0,0,0,0.15)':'rgba(0,0,0,0.35)'}}/>
                            <View style={{position:'absolute',bottom:10,left:10,right:10}}>
                              <Text style={{fontSize:11,fontWeight:'900',color:'#fff',letterSpacing:0.3,
                                textShadowColor:'rgba(0,0,0,0.5)',textShadowOffset:{width:0,height:1},
                                textShadowRadius:4}}>
                                {lang==='EN'?CAT_TREE.find(t=>t.id===cat.id)?.labelEN||cat.label:cat.label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={{height:1,backgroundColor:th.cardBorder,marginHorizontal:16,marginTop:16,marginBottom:4}}/>
                  </View>
                )}

                {recentlyViewed.length>0&&!srch&&!catFilter.cid&&!catFilter.badge&&(
                  <View style={{width:'100%',marginBottom:20}}>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>НЕЩОДАВНО ПЕРЕГЛЯНУТІ</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>
                      {recentlyViewed.slice(0,6).map(item=>(
                        <TouchableOpacity key={item.id} style={{width:100}}
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

                    {/* NEW ARRIVALS row */}
                    {(()=>{
                      const newItems=products.filter(p=>p.badge==='Новинка').slice(-10).reverse();
                      if(!newItems.length) return null;
                      return(
                        <View style={{marginBottom:24}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',
                            alignItems:'center',paddingHorizontal:16,marginBottom:12}}>
                            <Text style={{fontSize:13,fontWeight:'800',color:th.text,letterSpacing:-0.3}}>
                              {lang==='EN'?'New Arrivals':'Нові надходження'}
                            </Text>
                            <TouchableOpacity onPress={()=>setCatFilter({cid:null,sub:null,badge:'Новинка'})}>
                              <Text style={{fontSize:11,color:th.text4}}>
                                {lang==='EN'?'See all →':'Всі →'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{paddingHorizontal:16,gap:12}}>
                            {newItems.map(item=>(
                              <TouchableOpacity key={item.id}
                                onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}
                                style={{width:130}}>
                                <View style={{width:130,height:170,borderRadius:16,overflow:'hidden',
                                  backgroundColor:th.bg2}}>
                                  <Image source={{uri:item.imgs?.[0]||item.img}}
                                    style={{width:130,height:170}} resizeMode="cover"/>
                                  <View style={{position:'absolute',top:8,left:8,
                                    backgroundColor:'#059669',paddingHorizontal:7,paddingVertical:3,borderRadius:8}}>
                                    <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>NEW</Text>
                                  </View>
                                </View>
                                <Text style={{fontSize:11,color:th.text,marginTop:7,fontWeight:'600',lineHeight:15}}
                                  numberOfLines={2}>{item.name}</Text>
                                <Text style={{fontSize:12,fontWeight:'900',color:th.text}}>{item.price} ₴</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })()}

                    {/* SALE row */}
                    {(()=>{
                      const saleItems=products.filter(p=>p.badge==='Sale').slice(-8).reverse();
                      if(!saleItems.length) return null;
                      return(
                        <View style={{marginBottom:24}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',
                            alignItems:'center',paddingHorizontal:16,marginBottom:12}}>
                            <Text style={{fontSize:13,fontWeight:'800',color:th.text,letterSpacing:-0.3}}>SALE</Text>
                            <TouchableOpacity onPress={()=>setCatFilter({cid:null,sub:null,badge:'Sale'})}>
                              <Text style={{fontSize:11,color:th.text4}}>
                                {lang==='EN'?'See all →':'Всі →'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{paddingHorizontal:16,gap:12}}>
                            {saleItems.map(item=>(
                              <TouchableOpacity key={item.id}
                                onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}
                                style={{width:130}}>
                                <View style={{width:130,height:170,borderRadius:16,overflow:'hidden',
                                  backgroundColor:th.bg2}}>
                                  <Image source={{uri:item.imgs?.[0]||item.img}}
                                    style={{width:130,height:170}} resizeMode="cover"/>
                                  <View style={{position:'absolute',top:8,left:8,
                                    backgroundColor:'#dc2626',paddingHorizontal:7,paddingVertical:3,borderRadius:8}}>
                                    <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>SALE</Text>
                                  </View>
                                  {item.old&&(
                                    <View style={{position:'absolute',bottom:8,right:8,
                                      backgroundColor:'rgba(0,0,0,.65)',paddingHorizontal:6,paddingVertical:3,borderRadius:6}}>
                                      <Text style={{color:'#fff',fontSize:9,textDecorationLine:'line-through'}}>{item.old} ₴</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={{fontSize:11,color:th.text,marginTop:7,fontWeight:'600',lineHeight:15}}
                                  numberOfLines={2}>{item.name}</Text>
                                <View style={{flexDirection:'row',gap:6,alignItems:'center',marginTop:2}}>
                                  <Text style={{fontSize:12,fontWeight:'900',color:'#dc2626'}}>{item.price} ₴</Text>
                                  {item.old&&<Text style={{fontSize:10,color:th.text4,textDecorationLine:'line-through'}}>{item.old} ₴</Text>}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })()}

                    {/* CATEGORY TILES — quick nav */}
                    <View style={{paddingHorizontal:16,marginBottom:20}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,
                        color:th.text4,marginBottom:12}}>
                        {lang==='EN'?'CATEGORIES':'КАТЕГОРІЇ'}
                      </Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                        {[
                          {cid:'outerwear',label:'Куртки',labelEN:'Outerwear'},
                          {cid:'hoodies',label:'Кофти',labelEN:'Hoodies'},
                          {cid:'tshirts',label:'Футболки',labelEN:'T-Shirts'},
                          {cid:'pants',label:'Штани',labelEN:'Pants'},
                          {cid:'costumes',label:'Костюми',labelEN:'Suits'},
                          {cid:'accessories',label:'Взуття',labelEN:'Shoes'},
                        ].map(cat=>(
                          <TouchableOpacity key={cat.cid}
                            onPress={()=>setCatFilter({cid:cat.cid,sub:null,badge:null})}
                            style={{paddingHorizontal:14,paddingVertical:8,
                              borderRadius:20,borderWidth:1,borderColor:th.cardBorder,
                              backgroundColor:th.bg}}>
                            <Text style={{fontSize:12,color:th.text,fontWeight:'500'}}>
                              {lang==='EN'?cat.labelEN:cat.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* HIT products row */}
                    {(()=>{
                      const hitItems=products.filter(p=>p.badge==='Хіт').slice(-8).reverse();
                      if(!hitItems.length) return null;
                      return(
                        <View style={{marginBottom:24}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',
                            alignItems:'center',paddingHorizontal:16,marginBottom:12}}>
                            <Text style={{fontSize:13,fontWeight:'800',color:th.text}}>
                              {lang==='EN'?'Best Sellers':'Бестселери'}
                            </Text>
                            <TouchableOpacity onPress={()=>setShowCatModal(true)}>
                              <Text style={{fontSize:11,color:th.text4}}>
                                {lang==='EN'?'All items →':'Весь каталог →'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{paddingHorizontal:16,gap:12}}>
                            {hitItems.map(item=>(
                              <TouchableOpacity key={item.id}
                                onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}
                                style={{width:130}}>
                                <View style={{width:130,height:170,borderRadius:16,overflow:'hidden',
                                  backgroundColor:th.bg2}}>
                                  <Image source={{uri:item.imgs?.[0]||item.img}}
                                    style={{width:130,height:170}} resizeMode="cover"/>
                                  <View style={{position:'absolute',top:8,left:8,
                                    backgroundColor:'#111',paddingHorizontal:7,paddingVertical:3,borderRadius:8}}>
                                    <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>ХІТ</Text>
                                  </View>
                                </View>
                                <Text style={{fontSize:11,color:th.text,marginTop:7,fontWeight:'600',lineHeight:15}}
                                  numberOfLines={2}>{item.name}</Text>
                                <Text style={{fontSize:12,fontWeight:'900',color:th.text}}>{item.price} ₴</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })()}

                    {/* ── BRAND FOOTER ── */}
                    <View style={{marginTop:4,borderTopWidth:1,borderTopColor:th.cardBorder}}>

                      {/* Scrolling marquee */}
                      <View style={{overflow:'hidden',paddingVertical:20,
                        borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                        <Animated.View style={{flexDirection:'row',
                          transform:[{translateX:marqueeX.interpolate({
                            inputRange:[-1,0],outputRange:[-W*2.4,0],extrapolate:'clamp'
                          })}]}}>
                          {Array(10).fill(null).map((_,i)=>(
                            <Text key={i} style={{fontSize:18,fontWeight:'900',color:th.text,
                              letterSpacing:5,marginRight:28,textTransform:'uppercase'}}>
                              4YOU TEAM
                            </Text>
                          ))}
                        </Animated.View>
                      </View>

                      {/* Accordion */}
                      {[
                        {key:'info',
                          title:lang==='EN'?'INFORMATION & LEGAL':'ІНФОРМАЦІЯ ТА УМОВИ',
                          items:lang==='EN'
                            ?['About Us','Privacy Policy','Terms & Conditions','Contacts']
                            :['Про нас','Політика конфіденційності','Умови та положення','Контакти']},
                        {key:'service',
                          title:lang==='EN'?'SERVICE & SUPPORT':'СЕРВІС ТА ПІДТРИМКА',
                          items:lang==='EN'
                            ?['FAQ','Shipping','Returns & Exchanges','Track Order']
                            :['Часті запитання','Доставка','Повернення та обмін','Відстежити замовлення']},
                        {key:'signup',
                          title:lang==='EN'?'SIGN UP AND SAVE':'ПІДПИШИСЬ ТА ЗАОЩАДЖУЙ',
                          items:lang==='EN'
                            ?['Newsletter — -10% on first order','Exclusive offers','New collection alerts']
                            :['Розсилка — -10% на перше замовлення','Ексклюзивні пропозиції','Сповіщення про нові колекції']},
                      ].map(sec=>(
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
                          {'© 2026 4YOU.STORE'}
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
                    <View key={item.id} style={{width:CARD_W,marginBottom:GUTTER*2,marginRight:i%2===0?GUTTER/2:0,marginLeft:i%2!==0?GUTTER/2:0}}>
                      {item.badge&&(
                        <View style={{position:'absolute',top:10,left:10,zIndex:2,
                          backgroundColor:item.badge==='Sale'?'#dc2626':item.badge==='Хіт'?'#111':'#059669',
                          paddingHorizontal:8,paddingVertical:3,borderRadius:6}}>
                          <Text style={{color:'#fff',fontSize:8,fontWeight:'900',letterSpacing:1}}>{item.badge.toUpperCase()}</Text>
                        </View>
                      )}
                      {item.stock>0&&item.stock<=3&&(
                        <View style={{position:'absolute',bottom:90,right:8,zIndex:2,
                          backgroundColor:'rgba(220,38,38,0.9)',
                          paddingHorizontal:7,paddingVertical:3,borderRadius:6}}>
                          <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>{'Залишок: '+item.stock}</Text>
                        </View>
                      )}
                      <TouchableOpacity style={{position:'absolute',top:10,right:10,zIndex:2,
                        backgroundColor:'rgba(255,255,255,.88)',width:32,height:32,borderRadius:16,
                        justifyContent:'center',alignItems:'center'}}
                        onPress={()=>setWish(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id])}>
                        <Text style={{fontSize:14,color:wished?'#dc2626':'#aaa'}}>{wished?'♥':'♡'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.9}
                        onLongPress={()=>{setQuickAddItem(item);setQuickAddSz(null);setQuickAddCl(null);}}
                        onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}>
                        <View style={{borderRadius:R,overflow:'hidden'}}>
                          {!imgLoaded[`g_${item.id}`]&&(
                            <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:1}}>
                              <Skeleton width={CARD_W} height={CARD_H}/>
                            </View>
                          )}
                          <Image source={{uri:item.img}} style={{width:CARD_W,height:CARD_H}} resizeMode="cover"
                            onLoad={()=>setImgLoaded(p=>({...p,[`g_${item.id}`]:true}))}/>
                          {inCart>0&&<View style={{position:'absolute',bottom:10,right:10,width:22,height:22,
                            backgroundColor:'#111',borderRadius:11,justifyContent:'center',alignItems:'center',zIndex:2}}>
                            <Text style={{color:'#fff',fontSize:9,fontWeight:'900'}}>{inCart}</Text>
                          </View>}
                        </View>
                        <View style={{paddingTop:10,paddingHorizontal:2}}>
                          <Text style={{fontSize:11,fontWeight:'400',color:th.text,lineHeight:16}} numberOfLines={2}>{item.name}</Text>
                          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                            <Text style={{fontSize:12,fontWeight:'900',color:th.text}}>{item.price} ₴</Text>
                            {item.old&&<Text style={{fontSize:10,color:th.text4,textDecorationLine:'line-through'}}>{item.old} ₴</Text>}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
  
                  </>
                )}
              </ScrollView>
            </View>{/* END HOME */}

            {/* ══ PRODUCT ═══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='product'?'flex':'none',position:'relative'}}>
              {/* Sticky CTA bar */}
              {sel&&selSz&&(
                <View style={{position:'absolute',bottom:0,left:0,right:0,zIndex:50,
                  backgroundColor:th.bg,borderTopWidth:1,borderTopColor:th.cardBorder,
                  paddingHorizontal:20,paddingTop:10,paddingBottom:HOME_IND+10,
                  flexDirection:'row',alignItems:'center',gap:12}}>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:10,color:th.text4,letterSpacing:0.5}} numberOfLines={1}>{sel.name}</Text>
                    <Text style={{fontSize:16,fontWeight:'900',color:th.text}}>{sel.price} ₴ · {selSz}</Text>
                  </View>
                  <TouchableOpacity
                    style={{backgroundColor:th.text,paddingHorizontal:24,paddingVertical:12,borderRadius:24}}
                    onPress={()=>{addToCart(sel,selSz,selCl||'');triggerBagAnim(sel);showNotif(`Додано: ${sel.name}`,'success');setLastAdded({...sel,size:selSz,color:selCl||''});setShowCartModal(true);}}>
                    <Text style={{color:th.bg,fontSize:10,fontWeight:'900',letterSpacing:1}}>
                      {lang==='EN'?'ADD TO BAG ✈':'ДОДАТИ ✈'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {sel&&(
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
                      <Text style={{color:'#daa520',fontSize:12}}>{'★'.repeat(Math.round(sel.r))+'☆'.repeat(5-Math.round(sel.r))}</Text>
                      <Text style={{color:th.text3,fontSize:11,marginLeft:4}}>{sel.r} · {sel.rv} {T.reviews}</Text>
                    </View>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>
                      {T.color} <Text style={{fontWeight:'200',letterSpacing:0}}>{selCl||T.selectColor}</Text>
                    </Text>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:22}}>
                      {sel.cl.map(c=>(
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
                        <Text style={{fontSize:10,color:th.text3,textDecorationLine:'underline',fontWeight:'700'}}>{T.sizeGuide}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24}}>
                      {sel.sz.map(s=>(
                        <TouchableOpacity key={s}
                          style={{width:52,height:40,borderWidth:1,borderRadius:R,
                            borderColor:selSz===s?th.text:th.cardBorder,backgroundColor:selSz===s?th.accent:'transparent',
                            justifyContent:'center',alignItems:'center'}}
                          onPress={()=>setSelSz(s)}>
                          <Text style={{fontSize:11,fontWeight:'700',color:selSz===s?th.accentText:th.text2}}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Btn th={th} label={!selSz?T.selectSize:T.addToCart} disabled={!selSz}
                      onPress={()=>{if(!selSz)return;addToCart(sel,selSz,selCl||'');triggerBagAnim(sel);showNotif(`${sel.name} — додано в кошик`,'success');setLastAdded({...sel,size:selSz,color:selCl||''});setShowCartModal(true);}}
                      style={{marginBottom:10}}/>
                    <View style={{flexDirection:'row',gap:10,marginBottom:28}}>
                      <Btn th={th} label={wish.includes(sel.id)?T.inWishlist:T.addToWishlist} ghost
                        onPress={()=>setWish(p=>p.includes(sel.id)?p.filter(x=>x!==sel.id):[...p,sel.id])} style={{flex:1}}/>
                      <TouchableOpacity
                        style={{width:48,height:48,borderWidth:1,borderColor:th.cardBorder,borderRadius:R,justifyContent:'center',alignItems:'center'}}
                        onPress={()=>Share.share({message:`${sel.name} — ${sel.price} ₴\n4YOU.STORE`})}>
                        <Text style={{fontSize:18}}>↗</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:10}}>{T.description}</Text>
                    <Text style={{fontSize:13,color:th.text2,lineHeight:22,fontWeight:'300',marginBottom:24}}>{sel.desc}</Text>
                    <View style={{paddingTop:20,borderTopWidth:1,borderTopColor:th.cardBorder,marginBottom:24}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>{T.delivery}</Text>
                      {[['→',T.deliveryInfo],['₴',T.deliveryCost],['↩',T.returns]].map(([ic,tx],i)=>(
                        <View key={i} style={{flexDirection:'row',gap:12,marginBottom:10}}>
                          <Text style={{fontSize:11,color:th.text4,width:16}}>{ic}</Text>
                          <Text style={{fontSize:12,color:th.text2,fontWeight:'300',flex:1}}>{tx}</Text>
                        </View>
                      ))}
                    </View>
                    {/* ── ВІДГУКИ ── */}
                    <View style={{paddingTop:20,borderTopWidth:1,borderTopColor:th.cardBorder}}>
                      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                        <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text}}>
                          ВІДГУКИ ({(reviews[sel.id]||[]).length + sel.rv})
                        </Text>
                        <TouchableOpacity onPress={()=>setShowAddReview(true)}
                          style={{paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:th.text,borderRadius:R}}>
                          <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1,color:th.text}}>+ НАПИСАТИ</Text>
                        </TouchableOpacity>
                      </View>
                      {/* User reviews */}
                      {(reviews[sel.id]||[]).map((rv,i)=>(
                        <View key={i} style={{paddingVertical:14,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                            <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>{rv.author}</Text>
                            <Text style={{fontSize:10,color:th.text4}}>{rv.date}</Text>
                          </View>
                          <Text style={{color:'#daa520',fontSize:12,marginBottom:6}}>{'★'.repeat(rv.rating)+'☆'.repeat(5-rv.rating)}</Text>
                          <Text style={{fontSize:12,color:th.text2,fontWeight:'300',lineHeight:18}}>{rv.text}</Text>
                        </View>
                      ))}
                      {/* Sample reviews */}
                      <View style={{paddingVertical:14,borderBottomWidth:1,borderBottomColor:th.cardBorder}}>
                        <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                          <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>Олег К.</Text>
                          <Text style={{fontSize:10,color:th.text4}}>15.01.2026</Text>
                        </View>
                        <Text style={{color:'#daa520',fontSize:12,marginBottom:6}}>★★★★★</Text>
                        <Text style={{fontSize:12,color:th.text2,fontWeight:'300',lineHeight:18}}>Чудова якість, швидка доставка. Рекомендую!</Text>
                      </View>
                    </View>
                    {/* ── СХОЖІ ТОВАРИ ── */}
                    {(()=>{
                      const similar=products.filter(p=>p.cid===sel?.cid&&p.id!==sel?.id).slice(0,8);
                      if(!similar.length) return null;
                      return(
                        <View style={{paddingTop:24,borderTopWidth:1,borderTopColor:th.cardBorder,marginTop:4}}>
                          <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text,marginBottom:16}}>
                            {lang==='EN'?'YOU MAY ALSO LIKE':'ВАМ МОЖЕ СПОДОБАТИСЬ'}
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{gap:12}}>
                            {similar.map(item=>(
                              <TouchableOpacity key={item.id} style={{width:130}}
                                onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);productScrollRef.current?.scrollTo({y:0,animated:true});}}>
                                <View style={{width:130,height:170,borderRadius:20,overflow:'hidden',backgroundColor:th.bg2}}>
                                  <Image source={{uri:item.imgs?.[0]||item.img}}
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
                          {recentlyViewed.filter(p=>p.id!==sel?.id).slice(0,6).map(item=>(
                            <TouchableOpacity key={item.id} style={{width:120,marginRight:12}}
                              onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);}}>
                              <Image source={{uri:item.img}} style={{width:120,height:160,borderRadius:R}} resizeMode="cover"/>
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
                  <AppInput th={th} label={T.city} placeholder={T.cityPl} value={dCity}
                    error={fieldErrors.dCity}
                    onChangeText={v=>{setDCity(v);setDBranch('');setNpBranches([]);setBranchSearch('');if(fieldErrors.dCity)setFieldErrors(p=>({...p,dCity:null}));}}/>
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
                            onPress={()=>{setDBranch(b.desc);if(fieldErrors.dBranch)setFieldErrors(p=>({...p,dBranch:null}));Keyboard.dismiss();}}>
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
                  {[{k:'liqpay',ic:'🇺🇦',lb:T.liqpayName,sb:T.liqpayDesc},{k:'card',ic:'💳',lb:T.cardName,sb:T.cardDesc},{k:'cod',ic:'₴',lb:T.codName,sb:T.codDesc}].map(m=>(
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
              <ScrollView contentContainerStyle={{padding:24,paddingBottom:16,alignItems:'center',flexGrow:1}}>
                <View style={{width:80,height:80,borderRadius:40,backgroundColor:'#dcfce7',justifyContent:'center',alignItems:'center',marginBottom:24,marginTop:32}}>
                  <Text style={{fontSize:36}}>✓</Text>
                </View>
                <Text style={{fontSize:13,letterSpacing:3,color:th.text,fontWeight:'900',marginBottom:8,textAlign:'center'}}>{T.orderSuccess}</Text>
                <Text style={{fontSize:12,color:th.text3,marginBottom:36,fontWeight:'300',textAlign:'center'}}>{T.smsNotice}</Text>
                {orders[0]&&<View style={{width:'100%',backgroundColor:th.bg2,padding:20,borderRadius:R,marginBottom:16}}>
                  {[[T.orderNum,'#'+orders[0].id],[T.orderDate,orders[0].date],[T.orderCity,orders[0].city],[T.orderPay,orders[0].pay],[T.orderSum,orders[0].total+' ₴']].map(([l,v],i)=>(
                    <View key={i} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:i<4?1:0,borderBottomColor:th.cardBorder}}>
                      <Text style={{fontSize:10,color:th.text3,letterSpacing:1.5,fontWeight:'700'}}>{l}</Text>
                      <Text style={{fontSize:12,fontWeight:'700',color:th.text}}>{v}</Text>
                    </View>
                  ))}
                </View>}
                <View style={{width:'100%',backgroundColor:'#dcfce7',padding:16,borderRadius:R,marginBottom:24,flexDirection:'row',alignItems:'center',gap:12}}>
                  <Text style={{fontSize:24}}>⭐</Text>
                  <View>
                    <Text style={{fontSize:12,fontWeight:'700',color:'#15803d'}}>{T.bonusEarnedLbl.replace('{n}',orders[0]?Math.floor(orders[0].total*0.05):0)}</Text>
                    <Text style={{fontSize:10,color:'#166534',marginTop:2}}>{T.bonusEarnedSub}</Text>
                  </View>
                </View>
                <Btn th={th} label={T.toOrders} onPress={()=>setScr('orders')} style={{width:'100%',marginBottom:12}}/>
                <Btn th={th} label={T.toMain} onPress={()=>setScr('home')} ghost style={{width:'100%'}}/>
              </ScrollView>
            </View>{/* END SUCCESS */}

            {/* ══ WISHLIST ══════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='wishlist'?'flex':'none',backgroundColor:th.bg}}>
              {wish.length===0?(
                <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:48}}>
                  <Text style={{fontSize:40,marginBottom:16}}>♡</Text>
                  <Text style={{fontSize:9,letterSpacing:4,color:th.text4,marginBottom:20}}>{T.emptyWish}</Text>
                  <Btn th={th} label={T.toCatalog} onPress={()=>setScr('home')} style={{paddingHorizontal:40}}/>
                </View>
              ):(
                <ScrollView contentContainerStyle={S.wishContent}>
                  {products.filter(p=>wish.includes(p.id)).map((item,i)=>(
                    <View key={item.id} style={{width:CARD_W,marginBottom:GUTTER*2,marginRight:i%2===0?GUTTER/2:0,marginLeft:i%2!==0?GUTTER/2:0}}>
                      <TouchableOpacity style={{position:'absolute',top:10,right:10,zIndex:2,backgroundColor:'rgba(255,255,255,.88)',width:32,height:32,borderRadius:16,justifyContent:'center',alignItems:'center'}}
                        onPress={()=>setWish(p=>p.filter(x=>x!==item.id))}>
                        <Text style={{fontSize:14,color:'#dc2626'}}>♥</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={()=>{setSel(item);setSelSz(null);setSelCl(null);addToRecentlyViewed(item);go('product');}}>
                        <View style={{borderRadius:R,overflow:'hidden'}}>
                          <Image source={{uri:item.img}} style={{width:CARD_W,height:CARD_H}} resizeMode="cover"/>
                        </View>
                        <View style={{paddingTop:8,paddingHorizontal:2}}>
                          <Text style={{fontSize:11,color:th.text,lineHeight:16}} numberOfLines={2}>{item.name}</Text>
                          <Text style={{fontSize:12,fontWeight:'900',color:th.text,marginTop:4}}>{item.price} ₴</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={{marginHorizontal:2,marginTop:8,paddingVertical:10,backgroundColor:th.accent,borderRadius:R,alignItems:'center'}}
                        onPress={()=>{addToCart(item,item.sz[0],item.cl[0]);setLastAdded({...item,size:item.sz[0],color:item.cl[0]});setShowCartModal(true);}}>
                        <Text style={{color:th.accentText,fontSize:9,fontWeight:'900',letterSpacing:1}}>{T.addCartBtn}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={{height:24,width:'100%'}}/>
                </ScrollView>
              )}
            </View>{/* END WISHLIST */}

            {/* ══ ORDERS ════════════════════════════════════════ */}
            <View style={{flex:1,display:scr==='orders'?'flex':'none',backgroundColor:th.bg}}>
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}>
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
                        <View key={i} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:i<4?1:0,borderBottomColor:th.cardBorder}}>
                          <Text style={{fontSize:10,color:th.text3,letterSpacing:1.5,fontWeight:'700'}}>{l}</Text>
                          <Text style={{fontSize:12,fontWeight:'600',color:th.text,maxWidth:W*0.5,textAlign:'right'}}>{v}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{backgroundColor:th.bg2,padding:16,borderRadius:R,marginBottom:12}}>
                      <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text,marginBottom:12}}>{T.orderItems}</Text>
                      {selOrder.items.map((it,i)=><Text key={i} style={{fontSize:12,color:th.text2,fontWeight:'300',marginBottom:6,lineHeight:18}}>· {it}</Text>)}
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
                      <TouchableOpacity key={o.id}
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
                      onPress={()=>{setScr('admin');setAdminTab('products');loadAdminProducts();}}
                      style={{flexDirection:'row',alignItems:'center',backgroundColor:th.bg2,
                        borderRadius:16,padding:16,gap:14}}>
                      <View style={{width:44,height:44,borderRadius:12,backgroundColor:'#111',
                        justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:20}}>📦</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:th.text}}>Товари</Text>
                        <Text style={{fontSize:11,color:th.text4,marginTop:1}}>
                          {products.length} позицій · {products.filter(p=>p.stock<=3&&p.stock>0).length} закінчуються
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
                  </View>

                  {/* Система */}
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:3,color:th.text4,
                    paddingHorizontal:20,marginTop:24,marginBottom:10}}>СИСТЕМА</Text>

                  <View style={{marginHorizontal:16,backgroundColor:th.bg2,borderRadius:16,overflow:'hidden'}}>
                    {[
                      ['Build',    'BUILD-8K99NZ-SIX077 · v3.5'],
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
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}>
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
                  <View style={{flexDirection:'row',gap:8}}>
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
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}>
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
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}>
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
              <ScrollView contentContainerStyle={{padding:16,paddingBottom:16}}>
                <View style={{backgroundColor:th.bg2,borderRadius:R,padding:16,marginBottom:12}}>
                  <Text style={{fontSize:9,fontWeight:'900',letterSpacing:2.5,color:th.text3,marginBottom:16}}>{T.contacts}</Text>
                  {[['Telegram','@4youstore'],['Instagram','@4you.store'],['Tel','+380 67 194 87 54'],['Email','hello@4you.store'],['📅','08:00 – 22:00']].map(([l,v],i)=>(
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
                <>
                  {/* Admin tabs */}
                  <View style={{flexDirection:'row',borderBottomWidth:1,borderBottomColor:th.cardBorder,backgroundColor:th.bg}}>
                    {[['products','Товари'],['stats','Статистика'],['orders','Замовлення']].map(([k,lb])=>(
                      <TouchableOpacity key={k} onPress={()=>{setAdminTab(k);if(k==='products')loadAdminProducts();}}
                        style={{flex:1,paddingVertical:14,alignItems:'center',
                          borderBottomWidth:2,borderBottomColor:adminTab===k?th.text:'transparent'}}>
                        <Text style={{fontSize:11,fontWeight:'900',letterSpacing:1,
                          color:adminTab===k?th.text:th.text4}}>{lb}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* PRODUCTS SEARCH BAR */}
                  {adminTab==='products'&&(
                    <View style={{paddingHorizontal:16,paddingTop:12,paddingBottom:4}}>
                      <View style={{flexDirection:'row',alignItems:'center',
                        backgroundColor:th.bg2,borderRadius:16,paddingHorizontal:12,paddingVertical:8,gap:8}}>
                        <Text style={{color:th.text4,fontSize:14}}>⌕</Text>
                        <TextInput style={{flex:1,fontSize:12,color:th.inputText}}
                          placeholder={'Пошук серед '+adminProducts.length+' товарів...'}
                          placeholderTextColor={th.text4}
                          value={adminSearch} onChangeText={setAdminSearch}/>
                        {adminSearch.length>0&&(
                          <TouchableOpacity onPress={()=>setAdminSearch('')}>
                            <Text style={{color:th.text4,fontSize:12}}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* PRODUCTS TAB */}
                  {adminTab==='products'&&(
                    <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:40}}>
                      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                        <Text style={{fontSize:9,letterSpacing:2,fontWeight:'900',color:th.text}}>
                          {adminProducts.length} ТОВАРІВ
                        </Text>
                        <View style={{flexDirection:'row',gap:8}}>
                          <TouchableOpacity onPress={loadAdminProducts}
                            style={{paddingHorizontal:12,paddingVertical:6,borderRadius:12,
                              borderWidth:1,borderColor:th.cardBorder}}>
                            <Text style={{fontSize:10,color:th.text3,fontWeight:'700'}}>↻</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=>setShowAddProduct(v=>!v)}
                            style={{paddingHorizontal:14,paddingVertical:6,borderRadius:12,
                              backgroundColor:showAddProduct?th.cardBorder:th.text}}>
                            <Text style={{fontSize:10,color:showAddProduct?th.text:th.bg,fontWeight:'900'}}>
                              {showAddProduct?'✕ Скасувати':'+ Новий товар'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* ADD PRODUCT FORM */}
                      {showAddProduct&&(
                        <View style={{backgroundColor:th.bg2,borderRadius:20,padding:16,marginBottom:16,gap:10}}>
                          <Text style={{fontSize:11,fontWeight:'900',letterSpacing:1,color:th.text,marginBottom:4}}>
                            НОВИЙ ТОВАР
                          </Text>
                          <AppInput th={th} label="НАЗВА *" value={addProdForm.name}
                            onChangeText={v=>setAddProdForm(p=>({...p,name:v}))}/>
                          <View style={{flexDirection:'row',gap:8}}>
                            <View style={{flex:1}}>
                              <AppInput th={th} label="ЦІНА ₴ *" value={addProdForm.price}
                                keyboardType="numeric"
                                onChangeText={v=>setAddProdForm(p=>({...p,price:v}))}/>
                            </View>
                            <View style={{flex:1}}>
                              <AppInput th={th} label="ЗАЛИШОК шт" value={addProdForm.stock}
                                keyboardType="numeric"
                                onChangeText={v=>setAddProdForm(p=>({...p,stock:v}))}/>
                            </View>
                          </View>
                          <AppInput th={th} label="ПІДКАТЕГОРІЯ" value={addProdForm.sub_category}
                            placeholder="Куртки / Футболки / Джинси..."
                            onChangeText={v=>setAddProdForm(p=>({...p,sub_category:v}))}/>
                          <AppInput th={th} label="ОПИС" value={addProdForm.description}
                            onChangeText={v=>setAddProdForm(p=>({...p,description:v}))}/>
                          <TouchableOpacity onPress={adminAddProduct}
                            style={{backgroundColor:th.text,paddingVertical:14,borderRadius:14,
                              alignItems:'center',marginTop:4}}>
                            <Text style={{color:th.bg,fontSize:11,fontWeight:'900',letterSpacing:1}}>
                              ДОДАТИ ТОВАР ✓
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {adminLoading?(
                        <View style={{padding:40,alignItems:'center'}}>
                          <Text style={{color:th.text4}}>Завантаження...</Text>
                        </View>
                      ):(
                        adminProducts.filter(p=>!adminSearch||p.name?.toLowerCase().includes(adminSearch.toLowerCase())).map(prod=>(
                          <View key={prod.id} style={{marginBottom:10,borderRadius:12,
                            borderWidth:1,borderColor:th.cardBorder,backgroundColor:th.bg,
                            overflow:'hidden'}}>
                            {adminEdit?.id===prod.id?(
                              /* Edit form */
                              <View style={{padding:14,gap:10}}>
                                <Text style={{fontSize:10,fontWeight:'900',letterSpacing:1,color:th.text,marginBottom:4}}>
                                  РЕДАГУВАТИ #{prod.id}
                                </Text>
                                <AppInput th={th} label="НАЗВА" value={adminEditForm.name||''}
                                  onChangeText={v=>setAdminEditForm(p=>({...p,name:v}))}/>
                                <AppInput th={th} label="ЦІНА ₴" value={String(adminEditForm.price||'')}
                                  keyboardType="numeric"
                                  onChangeText={v=>setAdminEditForm(p=>({...p,price:v}))}/>
                                <AppInput th={th} label="ЗАЛИШОК (шт)" value={String(adminEditForm.stock||'')}
                                  keyboardType="numeric"
                                  onChangeText={v=>setAdminEditForm(p=>({...p,stock:v}))}/>
                                <View style={{flexDirection:'row',gap:8,marginTop:4}}>
                                  <TouchableOpacity onPress={()=>setAdminEdit(null)}
                                    style={{flex:1,paddingVertical:10,borderRadius:10,borderWidth:1,
                                      borderColor:th.cardBorder,alignItems:'center'}}>
                                    <Text style={{fontSize:11,color:th.text3,fontWeight:'700'}}>Скасувати</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={()=>adminSaveProduct({...prod,...adminEditForm})}
                                    style={{flex:1,paddingVertical:10,borderRadius:10,
                                      backgroundColor:th.text,alignItems:'center'}}>
                                    <Text style={{fontSize:11,color:th.bg,fontWeight:'900'}}>Зберегти ✓</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ):(
                              /* Product row */
                              <View style={{flexDirection:'row',alignItems:'center',padding:12,gap:10}}>
                                <Image source={{uri:prod.images?.[0]||''}}
                                  style={{width:48,height:60,borderRadius:8,backgroundColor:th.bg2}}
                                  resizeMode="cover"/>
                                <View style={{flex:1}}>
                                  <Text style={{fontSize:12,fontWeight:'600',color:th.text}} numberOfLines={1}>
                                    {prod.name}
                                  </Text>
                                  <Text style={{fontSize:10,color:th.text4,marginTop:2}}>
                                    {prod.sub_category} · {prod.price} ₴ · {prod.stock} шт
                                  </Text>
                                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                                    <View style={{width:6,height:6,borderRadius:3,
                                      backgroundColor:prod.is_active?'#22c55e':'#dc2626'}}/>
                                    <Text style={{fontSize:9,color:prod.is_active?'#22c55e':'#dc2626',fontWeight:'700'}}>
                                      {prod.is_active?'АКТИВНИЙ':'ПРИХОВАНИЙ'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={{gap:6}}>
                                  <TouchableOpacity
                                    onPress={()=>{setAdminEdit(prod);setAdminEditForm({name:prod.name,price:String(prod.price),stock:String(prod.stock)});}}
                                    style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,
                                      borderWidth:1,borderColor:th.cardBorder}}>
                                    <Text style={{fontSize:10,color:th.text,fontWeight:'700'}}>✏</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={()=>adminToggleActive(prod.id,prod.is_active)}
                                    style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,
                                      backgroundColor:prod.is_active?'#fef2f2':'#f0fdf4'}}>
                                    <Text style={{fontSize:10,fontWeight:'700',
                                      color:prod.is_active?'#dc2626':'#16a34a'}}>
                                      {prod.is_active?'⊘':'✓'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        ))
                      )}
                    </ScrollView>
                  )}

                  {/* STATS TAB */}
                  {adminTab==='stats'&&(
                    <ScrollView contentContainerStyle={{padding:20,gap:14}}>
                      {[
                        {label:'Всього товарів',val:products.length,icon:'📦'},
                        {label:'Активних',val:products.filter(p=>p.stock>0).length,icon:'✅'},
                        {label:'В обраному',val:0,icon:'♥'},
                        {label:'Категорій',val:[...new Set(products.map(p=>p.cid))].length,icon:'🗂'},
                      ].map((s,i)=>(
                        <View key={i} style={{flexDirection:'row',alignItems:'center',
                          backgroundColor:th.bg2,borderRadius:14,padding:18,gap:16}}>
                          <Text style={{fontSize:28}}>{s.icon}</Text>
                          <View>
                            <Text style={{fontSize:24,fontWeight:'200',color:th.text}}>{s.val}</Text>
                            <Text style={{fontSize:11,color:th.text4,marginTop:2}}>{s.label}</Text>
                          </View>
                        </View>
                      ))}
                      <View style={{backgroundColor:'#111',borderRadius:14,padding:18,marginTop:4}}>
                        <Text style={{fontSize:9,color:'rgba(255,255,255,.4)',letterSpacing:2,marginBottom:8}}>
                          ЦІНОВА АНАЛІТИКА
                        </Text>
                        {products.length>0&&[
                          ['Мін. ціна', Math.min(...products.map(p=>p.price))+' ₴'],
                          ['Макс. ціна', Math.max(...products.map(p=>p.price))+' ₴'],
                          ['Середня ціна', Math.round(products.reduce((s,p)=>s+p.price,0)/products.length)+' ₴'],
                        ].map(([l,v],i)=>(
                          <View key={i} style={{flexDirection:'row',justifyContent:'space-between',
                            paddingVertical:10,borderBottomWidth:i<2?1:0,borderBottomColor:'rgba(255,255,255,.07)'}}>
                            <Text style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>{l}</Text>
                            <Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  {/* ORDERS TAB */}
                  {adminTab==='orders'&&(
                    <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}}>
                      {orders.length===0?(
                        <View style={{alignItems:'center',paddingVertical:40,gap:12}}>
                          <Text style={{fontSize:36}}>📦</Text>
                          <Text style={{fontSize:13,fontWeight:'700',color:th.text}}>Замовлень поки немає</Text>
                          <Text style={{fontSize:11,color:th.text4,textAlign:'center',lineHeight:18}}>
                            {'Замовлення зʼявляться тут після перших покупок'}
                          </Text>
                        </View>
                      ):(
                        (orders||[]).slice().reverse().map((ord,i)=>(
                          <View key={i} style={{marginBottom:10,borderRadius:16,borderWidth:1,
                            borderColor:th.cardBorder,backgroundColor:th.bg,padding:14}}>
                            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                              <Text style={{fontSize:11,fontWeight:'800',color:th.text}}>#{ord.id||i+1}</Text>
                              <Text style={{fontSize:11,fontWeight:'700',color:th.text}}>{ord.total||0} ₴</Text>
                            </View>
                            <Text style={{fontSize:10,color:th.text4,marginBottom:2}}>
                              {ord.name||'—'} · {ord.phone||'—'}
                            </Text>
                            <Text style={{fontSize:10,color:th.text4}}>{ord.status||'Нове'}</Text>
                          </View>
                        ))
                      )}
                    </ScrollView>
                  )}
                </>
              )}
            </View>{/* END ADMIN */}

          </View>{/* END screen container */}

          {/* ── BOTTOM NAV ── */}
          {!hideNav&&(
            <View style={{
              flexDirection:'row',
              backgroundColor:th.navBg,
              borderTopWidth:1,
              borderTopColor:th.navBorder,
              paddingTop:8,
              paddingBottom:NAV_PAD_BOT+4,
            }}>
              {navItems.map(tab=>(
                <TouchableOpacity key={tab.k}
                  style={{flex:1,alignItems:'center',justifyContent:'center'}}
                  onPress={()=>{
                    setScr(tab.k);
                    if(tab.k==='home'){
                      setCatFilter({cid:null,sub:null,badge:null});
                      setSrch('');setShowSrch(false);
                      setTimeout(()=>homeScrollRef.current?.scrollTo({y:0,animated:true}),50);
                    }
                  }}>
                  <View style={{position:'relative',marginBottom:3}}>
                    <Text style={{fontSize:18,color:scr===tab.k?th.text:th.text4}}>{tab.ic}</Text>
                    {tab.cnt>0&&(
                      <View style={{position:'absolute',top:-5,right:-10,backgroundColor:th.accent,
                        width:16,height:16,borderRadius:8,justifyContent:'center',alignItems:'center'}}>
                        <Text style={{color:th.accentText,fontSize:8,fontWeight:'900'}}>{tab.cnt}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{fontSize:7,color:scr===tab.k?th.text:th.text4,letterSpacing:1.5,fontWeight:'700'}}>{tab.lb}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </View>
      )}

      {/* ── MODALS ── */}

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
                  <Text style={{fontSize:22,color:th.text,fontWeight:'200'}}>‹</Text>
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
                  const count=products.filter(p=>{
                    const map={'outerwear':['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки'],
                      'hoodies':['Кофти','Світшоти','Світшоти БРЕНД','Світери'],
                      'tshirts':['Футболки','Сорочки'],
                      'pants':['Джинси','Джинси класика','Спортивні штани','Брюки','Шорти','Плавальні шорти'],
                      'costumes':['Костюми','Комплекти'],
                      'accessories':['Взуття','Труси','Головні убори']};
                    return (map[cat.id]||[]).includes(p.cat)||p.cid===cat.id;
                  }).length;
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
                    {label:'SALE',labelEN:'SALE',badge:'Sale'},
                    {label:'Новинки',labelEN:'New Arrivals',badge:'Новинка'},
                  ].map(item=>{
                    const isActive=catFilter.badge===item.badge;
                    return(
                      <TouchableOpacity key={item.badge} activeOpacity={0.8}
                        onPress={()=>{setCatFilter({cid:null,sub:null,badge:item.badge});setShowCatModal(false);resetCat();}}
                        style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                          paddingHorizontal:16,paddingVertical:11,borderRadius:16,
                          borderWidth:1.5,borderColor:isActive?th.text:th.cardBorder,
                          backgroundColor:isActive?th.text:th.bg}}>
                        <Text style={{fontSize:13,fontWeight:'700',color:isActive?th.bg:th.text}}>
                          {lang==='EN'?item.labelEN:item.label}
                        </Text>
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
                    {products.filter(p=>{
                      const m={'outerwear':['Куртки','Бомбери','Кожанки','Пальто','Парки','Дублянки','Джинсовки'],
                        'hoodies':['Кофти','Світшоти','Світшоти БРЕНД','Світери'],
                        'tshirts':['Футболки','Сорочки'],
                        'pants':['Джинси','Джинси класика','Спортивні штани','Брюки','Шорти','Плавальні шорти'],
                        'costumes':['Костюми','Комплекти'],
                        'accessories':['Взуття','Труси','Головні убори']};
                      return (m[catL1.id]||[]).includes(p.cat)||p.cid===catL1.id;
                    }).length} →
                  </Text>
                </TouchableOpacity>

                {/* Individual sub-categories */}
                {(catL1.children||[]).map((sub,i)=>{
                  const cnt=products.filter(p=>p.cat===sub).length;
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
        <Animated.View style={{pointerEvents:'none',
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
        <Animated.View style={{position:'absolute',pointerEvents:'none',zIndex:999,
          transform:[{translateX:bagAnimX},{translateY:bagAnimY}],opacity:bagOpacity}}>
          <View style={{width:52,height:52,borderRadius:26,backgroundColor:'#111',
            justifyContent:'center',alignItems:'center',
            shadowColor:'#000',shadowOpacity:.3,shadowRadius:8,elevation:10}}>
            <Text style={{fontSize:22}}>🛍</Text>
          </View>
        </Animated.View>
      )}

      {/* ── COLOR / SIZE FILTER MODAL ── */}
      <Modal visible={showColorSizeFilter} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowColorSizeFilter(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:th.bg,borderTopLeftRadius:20,borderTopRightRadius:20,
                padding:24,paddingBottom:HOME_IND+16}}>
                <View style={{width:36,height:3,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:20}}/>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <Text style={{fontSize:11,fontWeight:'900',letterSpacing:3,color:th.text}}>КОЛІР ТА РОЗМІР</Text>
                  <TouchableOpacity onPress={()=>{setColorFilter(null);setSizeFilter(null);setShowColorSizeFilter(false);}}>
                    <Text style={{fontSize:9,color:th.text4,fontWeight:'700',letterSpacing:1}}>СКИНУТИ</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{fontSize:9,color:th.text3,letterSpacing:2,fontWeight:'800',marginBottom:10}}>КОЛІР</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:20}}>
                  <View style={{flexDirection:'row',gap:8}}>
                    {['Чорний','Білий','Сірий','Графіт','Navy','Бежевий','Хакі','Коричневий','Stone','Оливковий'].map(c=>(
                      <TouchableOpacity key={c}
                        style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,
                          borderColor:colorFilter===c?th.text:th.cardBorder,
                          backgroundColor:colorFilter===c?th.accent:'transparent'}}
                        onPress={()=>setColorFilter(colorFilter===c?null:c)}>
                        <Text style={{fontSize:11,color:colorFilter===c?th.accentText:th.text2,fontWeight:'600'}}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Text style={{fontSize:9,color:th.text3,letterSpacing:2,fontWeight:'800',marginBottom:10}}>РОЗМІР</Text>
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24}}>
                  {['XS','S','M','L','XL','XXL','29','30','31','32','33','34','One Size'].map(s=>(
                    <TouchableOpacity key={s}
                      style={{minWidth:48,paddingHorizontal:12,paddingVertical:9,borderRadius:R,borderWidth:1,
                        borderColor:sizeFilter===s?th.text:th.cardBorder,
                        backgroundColor:sizeFilter===s?th.accent:'transparent',
                        alignItems:'center'}}
                      onPress={()=>setSizeFilter(sizeFilter===s?null:s)}>
                      <Text style={{fontSize:11,fontWeight:'700',color:sizeFilter===s?th.accentText:th.text2}}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={{backgroundColor:th.accent,paddingVertical:14,borderRadius:R,alignItems:'center'}}
                  onPress={()=>setShowColorSizeFilter(false)}>
                  <Text style={{color:th.accentText,fontWeight:'900',fontSize:10,letterSpacing:2.5}}>ЗАСТОСУВАТИ</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── COMPARE MODAL ── */}
      <Modal visible={showCompare} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowCompare(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'}}>
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
                    {compareList.map(p=>(
                      <View key={p.id} style={{width:160,borderWidth:1,borderColor:th.cardBorder,borderRadius:R,overflow:'hidden'}}>
                        <Image source={{uri:p.imgs?p.imgs[0]:p.img}} style={{width:160,height:120}} resizeMode="cover"/>
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
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'}}>
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
                  onPress={()=>Share.share({message:`Використай мій код ${refCode} у 4YOU.STORE і отримай 100 бонусів! 🛍`})}>
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

      {/* Price filter modal */}
      <PriceFilterModal
        visible={showPriceFilter}
        onClose={()=>setShowPriceFilter(false)}
        priceMin={priceMin} priceMax={priceMax}
        setPriceMin={setPriceMin} setPriceMax={setPriceMax}
        th={th}
      />

      {/* Sort modal */}
      <Modal visible={showSort} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={()=>setShowSort(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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

      {/* Cart added modal */}
      <Modal visible={showCartModal} animationType="slide" transparent statusBarTranslucent>
        <TouchableWithoutFeedback onPress={()=>setShowCartModal(false)}>
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'}}>
            <TouchableWithoutFeedback>
              <View style={{backgroundColor:th.bg,borderTopLeftRadius:20,borderTopRightRadius:20,
                padding:24,paddingBottom:HOME_IND+16}}>
                <View style={{width:36,height:4,backgroundColor:th.bg3,borderRadius:2,alignSelf:'center',marginBottom:20}}/>
                {lastAdded&&<View style={{flexDirection:'row',gap:16,marginBottom:24}}>
                  <Image source={{uri:lastAdded.img}} style={{width:80,height:100,borderRadius:R}} resizeMode="cover"/>
                  <View style={{flex:1,justifyContent:'space-between'}}>
                    <View>
                      <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                        <View style={{width:18,height:18,borderRadius:9,backgroundColor:'#059669',justifyContent:'center',alignItems:'center'}}>
                          <Text style={{color:'#fff',fontSize:10,fontWeight:'900'}}>✓</Text>
                        </View>
                        <Text style={{fontSize:10,color:'#059669',fontWeight:'700'}}>{T.addedToCart}</Text>
                      </View>
                      <Text style={{fontSize:13,fontWeight:'600',color:th.text,lineHeight:18,marginBottom:4}}>{lastAdded.name}</Text>
                      <Text style={{fontSize:11,color:th.text3}}>{lastAdded.color} · {lastAdded.size}</Text>
                    </View>
                    <Text style={{fontSize:16,fontWeight:'900',color:th.text}}>{lastAdded.price} ₴</Text>
                  </View>
                </View>}
                <Btn th={th} label={T.goToCart} onPress={()=>{setShowCartModal(false);go('cart');}} style={{marginBottom:10}}/>
                <Btn th={th} label={T.continueShopping} onPress={()=>setShowCartModal(false)} ghost/>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Size guide modal */}
      <Modal visible={showSzGuide} animationType="slide" transparent>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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

      {/* ── ВІДГУК MODAL ── */}
      <Modal visible={showAddReview&&!!sel} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={IS_IOS?'padding':'height'} style={{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}}>
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
            <Btn th={th} label="ОПУБЛІКУВАТИ" onPress={()=>{
              if(!newReviewText.trim()||!sel)return;
              const rv={author:loggedIn?user.name:'Анонім',rating:newReviewRating,text:newReviewText.trim(),date:new Date().toLocaleDateString('uk-UA')};
              setReviews(p=>({...p,[sel.id]:[rv,...(p[sel.id]||[])]}));
              setNewReviewText('');setNewReviewRating(5);setShowAddReview(false);
            }}/>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}
