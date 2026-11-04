import {
  translateContent,
  detectLanguage,
  SUPPORTED_LANGUAGES
} from '../services/translationService.js';
import User from '../models/User.js';

// @desc    Translate text content
// @route   POST /api/translations/translate
// @access  Public / Optional Auth
export const translateText = async (req, res) => {
  try {
    const { text, targetLang: requestedTarget, sourceLang } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text to translate is required.'
      });
    }

    // Determine target language: requested > user preference > default
    const detected = detectLanguage(text.trim());
    let targetLang = requestedTarget;
    if (!targetLang && req.user && req.user.preferredLanguage) {
      targetLang = req.user.preferredLanguage;
    }
    // If targetLang is missing or identical to detected source, choose appropriate alternate
    if (!targetLang || targetLang === detected) {
      targetLang = detected === 'en' ? 'am' : 'en';
    }

    const result = await translateContent({
      text: text.trim(),
      targetLang,
      sourceLang: sourceLang || detected
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('translateText error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during translation.'
    });
  }
};

// @desc    Batch translate multiple text items (e.g. comments or posts)
// @route   POST /api/translations/batch
// @access  Public / Optional Auth
export const batchTranslate = async (req, res) => {
  try {
    const { items, targetLang: requestedTarget } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An array of items with text is required.'
      });
    }

    let targetLang = requestedTarget;
    if (!targetLang && req.user && req.user.preferredLanguage) {
      targetLang = req.user.preferredLanguage;
    }
    if (!targetLang) {
      targetLang = 'en';
    }

    // Limit batch size to 25 items for performance
    const limitedItems = items.slice(0, 25);

    const translations = await Promise.all(
      limitedItems.map(async (item) => {
        const text = item.text || '';
        const res = await translateContent({
          text,
          targetLang,
          sourceLang: item.sourceLang
        });
        return {
          id: item.id,
          ...res
        };
      })
    );

    return res.status(200).json({
      success: true,
      targetLanguage: targetLang,
      translations
    });
  } catch (error) {
    console.error('batchTranslate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during batch translation.'
    });
  }
};

// @desc    Get supported languages list
// @route   GET /api/translations/languages
// @access  Public
export const getSupportedLanguages = async (req, res) => {
  return res.status(200).json({
    success: true,
    languages: SUPPORTED_LANGUAGES
  });
};

// @desc    Detect language of given text
// @route   POST /api/translations/detect
// @access  Public
export const detectTextLanguage = async (req, res) => {
  const { text } = req.body;
  const detected = detectLanguage(text || '');
  return res.status(200).json({
    success: true,
    detectedLanguage: detected
  });
};

