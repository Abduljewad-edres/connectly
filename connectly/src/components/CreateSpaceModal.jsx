import React, { useState } from 'react';
import {
  XIcon,
  RadioIcon,
  CalendarIcon,
  LockIcon,
  GlobeIcon,
  SparklesIcon
} from './Icons';

export const CreateSpaceModal = ({ isOpen, onClose, onSpaceCreated }) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('general');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for your Live Space.');
      return;
    }

    if (isScheduled && !scheduledFor) {
      setError('Please choose a date and time for scheduled space.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await onSpaceCreated({
        title: title.trim(),
        description: description.trim(),
        topic,
        isPrivate,
        scheduledFor: isScheduled && scheduledFor ? new Date(scheduledFor).toISOString() : undefined
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start Live Space.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg shadow-2xl flex flex-col relative text-[var(--text-main)] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <RadioIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)]">Start a Connectly Space</h2>
              <p className="text-xs text-[var(--text-secondary)]">Live, real-time voice discussions with the world</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-page)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              What do you want to talk about? *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI in Africa, Cultural Storytelling, Startup Pitching"
              style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>

          {/* Topic */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none', textTransform: 'capitalize' }}
            >
              <option value="general">General Chat</option>
              <option value="tech">Tech & AI</option>
              <option value="culture">Culture & Community</option>
              <option value="education">Education & Learning</option>
              <option value="business">Business & Finance</option>
              <option value="music">Music & Arts</option>
              <option value="social">Social & Lifestyle</option>
              <option value="languages">Languages & Translation</option>
              <option value="careers">Careers & Opportunities</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Description / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key talking points, invited speakers, or community rules..."
              style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-main)', outline: 'none', lineHeight: '1.5' }}
            />
          </div>

          {/* Schedule Toggle */}
          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={14} className="text-primary" />
                Schedule for Later
              </span>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </div>

            {isScheduled && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-main)', outline: 'none' }}
              />
            )}
          </div>

          {/* Privacy Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>
                {isPrivate ? 'Private Room' : 'Public Room'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                {isPrivate ? 'Only invited listeners and speakers can join' : 'Anyone on Connectly can discover and tune in'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={isPrivate ? 'badge-host' : 'badge-cohost'}
              style={{ cursor: 'pointer', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {isPrivate ? <LockIcon size={12} /> : <GlobeIcon size={12} />}
              <span>{isPrivate ? 'Private' : 'Public'}</span>
            </button>
          </div>

          {/* Actions */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-md"
              style={{ fontWeight: 800 }}
            >
              {loading
                ? 'Starting Space...'
                : isScheduled
                ? 'Schedule Space'
                : 'Start Live Space Now 🎙️'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
export default CreateSpaceModal;

