import crypto from 'crypto';
import mongoose from 'mongoose';
import TranslationCache from '../models/TranslationCache.js';

/**
 * Connectly Multilingual Bridge Translation Service
 * Provider-independent translation engine with caching and offline fallback.
 * Supported languages:
 *  - 'en': English
 *  - 'ar': Arabic (العربية - RTL)
 *  - 'om': Afaan Oromoo
 *  - 'am': Amharic (አማርኛ)
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
  { code: 'om', name: 'Afaan Oromoo', nativeName: 'Afaan Oromoo', direction: 'ltr', flag: '🇪🇹' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr', flag: '🇪🇹' }
];

// Language detection patterns
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const AMHARIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

const OROMO_KEYWORDS = new Set([
  'akkam', 'baga', 'nagaa', 'nagayaa', 'guyyaa', 'jaalala', 'obboleessa',
  'obboleettii', 'oromoo', 'waan', 'fayyaa', 'galatoomaa', 'keessan', 'akkasumas',
  'dhaabbata', 'barnoota', 'hiriyoota', 'jira', 'jirra', 'miti', 'hin', 'garuu',
  'yeroo', 'hundi', 'tokko', 'lama', 'sadii', 'baay\'ee', 'bayyee', 'guddaa',
  'baga nagaan dhuftan', 'maal', 'akkamitti', 'eessa', 'eenyu', 'amma', 'bor'
]);

/**
 * Detect script and primary language of text
 */
