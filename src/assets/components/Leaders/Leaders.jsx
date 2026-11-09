// src/components/Leaders.jsx
import React, { useState, useRef } from "react";
import {
  ShieldCheck, UserPlus, Download, Search, CheckCircle2, 
  XCircle, Trash2, Award, CalendarCheck, Users, Activity, X, Edit,
  ChevronDown, ChevronUp
} from 'lucide-react';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../../styles/Leaders.css';
import '../../styles/LoginModal.css';
import { useTCM } from '../../context/TCMContext';

// Helper: Check if service status window is open (Sunday 00:00 to Wednesday 23:59:59)
const isAttendanceWindowOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday
    return day >= 0 && day <= 3;
};

// Helper: Get unique ISO week key for weekly tracking (e.g., "2026-W44")
const getWeekKey = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
};

// Helper: Get initials for avatar (e.g. "Pastor Samuel" -> "PS")
const getInitials = (name) => {
    if (!name) return 'L';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function Leaders() {
  const exportRef = useRef();

  const { leaders, addLeader, updateLeader, deleteLeader, currentMonthKey } = useTCM();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  
  // Track which leader card is expanded on mobile view
  const [expandedLeaderId, setExpandedLeaderId] = useState(null);

  const [newLeader, setNewLeader] = useState({
    name: '', position: '', phone: '', gender: 'Male', dob: '', address: ''
  });

  const currentWeek = getWeekKey();
  const windowOpen = isAttendanceWindowOpen();
  const isCurrentMonthSelected = selectedMonth === currentMonthKey;

  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper to extract attendance count strictly from attendance history for the selected month, defaulting to 0
  const getLeaderMonthCount = (leader) => {
    if (leader.attendanceHistory && leader.attendanceHistory[selectedMonth] !== undefined) {
      return leader.attendanceHistory[selectedMonth];
    }
    return 0; // Strictly returns 0 if no record exists for this historical month
  };

  const toggleExpandLeader = (leaderId) => {
    setExpandedLeaderId(expandedLeaderId === leaderId ? null : leaderId);
  };

  const totalLeaders = leaders ? leaders.length : 0;
  const activeLeadersCount = leaders ? leaders.filter(l => getLeaderMonthCount(l) >= 3).length : 0;
  const inactiveLeadersCount = totalLeaders - activeLeadersCount;
  const activeRatio = totalLeaders > 0 ? ((activeLeadersCount / totalLeaders) * 100).toFixed(1) : 0;

  const filteredLeaders = (leaders || []).filter(leader => {
    const matchesSearch = (leader.name && leader.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (leader.position && leader.position.toLowerCase().includes(searchTerm.toLowerCase()));
    const isActive = getLeaderMonthCount(leader) >= 3;

    if (activeTab === 'active') return matchesSearch && isActive;
    if (activeTab === 'inactive') return matchesSearch && !isActive;
    return matchesSearch;
  });

  const handleOpenAddLeader = () => {
    setEditingLeader(null);
    setNewLeader({ name: '', position: '', phone: '', gender: 'Male', dob: '', address: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenEditLeader = (leader) => {
    setEditingLeader(leader);
    setNewLeader({
      name: leader.name || '',
      position: leader.position || '',
      phone: leader.phone || '',
      gender: leader.gender || 'Male',
      dob: leader.dob || '',
      address: leader.address || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteLeader = (id) => {
    if (window.confirm('Are you sure you want to remove this leader?')) {
      deleteLeader(id);
    }
  };

  // Handle Status Selection: 'served' or 'not' (Sanitized against undefined Firebase crashes & locked for historical months)
  const handleStatusSelect = (leader, status) => {
    if (!isCurrentMonthSelected) {
      alert('Service status updates are locked for historical or non-current months.');
      return;
    }

    if (!windowOpen) {
      alert('Service status updates are locked from Thursday through Saturday night.');
      return;
    }

    const weeklyStatusMap = leader.weeklyStatus || {};
    const prevStatus = weeklyStatusMap[currentWeek] || null;

    if (prevStatus === status) return; // No change

    let currentMonthCount = getLeaderMonthCount(leader);

    // Adjust monthly count
    if (status === 'served' && prevStatus !== 'served') {
        currentMonthCount += 1;
    } else if (prevStatus === 'served' && status !== 'served') {
        currentMonthCount = Math.max(0, currentMonthCount - 1);
    }

    const updatedWeeklyStatus = {
        ...weeklyStatusMap,
        [currentWeek]: status
    };

    const updatedAttendanceHistory = {
        ...(leader.attendanceHistory || {}),
        [selectedMonth]: currentMonthCount
    };

    updateLeader(leader.id, {
        name: leader.name || '',
        position: leader.position || '',
        phone: leader.phone || '',
        address: leader.address || '',
        dob: leader.dob || '',
        gender: leader.gender || 'Male',
        monthAttendances: Number(currentMonthCount) || 0,
        weeklyStatus: updatedWeeklyStatus,
        attendanceHistory: updatedAttendanceHistory
    });
  };

  const handleSaveLeader = (e) => {
    e.preventDefault();
    if (!newLeader.name || !newLeader.position) return;
    
    if (editingLeader) {
      // Build a clean payload and remove any undefined fields for Firebase
      const updatedData = {
        name: newLeader.name,
        position: newLeader.position,
        gender: newLeader.gender || 'Male',
        dob: newLeader.dob || '',
        phone: newLeader.phone || '',
        address: newLeader.address || '',
        monthAttendances: Number(editingLeader.monthAttendances) || 0,
        weeklyStatus: editingLeader.weeklyStatus || {},
        attendanceHistory: editingLeader.attendanceHistory || { [currentMonthKey]: 0 }
      };

      updateLeader(editingLeader.id, updatedData);
    } else {
      addLeader({
        ...newLeader,
        monthAttendances: 0,
        weeklyStatus: {},
        attendanceHistory: { [currentMonthKey]: 0 }
      });
    }

    setNewLeader({ name: '', position: '', phone: '', gender: 'Male', dob: '', address: '' });
    setEditingLeader(null);
    setIsAddModalOpen(false);
  };

  const handleExportPDF = async () => {
    const element = exportRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`TCM_Leaders_Report_${selectedMonth}.pdf`);
  };

  return (
    <div className="leaders-container">
      {/* Header Bar */}
      <div className="glass-card leaders-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="leaders-title-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={28} color="#10b981" />
          <div>
            <h2 className="leaders-title">Leaders Management Hub ({selectedMonth})</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Track leadership positions, engagements (3-attendance threshold), and active ratios {!isCurrentMonthSelected ? '🔒 Locked (Historical Month)' : (windowOpen ? '🟢 Service Window Open' : '🔒 Window Locked (Sun-Wed Only)')}
            </p>
          </div>
        </div>

        <div className="leaders-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Month Selector Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>Month:</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            />
          </div>

          <button className="glass-btn" onClick={handleExportPDF} style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>
            <Download size={16} style={{ marginRight: 6 }} /> Export PDF
          </button>
          <button className="glass-btn" onClick={handleOpenAddLeader} style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
            <UserPlus size={16} style={{ marginRight: 6 }} /> Add Leader
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="leaders-stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalLeaders}</span>
            <span className="stat-label">Total Registered Leaders</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
            <CalendarCheck size={24} color="#10b981" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{activeLeadersCount}</span>
            <span className="stat-label">Active (≥ 3 Services/Mo)</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <XCircle size={24} color="#ef4444" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{inactiveLeadersCount}</span>
            <span className="stat-label">Inactive (&lt; 3 Services/Mo)</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
            <Activity size={24} color="#8b5cf6" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{activeRatio}%</span>
            <span className="stat-label">Active Participation Rate</span>
          </div>
        </div>
      </div>

      {/* Search & Filtering Bar */}
      <div className="glass-card filter-bar">
        <div className="search-box">
          <Search className="search-icon" size={18} />
          <input 
            type="text"
            className="glass-input search-input"
            placeholder="Search by Leader name or position..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            All Records ({totalLeaders})
          </button>
          <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            Active ({activeLeadersCount})
          </button>
          <button className={`tab-btn ${activeTab === 'inactive' ? 'active' : ''}`} onClick={() => setActiveTab('inactive')}>
            Inactive ({inactiveLeadersCount})
          </button>
        </div>
      </div>

      {/* Roster & Printable Table Area */}
      <div className="glass-card roster-card" ref={exportRef}>
        {/* Desktop Table View */}
        <div className="roster-table-wrapper desktop-roster-view">
          <table className="leaders-table">
            <thead>
              <tr>
                <th>Leader Name</th>
                <th>Position Tags</th>
                <th>Age / Gender</th>
                <th>Phone / Whatsapp</th>
                <th>Address</th>
                <th>Monthly Log</th>
                <th>Overall Status</th>
                <th>Service Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaders.map(leader => {
                const monthCount = getLeaderMonthCount(leader);
                const isActive = monthCount >= 3;
                const leaderWeeklyStatus = leader.weeklyStatus?.[currentWeek] || null;

                return (
                  <tr key={leader.id}>
                    <td style={{ fontWeight: 600 }}>{leader.name}</td>
                    <td>
                      <span className="position-tag">
                        <Award size={12} /> {leader.position}
                      </span>
                    </td>
                    <td>{calculateAge(leader.dob)} yrs ({leader.gender})</td>
                    <td>{leader.phone || 'N/A'}</td>
                    <td>{leader.address || 'N/A'}</td>
                    <td><strong>{monthCount} served</strong></td>
                    <td>
                      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active Leader' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="status-btn-group" style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button"
                          className={`status-action-btn served-option ${leaderWeeklyStatus === 'served' ? 'active-served' : ''}`}
                          onClick={() => handleStatusSelect(leader, 'served')}
                          disabled={!isCurrentMonthSelected || !windowOpen}
                          title={!isCurrentMonthSelected ? "Locked (Historical Month)" : (windowOpen ? "Mark as Served" : "Locked (Sun-Wed)")}
                        >
                          <CheckCircle2 size={14} /> Served
                        </button>
                        <button 
                          type="button"
                          className={`status-action-btn not-option ${leaderWeeklyStatus === 'not' ? 'active-not' : ''}`}
                          onClick={() => handleStatusSelect(leader, 'not')}
                          disabled={!isCurrentMonthSelected || !windowOpen}
                          title={!isCurrentMonthSelected ? "Locked (Historical Month)" : (windowOpen ? "Mark as Not Served" : "Locked (Sun-Wed)")}
                        >
                          <XCircle size={14} /> Not
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="action-btn-group" style={{ display: 'flex', gap: '6px' }}>
                        <button className="icon-action-btn" onClick={() => handleOpenEditLeader(leader)} title="Edit Leader">
                          <Edit size={16} />
                        </button>
                        <button className="icon-action-btn" onClick={() => handleDeleteLeader(leader.id)} title="Delete Leader">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLeaders.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No leadership records matched your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Facebook Profile Dropdown List View */}
        <div className="mobile-roster-cards">
          {filteredLeaders.map(leader => {
            const monthCount = getLeaderMonthCount(leader);
            const isActive = monthCount >= 3;
            const leaderWeeklyStatus = leader.weeklyStatus?.[currentWeek] || null;
            const isExpanded = expandedLeaderId === leader.id;

            return (
              <div key={leader.id} className="mobile-profile-card">
                {/* Clickable Header (Facebook Style Preview) */}
                <div className="mobile-profile-header" onClick={() => toggleExpandLeader(leader.id)}>
                  <div className="profile-avatar-circle">
                    {getInitials(leader.name)}
                  </div>
                  <div className="profile-preview-info">
                    <h4>{leader.name}</h4>
                    <span>{calculateAge(leader.dob)} yrs ({leader.gender}) • Tap to view details</span>
                  </div>
                  <div className="profile-expand-icon">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expandable Dropdown Details */}
                {isExpanded && (
                  <div className="mobile-profile-dropdown">
                    <div className="dropdown-info-row">
                      <span>Position:</span>
                      <strong>{leader.position}</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Phone:</span>
                      <strong>{leader.phone || 'N/A'}</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Address:</span>
                      <strong>{leader.address || 'N/A'}</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Monthly Log:</span>
                      <strong>{monthCount} Services</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Overall Status:</span>
                      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                        {isActive ? 'Active Leader' : 'Inactive'}
                      </span>
                    </div>

                    <div className="dropdown-attendance-section">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Service Status:</label>
                      <div className="status-btn-group" style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button 
                          type="button"
                          className={`status-action-btn served-option ${leaderWeeklyStatus === 'served' ? 'active-served' : ''}`}
                          onClick={() => handleStatusSelect(leader, 'served')}
                          disabled={!isCurrentMonthSelected || !windowOpen}
                        >
                          <CheckCircle2 size={14} /> Served
                        </button>
                        <button 
                          type="button"
                          className={`status-action-btn not-option ${leaderWeeklyStatus === 'not' ? 'active-not' : ''}`}
                          onClick={() => handleStatusSelect(leader, 'not')}
                          disabled={!isCurrentMonthSelected || !windowOpen}
                        >
                          <XCircle size={14} /> Not
                        </button>
                      </div>
                    </div>

                    <div className="dropdown-actions-row">
                      <button className="glass-btn action-edit-btn" onClick={() => handleOpenEditLeader(leader)}>
                        <Edit size={14} style={{ marginRight: 4 }} /> Edit
                      </button>
                      <button className="glass-btn action-delete-btn" onClick={() => handleDeleteLeader(leader.id)}>
                        <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredLeaders.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              No leadership records matched your search query.
            </p>
          )}
        </div>
      </div>

      {/* Modal: Add / Edit Leader */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            <h3>{editingLeader ? 'Edit Leader Details' : 'Register Leadership Member'}</h3>
            <form onSubmit={handleSaveLeader} className="modal-form" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Pastor Samuel" 
                  value={newLeader.name} 
                  onChange={e => setNewLeader({...newLeader, name: e.target.value})} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Position / Tag</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Teens Church Pastor" 
                  value={newLeader.position} 
                  onChange={e => setNewLeader({...newLeader, position: e.target.value})} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input 
                  type="date" 
                  className="glass-input" 
                  value={newLeader.dob} 
                  onChange={e => setNewLeader({ ...newLeader, dob: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="glass-input" 
                  value={newLeader.gender}
                  onChange={e => setNewLeader({ ...newLeader, gender: e.target.value })} 
                >
                  <option value="Male" style={{ background: '#0f172a' }}>Male</option>
                  <option value="Female" style={{ background: '#0f172a' }}>Female</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Phone / Whatsapp Number</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="+234..." 
                  value={newLeader.phone} 
                  onChange={e => setNewLeader({ ...newLeader, phone: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. 45 Executive Way, Asaba" 
                  value={newLeader.address} 
                  onChange={e => setNewLeader({ ...newLeader, address: e.target.value })} 
                />
              </div>

              <button type="submit" className="glass-btn" style={{ marginTop: 10, background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                {editingLeader ? 'Update Leader Record' : 'Register Leader'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}