// src/components/Members.jsx
import React, { useState, useRef } from 'react';
import {
  Users, UserPlus, Download, Search, CheckCircle2, 
  XCircle, Trash2, CalendarCheck, Clock, X, AlertTriangle, UserCheck, Edit,
  ChevronDown, ChevronUp
} from 'lucide-react';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../../styles/Members.css';
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

// Helper: Get initials for avatar (e.g. "Samuel Kalu" -> "SK")
const getInitials = (name) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function Members() {
  const exportRef = useRef();

  const { members, addMember, updateMember, deleteMember, currentMonthKey } = useTCM();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Track which member card is expanded on mobile view
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  const [newMember, setNewMember] = useState({
    name: '', gender: 'Male', dob: '', phone: '', unit: 'General', address: ''
  });

  const currentWeek = getWeekKey();
  const windowOpen = isAttendanceWindowOpen();

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

  // Helper to extract attendance count for the selected historical month
  const getMemberMonthCount = (member) => {
    if (member.attendanceHistory && member.attendanceHistory[selectedMonth] !== undefined) {
      return member.attendanceHistory[selectedMonth];
    }
    return Number(member.monthAttendances) || 0;
  };

  const toggleExpandMember = (memberId) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  const totalMembers = members ? members.length : 0;
  const maleCount = members ? members.filter(m => m.gender === 'Male').length : 0;
  const femaleCount = members ? members.filter(m => m.gender === 'Female').length : 0;
  
  // Count how many members have 'served' status for the current week
  const presentCount = members ? members.filter(m => m.weeklyStatus?.[currentWeek] === 'served').length : 0;

  const filteredMembers = (members || []).filter(member => {
    const query = searchTerm.toLowerCase();
    const unitName = member.unit || member.units || '';
    const addressStr = member.address || '';
    const matchesSearch = (member.name && member.name.toLowerCase().includes(query)) ||
                          unitName.toLowerCase().includes(query) ||
                          addressStr.toLowerCase().includes(query) ||
                          (member.phone && member.phone.includes(query));

    if (activeTab === 'male') return matchesSearch && member.gender === 'Male';
    if (activeTab === 'female') return matchesSearch && member.gender === 'Female';
    return matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingMember(null);
    setNewMember({ name: '', gender: 'Male', dob: '', phone: '', unit: 'General', address: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setNewMember({
      name: member.name || '',
      gender: member.gender || 'Male',
      dob: member.dob || '',
      phone: member.phone || '',
      unit: member.unit || 'General',
      address: member.address || ''
    });
    setIsAddModalOpen(true);
  };

  // Handle Status Selection: 'served' or 'not' (Fully sanitized to prevent undefined Firebase crashes)
  const handleStatusSelect = (member, status) => {
    if (!windowOpen) {
      alert('Service status updates are locked from Thursday through Saturday night.');
      return;
    }

    const weeklyStatusMap = member.weeklyStatus || {};
    const prevStatus = weeklyStatusMap[currentWeek] || null;

    if (prevStatus === status) return; // No change

    let currentMonthCount = getMemberMonthCount(member);

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
        ...(member.attendanceHistory || {}),
        [selectedMonth]: currentMonthCount
    };

    updateMember(member.id, {
        name: member.name || '',
        gender: member.gender || 'Male',
        dob: member.dob || '',
        phone: member.phone || '',
        unit: member.unit || 'General',
        address: member.address || '',
        monthAttendances: Number(currentMonthCount) || 0,
        weeklyStatus: updatedWeeklyStatus,
        attendanceHistory: updatedAttendanceHistory
    });
  };

  const handleDeleteMember = (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      deleteMember(id);
    }
  };

  const handleSaveMember = (e) => {
    e.preventDefault();
    if (!newMember.name) return;

    if (editingMember) {
      updateMember(editingMember.id, {
        ...editingMember,
        ...newMember
      });
    } else {
      addMember({
        ...newMember,
        monthAttendances: 0,
        weeklyStatus: {},
        attendanceHistory: { [currentMonthKey]: 0 }
      });
    }

    setNewMember({ name: '', gender: 'Male', dob: '', phone: '', unit: 'General', address: '' });
    setEditingMember(null);
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
    pdf.save(`TCM_Members_Report_${selectedMonth}.pdf`);
  };

  return (
    <div className="members-container">
      {/* Header Bar */}
      <div className="glass-card members-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="members-title-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={28} color="#3b82f6" />
          <div>
            <h2 className="members-title">Members Management Directory ({selectedMonth})</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time attendance logs, historical records, and weekly tracking {windowOpen ? '🟢 Service Window Open' : '🔒 Window Locked (Sun-Wed Only)'}
            </p>
          </div>
        </div>
        <div className="members-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
          <button className="glass-btn" onClick={handleOpenAdd} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <UserPlus size={16} style={{ marginRight: 6 }} /> Add Member
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="members-stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalMembers}</span>
            <span className="stat-label">Total Membership Roster</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
            <UserCheck size={24} color="#10b981" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{presentCount}</span>
            <span className="stat-label">Served This Week</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <CalendarCheck size={24} color="#60a5fa" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{maleCount}</span>
            <span className="stat-label">Male Members</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>
            <Clock size={24} color="#f472b6" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{femaleCount}</span>
            <span className="stat-label">Female Members</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="glass-card filter-bar">
        <div className="search-box">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="glass-input search-input"
            placeholder="Search by name, unit, address, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            All ({totalMembers})
          </button>
          <button className={`tab-btn ${activeTab === 'male' ? 'active' : ''}`} onClick={() => setActiveTab('male')}>
            Male ({maleCount})
          </button>
          <button className={`tab-btn ${activeTab === 'female' ? 'active' : ''}`} onClick={() => setActiveTab('female')}>
            Female ({femaleCount})
          </button>
        </div>
      </div>

      {/* Printable Roster Table & Mobile Cards Container */}
      <div className="glass-card roster-card" ref={exportRef}>
        {/* Desktop Table View */}
        <div className="roster-table-wrapper desktop-roster-view">
          <table className="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Calculated Age</th>
                <th>Unit / Service Group</th>
                <th>Phone Number</th>
                <th>Residential Address</th>
                <th>Monthly Services</th>
                <th>Service Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => {
                const monthCount = getMemberMonthCount(member);
                const memberWeeklyStatus = member.weeklyStatus?.[currentWeek] || null;

                return (
                  <tr key={member.id}>
                    <td>
                      <div className="member-identity">
                        <div className={`gender-avatar ${(member.gender || 'male').toLowerCase()}`}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{member.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td>{calculateAge(member.dob)} yrs</td>
                    <td>
                      <span className="unit-tag">{member.unit || member.units || 'General'}</span>
                    </td>
                    <td>{member.phone || 'N/A'}</td>
                    <td>{member.address || 'N/A'}</td>
                    <td><strong>{monthCount} served</strong></td>
                    <td>
                      <div className="status-btn-group" style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button"
                          className={`status-action-btn served-option ${memberWeeklyStatus === 'served' ? 'active-served' : ''}`}
                          onClick={() => handleStatusSelect(member, 'served')}
                          title={windowOpen ? "Mark as Served" : "Locked (Sun-Wed)"}
                        >
                          <CheckCircle2 size={14} /> Served
                        </button>
                        <button 
                          type="button"
                          className={`status-action-btn not-option ${memberWeeklyStatus === 'not' ? 'active-not' : ''}`}
                          onClick={() => handleStatusSelect(member, 'not')}
                          title={windowOpen ? "Mark as Not Served" : "Locked (Sun-Wed)"}
                        >
                          <XCircle size={14} /> Not
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="icon-action-btn" onClick={() => handleOpenEdit(member)} title="Edit Member">
                          <Edit size={16} />
                        </button>
                        <button className="icon-action-btn" onClick={() => handleDeleteMember(member.id)} title="Delete Member">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No members match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Facebook Profile Dropdown List View */}
        <div className="mobile-roster-cards">
          {filteredMembers.map(member => {
            const monthCount = getMemberMonthCount(member);
            const memberWeeklyStatus = member.weeklyStatus?.[currentWeek] || null;
            const isExpanded = expandedMemberId === member.id;

            return (
              <div key={member.id} className="mobile-profile-card">
                {/* Clickable Header (Facebook Style Preview) */}
                <div className="mobile-profile-header" onClick={() => toggleExpandMember(member.id)}>
                  <div className="profile-avatar-circle" style={{ background: member.gender === 'Female' ? 'linear-gradient(135deg, #ec4899, #3b82f6)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                    {getInitials(member.name)}
                  </div>
                  <div className="profile-preview-info">
                    <h4>{member.name}</h4>
                    <span>{calculateAge(member.dob)} yrs ({member.gender}) • Tap to view details</span>
                  </div>
                  <div className="profile-expand-icon">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expandable Dropdown Details */}
                {isExpanded && (
                  <div className="mobile-profile-dropdown">
                    <div className="dropdown-info-row">
                      <span>Unit / Group:</span>
                      <strong>{member.unit || member.units || 'General'}</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Phone:</span>
                      <strong>{member.phone || 'N/A'}</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Address:</span>
                      <strong>{member.address || 'N/A'}</strong>
                    </div>
                    <div className="dropdown-info-row">
                      <span>Monthly Services:</span>
                      <strong>{monthCount} served</strong>
                    </div>

                    <div className="dropdown-attendance-section">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Service Status:</label>
                      <div className="status-btn-group" style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button 
                          type="button"
                          className={`status-action-btn served-option ${memberWeeklyStatus === 'served' ? 'active-served' : ''}`}
                          onClick={() => handleStatusSelect(member, 'served')}
                        >
                          <CheckCircle2 size={14} /> Served
                        </button>
                        <button 
                          type="button"
                          className={`status-action-btn not-option ${memberWeeklyStatus === 'not' ? 'active-not' : ''}`}
                          onClick={() => handleStatusSelect(member, 'not')}
                        >
                          <XCircle size={14} /> Not
                        </button>
                      </div>
                    </div>

                    <div className="dropdown-actions-row" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button className="glass-btn action-edit-btn" onClick={() => handleOpenEdit(member)} style={{ flex: 1, padding: '8px', fontSize: '0.8rem', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                        <Edit size={14} style={{ marginRight: 4 }} /> Edit
                      </button>
                      <button className="glass-btn action-delete-btn" onClick={() => handleDeleteMember(member.id)} style={{ flex: 1, padding: '8px', fontSize: '0.8rem', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredMembers.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              No members match your criteria.
            </p>
          )}
        </div>
      </div>

      {/* Modal: Add / Edit Member */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={18} /></button>
            <h3>{editingMember ? 'Edit Member Record' : 'Register New Member'}</h3>
            <form onSubmit={handleSaveMember} className="modal-form" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Samuel Kalu"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="glass-input"
                  value={newMember.gender}
                  onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                >
                  <option value="Male" style={{ background: '#0f172a' }}>Male</option>
                  <option value="Female" style={{ background: '#0f172a' }}>Female</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date Of Birth</label>
                <input
                  type="date"
                  className="glass-input"
                  value={newMember.dob}
                  onChange={e => setNewMember({ ...newMember, dob: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Service Group / Unit</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Choir, Media, Hospitality, Ushering"
                  value={newMember.unit}
                  onChange={e => setNewMember({ ...newMember, unit: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="+234......"
                  value={newMember.phone}
                  onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. 88 Gateway Avenue, Asaba"
                  value={newMember.address}
                  onChange={e => setNewMember({ ...newMember, address: e.target.value })}
                />
              </div>

              <button type="submit" className="glass-btn" style={{ marginTop: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                {editingMember ? 'Update Member Record' : 'Save Member Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}