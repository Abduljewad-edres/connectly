import mongoose from 'mongoose';

const translationCacheSchema = new mongoose.Schema(
  {
    contentHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    originalText: {
      type: String,
      required: true,
      trim: true
    },
    sourceLanguage: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    targetLanguage: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    translatedText: {
      type: String,
      required: true,
      trim: true
    },
    provider: {
      type: String,
      default: 'connectly-bridge'
    },
    hitCount: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Compound index for queries by language pair & creation recency
translationCacheSchema.index({ sourceLanguage: 1, targetLanguage: 1 });
translationCacheSchema.index({ createdAt: -1 });

const TranslationCache = mongoose.model('TranslationCache', translationCacheSchema);
export default TranslationCache;

