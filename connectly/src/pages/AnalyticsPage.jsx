import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { apiGetCreatorAnalytics } from '../services/api';
import {
  TrendingUpIcon,
  UsersIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  EyeIcon,
  SparklesIcon,
  FilmIcon
} from '../components/Icons';

export const AnalyticsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadAnalytics();
  }, [isAuthenticated]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiGetCreatorAnalytics();
      if (res.success) {
        setAnalytics(res);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted">
        <div className="spinner mx-auto mb-3"></div>
        <p>Crunching creator metrics and analytics...</p>
      </div>
    );
  }

  const metrics = analytics?.metrics || {};
  const growthTrend = analytics?.growthTrend || [];
  const topPosts = analytics?.topPosts || [];
  const dist = analytics?.contentDistribution || { text: 0, photos: 0, videos: 0 };
  const totalContent = dist.text + dist.photos + dist.videos || 1;

  // Max value for scaling SVG bar chart
  const maxFollowers = Math.max(...growthTrend.map((d) => d.followers), 10);

  return (
    <div className="analytics-page-wrapper">
      {/* Header Card */}
      <div className="card analytics-header-card mb-4">
        <div className="analytics-header-title">
          <TrendingUpIcon size={26} className="text-primary" />
          <div>
            <h2>Creator Analytics Dashboard</h2>
            <p className="text-muted text-sm">
              Real-time performance, audience growth, and engagement statistics
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="analytics-kpi-grid mb-4">
        <div className="card kpi-card">
          <div className="kpi-icon-circle bg-primary-soft">
            <UsersIcon size={22} className="text-primary" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Followers</span>
            <span className="kpi-value">{metrics.totalFollowers || 0}</span>
            <span className="kpi-trend text-success">↑ Active</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-circle bg-danger-soft">
            <HeartIcon size={22} className="text-danger" filled={true} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Likes</span>
            <span className="kpi-value">{metrics.totalLikes || 0}</span>
            <span className="kpi-trend text-muted">Across all content</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-circle bg-info-soft">
            <MessageCircleIcon size={22} className="text-info" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Comments</span>
            <span className="kpi-value">{metrics.totalComments || 0}</span>
            <span className="kpi-trend text-muted">Audience responses</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon-circle bg-warning-soft">
            <SparklesIcon size={22} className="text-warning" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Avg Engagement</span>
            <span className="kpi-value">{metrics.engagementRate || 0}</span>
            <span className="kpi-trend text-primary">Score per post</span>
          </div>
        </div>
      </div>

      {/* Charts Section: 7-Day Growth Trend & Content Distribution */}
      <div className="analytics-charts-row mb-4">
        {/* Interactive Growth Bar Chart */}
        <div className="card chart-card growth-chart-card">
          <div className="chart-header">
            <h4>7-Day Audience Growth</h4>
            <span className="badge badge-primary">Follower Trend</span>
          </div>
          <p className="text-muted text-xs mb-3">Daily active followers trend</p>

          <div className="chart-bars-container">
            {growthTrend.map((item, idx) => {
              const heightPercent = Math.max(15, Math.round((item.followers / maxFollowers) * 100));

              return (
                <div key={idx} className="chart-bar-column">
                  <span className="chart-bar-value">{item.followers}</span>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.followers} followers on ${item.date}`}
                    />
                  </div>
                  <span className="chart-bar-label">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Distribution Meter */}
        <div className="card chart-card distribution-card">
          <div className="chart-header">
            <h4>Content Portfolio</h4>
            <span className="badge badge-outline">Published</span>
          </div>
          <p className="text-muted text-xs mb-3">Distribution of your shared media</p>

          <div className="distribution-progress-track mb-3">
            <div
              className="dist-segment dist-photos"
              style={{ width: `${(dist.photos / totalContent) * 100}%` }}
              title="Photos"
            />
            <div
              className="dist-segment dist-videos"
              style={{ width: `${(dist.videos / totalContent) * 100}%` }}
              title="Videos / Reels"
            />
            <div
              className="dist-segment dist-text"
              style={{ width: `${(dist.text / totalContent) * 100}%` }}
              title="Text Posts"
            />
          </div>

          <div className="dist-legend-list">
            <div className="dist-legend-item">
              <span className="legend-dot dist-photos-dot"></span>
              <span className="legend-name">Photos & Media</span>
              <span className="legend-count">{dist.photos}</span>
            </div>

            <div className="dist-legend-item">
              <span className="legend-dot dist-videos-dot"></span>
              <span className="legend-name">Short Videos & Reels</span>
              <span className="legend-count">{dist.videos}</span>
            </div>

            <div className="dist-legend-item">
              <span className="legend-dot dist-text-dot"></span>
              <span className="legend-name">Text Posts</span>
              <span className="legend-count">{dist.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Content Leaderboard */}
      <div className="card analytics-leaderboard-card">
        <div className="leaderboard-header mb-3">
          <h4>Top Performing Content</h4>
          <span className="text-muted text-xs">Ranked by total likes and shares</span>
        </div>

        {topPosts.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <p>Publish posts or reels to see performance rankings here.</p>
          </div>
        ) : (
          <div className="leaderboard-table">
            <div className="table-header-row">
              <span className="col-rank">Rank</span>
              <span className="col-content">Content</span>
              <span className="col-type">Type</span>
              <span className="col-likes">Likes</span>
              <span className="col-shares">Shares</span>
            </div>

            {topPosts.map((post, idx) => (
              <div key={post._id} className="table-data-row">
                <span className="col-rank rank-badge">#{idx + 1}</span>
                <span className="col-content post-snippet">
                  {post.snippet || 'Media post'}
                </span>
                <span className="col-type type-badge">
                  {post.type === 'video' ? '🎬 Video' : post.type === 'image' ? '📷 Photo' : '📝 Text'}
                </span>
                <span className="col-likes">❤️ {post.likesCount}</span>
                <span className="col-shares">🔗 {post.shareCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