export const detectLanguage = (text = '') => {
  if (!text || typeof text !== 'string') return 'en';
  const clean = text.trim();
  if (!clean) return 'en';

  if (ARABIC_REGEX.test(clean)) return 'ar';
  if (AMHARIC_REGEX.test(clean)) return 'am';

  // Check Afaan Oromoo keywords in Latin script
  const words = clean.toLowerCase().replace(/[^a-zA-Z'\s]/g, '').split(/\s+/);
  let oromoMatches = 0;
  for (const w of words) {
    if (OROMO_KEYWORDS.has(w)) oromoMatches++;
  }
  if (oromoMatches >= 1 || (words.length > 0 && (oromoMatches / words.length) >= 0.15)) {
    return 'om';
  }

  return 'en';
};

/**
 * Built-in multilingual social dictionary and phrase bank
 */
const PHRASES = [
  {
    en: 'welcome to connectly',
    ar: 'مرحباً بكم في كونيكتلي',
    om: 'Baga nagaan gara Connectly dhuftan',
    am: 'እንኳን ወደ ኮኔክትሊ በደህና መጡ'
  },
  {
    en: 'connect share belong',
    ar: 'تواصل. شارك. انتمِ.',
    om: 'Waliin hidhadhaa. Qoodaa. Kan keessan godhadhaa.',
    am: 'ተገናኙ። አካፍሉ። የቤተሰብ ይሁኑ።'
  },
  {
    en: 'welcome to my post',
    ar: 'مرحباً بكم في منشوري',
    om: 'Baga nagaan gara maxxansa kiyyaa dhuftan',
    am: 'እንኳን ወደ ጽሑፌ በደህና መጡ'
  },
  {
    en: 'this is my first post',
    ar: 'هذا هو منشوري الأول',
    om: 'Kun maxxansa kiyya isa jalqabaati',
    am: 'ይህ የመጀመሪያ ጽሑፌ ነው'
  },
  {
    en: 'this is a test post',
    ar: 'هذا منشور تجريبي',
    om: 'Kun maxxansa yaaliiti',
    am: 'ይህ የሙከራ ጽሑፍ ነው'
  },
  {
    en: 'testing translation',
    ar: 'اختبار الترجمة الفورية',
    om: 'Hiika qorachuu',
    am: 'ትርጉምን መሞከር'
  },
  {
    en: 'hello everyone',
    ar: 'مرحباً بالجميع',
    om: 'Akkam jirtu hundi keessanuu',
    am: 'ሰላም ለሁላችሁም'
  },
  {
    en: 'hello friends',
    ar: 'مرحباً يا أصدقاء',
    om: 'Akkam hiriyaa koo',
    am: 'ሰላም ጓደኞቼ'
  },
  {
    en: 'hello world',
    ar: 'مرحباً بالعالم',
    om: 'Akkam Addunyaa',
    am: 'ሰላም ለዓለም'
  },
  {
    en: 'good morning',
    ar: 'صباح الخير',
    om: 'Akkam bultan',
    am: 'እንደምን አደራችሁ'
  },
  {
    en: 'good afternoon',
    ar: 'مساء الخير',
    om: 'Akkam ooltan',
    am: 'እንደምን ዋላችሁ'
  },
  {
    en: 'good evening',
    ar: 'مساء الخير',
    om: 'Akkam dhiitan',
    am: 'እንደምን አመሻችሁ'
  },
  {
    en: 'good night',
    ar: 'تصبح على خير',
    om: 'Halkan gaarii',
    am: 'መልካም ምሽት'
  },
  {
    en: 'how are you',
    ar: 'كيف حالك؟',
    om: 'Akkam jirtu?',
    am: 'እንዴት ነዎት?'
  },
  {
    en: 'how are you doing',
    ar: 'كيف هي أحوالك؟',
    om: 'Akkam jirtu?',
    am: 'እንዴት ናችሁ?'
  },
  {
    en: 'thank you very much',
    ar: 'شكراً جزيلاً',
    om: 'Baay\'ee galatoomaa',
    am: 'በጣም አመሰግናለሁ'
  },
  {
    en: 'thank you',
    ar: 'شكراً لك',
    om: 'Galatoomaa',
    am: 'አመሰግናለሁ'
  },
  {
    en: 'congratulations',
    ar: 'تهانينا المباركة',
    om: 'Baga gammaddan',
    am: 'እንኳን ደስ አላችሁ'
  },
  {
    en: 'happy new year',
    ar: 'سنة جديدة سعيدة',
    om: 'Baga bara haaraa geessan',
    am: 'መልካም አዲስ ዓመት'
  },
  {
    en: 'have a nice day',
    ar: 'أتمنى لكم يوماً جميلاً',
    om: 'Guyyaa gaarii qabaadhaa',
    am: 'መልካም ቀን ይሁንላችሁ'
  },
  {
    en: 'have a great day',
    ar: 'أتمنى لكم يوماً رائعاً',
    om: 'Guyyaa baay\'ee gaarii qabaadhaa',
    am: 'መልካም ቀን ይሁንላችሁ'
  },
  {
    en: 'i love this community',
    ar: 'أحب هذا المجتمع',
    om: 'Hawaasa kana nan jaalladha',
    am: 'ይህንን ማህበረሰብ እወደዋለሁ'
  },
  {
    en: 'peace and love',
    ar: 'سلام ومحبة للجميع',
    om: 'Nagaa fi jaalala hundaaf',
    am: 'ሰላምና ፍቅር ለሁሉም'
  },
  {
    en: 'excited to join',
    ar: 'متحمس وسعيد بالانضمام',
    om: 'Makamuuf baay\'ee gammadeera',
    am: 'በመቀላቀሌ በጣም ተደስቻለሁ'
  },
  {
    en: 'learning new skills',
    ar: 'تعلم مهارات جديدة',
    om: 'Dandeettii haaraa barachuu',
    am: 'አዳዲስ ክህሎቶችን መማር'
  },
  {
    en: 'education and technology',
    ar: 'التعليم والتكنولوجيا',
    om: 'Barnoota fi Teeknooloojii',
    am: 'ትምህርትና ቴክኖሎጂ'
  }
];

// Word dictionary for social networking & conversational vocabulary
const WORD_DICT = {
  hello: { ar: 'مرحباً', om: 'Akkam', am: 'ሰላም' },
  hi: { ar: 'أهلاً', om: 'Akkam', am: 'ሰላም' },
  welcome: { ar: 'أهلاً وسهلاً', om: 'Baga dhuftan', am: 'እንኳን ደህና መጡ' },
  post: { ar: 'منشور', om: 'maxxansa', am: 'ጽሑፍ' },
  posts: { ar: 'منشورات', om: 'maxxansoota', am: 'ጽሑፎች' },
  community: { ar: 'مجتمع', om: 'hawaasa', am: 'ማህበረሰብ' },
  friend: { ar: 'صديق', om: 'hiriyaa', am: 'ጓደኛ' },
  friends: { ar: 'أصدقاء', om: 'hiriyoota', am: 'ጓደኞች' },
  world: { ar: 'العالم', om: 'addunyaa', am: 'ዓለም' },
  people: { ar: 'الناس', om: 'namoota', am: 'ሰዎች' },
  today: { ar: 'اليوم', om: 'har\'a', am: 'ዛሬ' },
  tomorrow: { ar: 'غداً', om: 'bor', am: 'ነገ' },
  beautiful: { ar: 'جميل', om: 'bareedaa', am: 'ቆንጆ' },
  great: { ar: 'رائع', om: 'guddaa', am: 'ድንቅ' },
  good: { ar: 'جيد', om: 'gaarii', am: 'ጥሩ' },
  happy: { ar: 'سعيد', om: 'gammadaa', am: 'ደስተኛ' },
  love: { ar: 'حب', om: 'jaalala', am: 'ፍቅር' },
  life: { ar: 'حياة', om: 'jireenya', am: 'ህይወት' },
  culture: { ar: 'ثقافة', om: 'aadaa', am: 'ባህል' },
  music: { ar: 'موسيقى', om: 'muuziqaa', am: 'ሙዚቃ' },
  share: { ar: 'مشاركة', om: 'qooduu', am: 'ማጋራት' },
  connect: { ar: 'تواصل', om: 'walitti hidhamuu', am: 'መገናኘት' },
  hope: { ar: 'أمل', om: 'abdii', am: 'ተስፋ' },
  work: { ar: 'عمل', om: 'hojii', am: 'ስራ' },
  photo: { ar: 'صورة', om: 'suuraa', am: 'ፎቶ' },
  video: { ar: 'فيديو', om: 'viidiyoo', am: 'ቪዲዮ' },
  new: { ar: 'جديد', om: 'haaraa', am: 'አዲስ' },
  first: { ar: 'أول', om: 'jalqabaa', am: 'መጀመሪያ' },
  best: { ar: 'أفضل', om: 'filatamaa', am: 'ምርጥ' },
  day: { ar: 'يوم', om: 'guyyaa', am: 'ቀን' },
  night: { ar: 'ليل', om: 'halkan', am: 'ሌሊት' },
  morning: { ar: 'صباح', om: 'ganama', am: 'ጠዋት' },
  evening: { ar: 'مساء', om: 'galgala', am: 'ምሽት' },
  yes: { ar: 'نعم', om: 'eeyyee', am: 'አዎ' }
};

/**
 * Compute unique deterministic hash for cache key
 */
const generateContentHash = (text, sourceLang, targetLang) => {
  return crypto
    .createHash('sha256')
    .update(`${sourceLang}:${targetLang}:${text.trim()}`)
    .digest('hex');
};

// Helper to decode HTML entities returned by external translation APIs
const decodeHtmlEntities = (str = '') => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
};

/**
 * Fetch from genuine translation provider with resilient timeout & failover
 */
const fetchFromExternalProvider = async (text, sourceLang, targetLang) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds for reliable global API response

  const src = sourceLang === 'om' ? 'om' : sourceLang;
  const tgt = targetLang === 'om' ? 'om' : targetLang;

  // 1. Check for official Google Cloud Translation API Key if configured
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.TRANSLATION_API_KEY;
  if (googleApiKey) {
    try {
      const gUrl = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
      const gRes = await fetch(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: src,
          target: tgt,
          format: 'text'
        }),
        signal: controller.signal
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const translated = gData?.data?.translations?.[0]?.translatedText;
        if (translated && translated.trim() !== text.trim()) {
          clearTimeout(timeoutId);
          return {
            translatedText: decodeHtmlEntities(translated.trim()),
            provider: 'google-cloud-translate'
          };
        }
      }
    } catch (gErr) {
      console.warn('[TranslationService] Google Cloud API error, trying fallback:', gErr.message);
    }
  }

  // 2. MyMemory Translation API (Official Free & Pro Tier)
  try {
    const emailParam = process.env.MYMEMORY_EMAIL ? `&de=${encodeURIComponent(process.env.MYMEMORY_EMAIL)}` : '';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}${emailParam}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (
        data &&
        data.responseData &&
        data.responseData.translatedText
      ) {
        const rawTranslated = data.responseData.translatedText.trim();
        const isWarning = rawTranslated.toUpperCase().includes('MYMEMORY WARNING') ||
                          rawTranslated.toUpperCase().includes('IS AN INVALID TARGET LANGUAGE') ||
                          rawTranslated.toUpperCase().includes('QUERY LENGTH LIMIT EXCEEDED');

        if (!isWarning && rawTranslated !== text.trim()) {
          return {
            translatedText: decodeHtmlEntities(rawTranslated),
            provider: 'mymemory-api'
          };
        }
      }
    }
  } catch (err) {
    // Timeout or network error
    console.warn('[TranslationService] External provider request notice:', err.message);
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
};

