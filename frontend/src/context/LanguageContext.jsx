import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiUpdateLanguagePreference } from '../services/api';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
  { code: 'om', name: 'Afaan Oromoo', nativeName: 'Afaan Oromoo', direction: 'ltr', flag: '🇪🇹' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr', flag: '🇪🇹' }
];

// UI Dictionary for Connectly Multilingual Bridge
const UI_TRANSLATIONS = {
  en: {
    home: 'Home Feed',
    reels: 'Shorts & Reels',
    explore: 'Explore & Search',
    messages: 'Messages',
    notifications: 'Notifications',
    communities: 'Communities',
    collections: 'Collections',
    analytics: 'Analytics',
    profile: 'My Profile',
    whoToFollow: 'Who to Follow',
    translate: 'Translate',
    translating: 'Translating...',
    translatedFrom: 'Translated from',
    byConnectlyBridge: 'by Connectly AI Bridge',
    seeOriginal: 'See original',
    seeTranslation: 'See translation',
    language: 'Language',
    preferredLanguage: 'Preferred Language',
    selectLanguage: 'Select your preferred language',
    saveLanguage: 'Save Language',
    tagline: 'Connect. Share. Belong.',
    newPost: 'New Post',
    post: 'Post',
    comment: 'Comment',
    share: 'Share',
    like: 'Like',
    save: 'Save',
    writeComment: 'Write a comment...',
    whatsOnYourMind: "What's on your mind?",
    searchPlaceholder: 'Search creators & users...'
  },
  ar: {
    home: 'الصفحة الرئيسية',
    reels: 'مقاطع الفيديو القصيرة',
    explore: 'استكشاف وبحث',
    messages: 'الرسائل',
    notifications: 'الإشعارات',
    communities: 'المجتمعات',
    collections: 'المجموعات',
    analytics: 'التحليلات',
    profile: 'ملفي الشخصي',
    whoToFollow: 'من قد تتابعه',
    translate: 'ترجمة',
    translating: 'جارٍ الترجمة...',
    translatedFrom: 'مترجم من',
    byConnectlyBridge: 'بواسطة جسر كونيكتلي للذكاء الاصطناعي',
    seeOriginal: 'عرض النص الأصلي',
    seeTranslation: 'عرض الترجمة',
    language: 'اللغة',
    preferredLanguage: 'اللغة المفضلة',
    selectLanguage: 'اختر لغتك المفضلة',
    saveLanguage: 'حفظ اللغة',
    tagline: 'تواصل. شارك. انتمِ.',
    newPost: 'منشور جديد',
    post: 'نشر',
    comment: 'تعليق',
    share: 'مشاركة',
    like: 'إعجاب',
    save: 'حفظ',
    writeComment: 'اكتب تعليقاً...',
    whatsOnYourMind: 'ما الذي يدور في ذهنك؟',
    searchPlaceholder: 'ابحث عن صانعي المحتوى والمستخدمين...'
  },
  om: {
    home: 'Fuula Duraa',
    reels: 'Viidiyoo Gabaabaa',
    explore: 'Sakatta\'aa fi Barbaadi',
    messages: 'Ergaa',
    notifications: 'Beeksisa',
    communities: 'Hawaasa',
    collections: 'Kuusaa',
    analytics: 'Xiinxala',
    profile: 'Eenyummaa Koo',
    whoToFollow: 'Eenyu Hordofuu Qabda',
    translate: 'Hiiki',
    translating: 'Hiikamaa jira...',
    translatedFrom: 'Afaan irraa kan hiikame:',
    byConnectlyBridge: 'Connectly AI Bridge dhaan',
    seeOriginal: 'Kan jalqabaa ilaali',
    seeTranslation: 'Hiika isaa ilaali',
    language: 'Afaan',
    preferredLanguage: 'Afaan Filatamaa',
    selectLanguage: 'Afaan keessan filadhaa',
    saveLanguage: 'Afaan Olkaayi',
    tagline: 'Waliin hidhadhaa. Qoodaa. Kan keessan godhadhaa.',
    newPost: 'Maxxansa Haaraa',
    post: 'Maxxansi',
    comment: 'Yaada',
    share: 'Qoodi',
    like: 'Jaalladhu',
    save: 'Olkaayi',
    writeComment: 'Yaada kee barreessi...',
    whatsOnYourMind: 'Maal yaadaa jirtu?',
    searchPlaceholder: 'Uumtoota fi fayyadamtoota barbaadi...'
  },
  am: {
    home: 'መነሻ ገጽ',
    reels: 'አጫጭር ቪዲዮዎች',
    explore: 'አስስ እና ፈልግ',
    messages: 'መልዕክቶች',
    notifications: 'ማሳወቂያዎች',
    communities: 'ማህበረሰቦች',
    collections: 'ስብስቦች',
    analytics: 'ትንታኔ',
    profile: 'የግል መገለጫዬ',
    whoToFollow: 'ማንን መከተል ይፈልጋሉ',
    translate: 'ተርጉም',
    translating: 'እየተተረጎመ ነው...',
    translatedFrom: 'ከተተረጎመበት ቋንቋ:',
    byConnectlyBridge: 'በኮኔክትሊ አርቴፊሻል ኢንተለጀንስ ድልድይ',
    seeOriginal: 'ዋናውን ጽሁፍ ይመልከቱ',
    seeTranslation: 'ትርጉሙን ይመልከቱ',
    language: 'ቋንቋ',
    preferredLanguage: 'ተመራጭ ቋንቋ',
    selectLanguage: 'ተመራጭ ቋንቋዎን ይምረጡ',
    saveLanguage: 'ቋንቋ አስቀምጥ',
    tagline: 'ተገናኙ። አካፍሉ። የቤተሰብ ይሁኑ።',
    newPost: 'አዲስ ልጥፍ',
    post: 'ለጥፍ',
    comment: 'አስተያየት',
    share: 'አጋራ',
    like: 'ውደድ',
    save: 'አስቀምጥ',
    writeComment: 'አስተያየትዎን ይጻፉ...',
    whatsOnYourMind: 'ምን እያሰቡ ነው?',
    searchPlaceholder: 'ፈጣሪዎችን እና ተጠቃሚዎችን ይፈልጉ...'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  let user = null;
  try {
    const auth = useAuth();
    user = auth?.user || null;
  } catch (err) {
    // AuthProvider not above LanguageProvider in tree
  }

  // Initialize from user preference in DB or localStorage, default to 'en'
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return (
      (user && user.preferredLanguage) ||
      localStorage.getItem('connectly_language') ||
      'en'
    );
  });

  // Sync when logged in user preference changes
  useEffect(() => {
    if (user && user.preferredLanguage && user.preferredLanguage !== currentLanguage) {
      setCurrentLanguage(user.preferredLanguage);
    }
  }, [user]);

  // Set document direction and language attribute
  useEffect(() => {
    const active = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];
    document.documentElement.lang = active.code;
    document.documentElement.dir = active.direction;

    if (active.direction === 'rtl') {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }

    localStorage.setItem('connectly_language', currentLanguage);
  }, [currentLanguage]);

  const setLanguage = async (newLang) => {
    const isValid = SUPPORTED_LANGUAGES.some((l) => l.code === newLang);
    if (!isValid) return;

    setCurrentLanguage(newLang);
    localStorage.setItem('connectly_language', newLang);

    // If authenticated, persist to user document in MongoDB
    if (user) {
      try {
        await apiUpdateLanguagePreference(newLang);
      } catch (err) {
        console.error('Failed to sync language to profile:', err);
      }
    }
  };

  // Translation lookup helper
  const t = (key) => {
    const langDict = UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS.en;
    return langDict[key] || UI_TRANSLATIONS.en[key] || key;
  };

  const activeLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        direction: activeLangConfig.direction,
        isRTL: activeLangConfig.direction === 'rtl',
        activeLanguage: activeLangConfig,
        supportedLanguages: SUPPORTED_LANGUAGES,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

