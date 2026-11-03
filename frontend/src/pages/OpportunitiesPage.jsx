import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetOpportunities,
  apiGetSavedOpportunities,
  apiDeleteOpportunity
} from '../services/api';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetailModal } from '../components/OpportunityDetailModal';
import { CreateOpportunityModal } from '../components/CreateOpportunityModal';
import { ReportModal } from '../components/ReportModal';
import EmptyState from '../components/EmptyState';
import {
  BriefcaseIcon,
  SearchIcon,
  PlusSquareIcon,
  BookmarkIcon,
  FilterIcon,
  GraduationCapIcon,
  AwardIcon,
  UsersIcon,
  CalendarIcon,
  SparklesIcon,
  CheckIcon
} from '../components/Icons';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Opportunities', icon: BriefcaseIcon },
  { id: 'job', label: 'Jobs', icon: BriefcaseIcon },
  { id: 'internship', label: 'Internships', icon: UsersIcon },
  { id: 'scholarship', label: 'Scholarships', icon: GraduationCapIcon },
  { id: 'training', label: 'Training', icon: AwardIcon },
  { id: 'competition', label: 'Competitions', icon: AwardIcon },
  { id: 'volunteer', label: 'Volunteer', icon: UsersIcon },
  { id: 'workshop', label: 'Workshops & Events', icon: CalendarIcon }
];

export const OpportunitiesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [reportTargetOpp, setReportTargetOpp] = useState(null);

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);

      if (savedOnly) {
        if (!isAuthenticated) {
          navigate('/login');
          return;
        }
        const res = await apiGetSavedOpportunities();
        if (res.success) {
          setOpportunities(res.opportunities || []);
          setTotalCount(res.count || 0);
        }
      } else {
        const res = await apiGetOpportunities({
          category: activeCategory,
          workType: workTypeFilter,
          search: searchQuery,
          includeExpired,
          page: 1,
          limit: 25
        });

        if (res.success) {
          setOpportunities(res.opportunities || []);
          setTotalCount(res.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      showToast('Failed to load opportunities feed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, workTypeFilter, searchQuery, savedOnly, includeExpired, isAuthenticated]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpportunities();
  };

  const handleDeleteOpportunity = async (oppId) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
    try {
      const res = await apiDeleteOpportunity(oppId);
      if (res.success) {
        setOpportunities((prev) => prev.filter((o) => o._id !== oppId));
        showToast('Opportunity removed successfully.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete opportunity.', 'error');
    }
  };

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="opportunities-page-container">
      {/* Hero Header */}
      <div className="card opportunities-hero-card">
        <div className="opp-hero-left">
          <div className="opp-hero-badge">
            <SparklesIcon size={14} className="text-primary" />
            <span>Connectly Global Career & Academic Bridge</span>
          </div>
          <h1 className="opp-hero-title">Connectly Opportunities</h1>
          <p className="opp-hero-subtitle">
            Explore verified career, academic, and development pathways: jobs, internships, scholarships, and training programs across borders.
          </p>
        </div>

        <div className="opp-hero-actions">
          <button
            type="button"
            className="btn btn-primary btn-md opp-publish-hero-btn"
            onClick={handleOpenCreateModal}
          >
            <PlusSquareIcon size={17} />
            <span>Publish Opportunity</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Bar */}
      <div className="opp-categories-bar-wrapper">
        <div className="opp-categories-bar">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id && !savedOnly;
            return (
              <button
                key={tab.id}
                type="button"
                className={`opp-cat-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSavedOnly(false);
                  setActiveCategory(tab.id);
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card opp-filters-bar">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="opp-search-box">
          <SearchIcon size={17} className="opp-search-icon" />
          <input
            type="text"
            className="opp-search-input"
            placeholder="Search by role, company, skills, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Work Type Filter */}
        <div className="opp-filter-select-box">
          <select
            className="form-select opp-worktype-select"
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
          >
            <option value="">🌐 All Work Types</option>
            <option value="remote">🌐 Remote Only</option>
            <option value="hybrid">🏢 Hybrid</option>
            <option value="on_site">📍 On-Site</option>
          </select>
        </div>

        {/* Saved Items Toggle */}
        <button
          type="button"
          className={`btn btn-sm ${savedOnly ? 'btn-primary' : 'btn-outline'} opp-saved-toggle-btn`}
          onClick={() => setSavedOnly((prev) => !prev)}
          title="View my saved bookmarks"
        >
          <BookmarkIcon size={15} filled={savedOnly} />
          <span>Saved</span>
        </button>

        {/* Expired Toggle */}
        <button
          type="button"
          className={`btn btn-sm ${includeExpired ? 'btn-primary' : 'btn-outline'} opp-expired-toggle-btn`}
          onClick={() => setIncludeExpired((prev) => !prev)}
          title="Include past deadline opportunities"
        >
          <span>Expired</span>
        </button>
      </div>

      {/* Opportunities Feed / Grid */}
      <div className="opp-content-section">
        {loading ? (
          <div className="opp-loading-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="card opp-skeleton-card">
                <div className="skeleton-avatar skeleton-pulse"></div>
                <div className="skeleton-line skeleton-pulse" style={{ width: '70%', height: '18px' }}></div>
                <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: '14px' }}></div>
                <div className="skeleton-line skeleton-pulse" style={{ width: '90%', height: '40px', marginTop: '10px' }}></div>
              </div>
            ))}
          </div>
        ) : opportunities.length > 0 ? (
          <div className="opp-grid">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp._id}
                opportunity={opp}
                onViewDetails={(selected) => setSelectedOpportunity(selected)}
                onDeleteOpportunity={handleDeleteOpportunity}
                onReportOpportunity={(target) => setReportTargetOpp(target)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              savedOnly
                ? 'No Saved Opportunities'
                : 'No Opportunities Found'
            }
            description={
              savedOnly
                ? 'You have not saved any opportunities yet. Bookmark opportunities you are interested in to review them later!'
                : 'No opportunities currently match your search filters. Try selecting a different category or clearing filters.'
            }
            actionLabel="Publish an Opportunity"
            onAction={handleOpenCreateModal}
          />
        )}
      </div>

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onOpportunityCreated={(newOpp) => {
          setOpportunities((prev) => [newOpp, ...prev]);
          setTotalCount((prev) => prev + 1);
        }}
      />

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        isOpen={!!selectedOpportunity}
        opportunity={selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        onReportClick={(opp) => {
          setSelectedOpportunity(null);
          setReportTargetOpp(opp);
        }}
      />

      {/* Report Modal */}
      {reportTargetOpp && (
        <ReportModal
          isOpen={!!reportTargetOpp}
          post={{ _id: reportTargetOpp._id }}
          targetType="opportunity"
          onClose={() => setReportTargetOpp(null)}
          onPostReported={() => {
            showToast('Opportunity report submitted for review.', 'info');
            setReportTargetOpp(null);
          }}
        />
      )}
    </div>
  );
};