/**
 * Internal Rule-based and Dictionary Translation Engine
 */
/**
 * Internal Rule-based and Dictionary Translation Engine
 */
const translateWithInternalEngine = (text, sourceLang, targetLang) => {
  const normalized = text.trim().toLowerCase();

  // 1. Direct multi-word phrase match (case-insensitive)
  const exactPhrase = PHRASES.find((p) => {
    if (sourceLang === 'en' && p.en.toLowerCase() === normalized) return true;
    if (p[sourceLang] && p[sourceLang].toLowerCase() === normalized) return true;
    return p.en.toLowerCase() === normalized;
  });

  if (exactPhrase && exactPhrase[targetLang]) {
    return exactPhrase[targetLang];
  }

  // 2. Sub-phrase replacement across the text
  let translated = text;
  let hasReplaced = false;

  // Sort phrases by length descending to match longest phrases first
  const sortedPhrases = [...PHRASES].sort((a, b) => b.en.length - a.en.length);
  for (const p of sortedPhrases) {
    const srcPhrase = sourceLang === 'en' ? p.en : (p[sourceLang] || p.en);
    if (!srcPhrase) continue;
    const regex = new RegExp(`\\b${srcPhrase.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(translated) && p[targetLang]) {
      translated = translated.replace(regex, p[targetLang]);
      hasReplaced = true;
    }
  }

  // 3. Word-by-word token replacement
  const tokens = translated.split(/(\s+|[.,!?:;]+)/);
  const resultTokens = tokens.map((tok) => {
    const cleanWord = tok.trim().toLowerCase();
    if (!cleanWord || cleanWord.length === 0) return tok;

    // Check direct word dict
    if (sourceLang === 'en' && WORD_DICT[cleanWord] && WORD_DICT[cleanWord][targetLang]) {
      hasReplaced = true;
      return WORD_DICT[cleanWord][targetLang];
    }

    // Check reverse word dict (source is not English)
    if (sourceLang !== 'en') {
      for (const [enWord, transObj] of Object.entries(WORD_DICT)) {
        if (transObj[sourceLang] && transObj[sourceLang].toLowerCase() === cleanWord) {
          hasReplaced = true;
          if (targetLang === 'en') return enWord;
          if (transObj[targetLang]) return transObj[targetLang];
        }
      }
    }

    return tok;
  });

  const finalTrans = resultTokens.join('');

  if (hasReplaced && finalTrans.trim() !== text.trim()) {
    return finalTrans.trim();
  }

  // 4. If no words matched and target is different, return null (never fake translations)
  return null;
};

/**
 * Main Translation Method
 * @param {Object} options
 * @param {string} options.text - Source text to translate
 * @param {string} options.targetLang - Target language code ('en', 'ar', 'om', 'am')
 * @param {string} [options.sourceLang] - Optional explicit source language
 * @returns {Promise<Object>} Translation result
 */
export const translateContent = async ({ text, targetLang = 'en', sourceLang }) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      success: true,
      originalText: text || '',
      translatedText: text || '',
      sourceLanguage: sourceLang || 'en',
      targetLanguage: targetLang,
      cached: false,
      provider: 'none'
    };
  }

  const cleanText = text.trim();
  const validTarget = SUPPORTED_LANGUAGES.some((l) => l.code === targetLang)
    ? targetLang
    : 'en';

  const detectedSource = sourceLang && SUPPORTED_LANGUAGES.some((l) => l.code === sourceLang)
    ? sourceLang
    : detectLanguage(cleanText);

  // If source and target are the same, return as is
  if (detectedSource === validTarget) {
    return {
      success: true,
      originalText: cleanText,
      translatedText: cleanText,
      sourceLanguage: detectedSource,
      targetLanguage: validTarget,
      cached: false,
      provider: 'same-language'
    };
  }

  const contentHash = generateContentHash(cleanText, detectedSource, validTarget);

  // 1. Check MongoDB cache first if database connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const cachedEntry = await TranslationCache.findOne({ contentHash });
      if (cachedEntry && cachedEntry.translatedText) {
        const cachedText = cachedEntry.translatedText.trim();
        // Discard and delete stale or poisoned cache entries that merely echoed the original text
        const isPoisoned = cachedText === cleanText ||
          cachedText.startsWith('[የኮኔክትሊ ትርጉም]') ||
          cachedText.startsWith('[Hiika Connectly]') ||
          cachedText.startsWith('[ترجمة كونيكتلي]');

        if (isPoisoned) {
          TranslationCache.deleteOne({ _id: cachedEntry._id }).exec().catch(() => {});
        } else {
          // Increment hit count asynchronously
          TranslationCache.updateOne({ _id: cachedEntry._id }, { $inc: { hitCount: 1 } }).exec();

          return {
            success: true,
            originalText: cleanText,
            translatedText: cachedText,
            sourceLanguage: cachedEntry.sourceLanguage || detectedSource,
            targetLanguage: cachedEntry.targetLanguage || validTarget,
            cached: true,
            provider: cachedEntry.provider || 'cached-translation'
          };
        }
      }
    } catch (dbErr) {
      console.error('[TranslationService] Cache query error:', dbErr.message);
    }
  }

  // 2. Attempt genuine external provider (MyMemory or Google Cloud)
  let translationResult = await fetchFromExternalProvider(cleanText, detectedSource, validTarget);

  // 3. Fallback to internal verified phrase/word engine if external fails
  if (!translationResult) {
    const internalText = translateWithInternalEngine(cleanText, detectedSource, validTarget);
    if (internalText && internalText.trim() !== cleanText) {
      translationResult = {
        translatedText: internalText.trim(),
        provider: 'connectly-internal-bridge'
      };
    }
  }

  // 4. If genuine translation could not be obtained, return clear failure without faking
  if (!translationResult || !translationResult.translatedText || translationResult.translatedText.trim() === cleanText) {
    return {
      success: false,
      originalText: cleanText,
      translatedText: cleanText,
      sourceLanguage: detectedSource,
      targetLanguage: validTarget,
      cached: false,
      provider: 'none',
      message: `Translation from ${detectedSource.toUpperCase()} to ${validTarget.toUpperCase()} is currently unavailable. Please verify connection and try again.`
    };
  }

  // 5. Save verified genuine result to MongoDB cache
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await TranslationCache.create({
        contentHash,
        originalText: cleanText,
        sourceLanguage: detectedSource,
        targetLanguage: validTarget,
        translatedText: translationResult.translatedText,
        provider: translationResult.provider,
        hitCount: 1
      });
    } catch (saveErr) {
      if (saveErr.code !== 11000) {
        console.error('[TranslationService] Cache save error:', saveErr.message);
      }
    }
  }

  return {
    success: true,
    originalText: cleanText,
    translatedText: translationResult.translatedText,
    sourceLanguage: detectedSource,
    targetLanguage: validTarget,
    cached: false,
    provider: translationResult.provider
  };
};
