// src/components/Leaders.jsx
import React, { useState, useRef } from "react";
import {
  ShieldCheck, UserPlus, Download, Search, CheckCircle2, 
  XCircle, Trash2, Award, CalendarCheck, Users, Activity, X, Edit
} from 'lucide-react';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../../styles/Leaders.css';
import '../../styles/LoginModal.css';
import { useTCM } from '../../context/TCMContext';

export default function Leaders() {
  const exportRef = useRef();

  const { leaders, addLeader, updateLeader, updateLeaderAttendance, deleteLeader, currentMonthKey } = useTCM();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);

  const [newLeader, setNewLeader] = useState({
    name: '', position: '', phone: '', gender: 'Male', dob: '', address: ''
  });

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
  const getLeaderMonthCount = (leader) => {
    if (leader.attendanceHistory && leader.attendanceHistory[selectedMonth] !== undefined) {
      return leader.attendanceHistory[selectedMonth];
    }
    return selectedMonth === currentMonthKey ? (leader.monthAttendances || 0) : 0;
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

  const handleToggleAttendance = (leader) => {
    const currentCount = getLeaderMonthCount(leader);
    const nextPresent = !leader.presentThisWeek;
    const newCount = nextPresent 
      ? currentCount + 1 
      : Math.max(0, currentCount - 1);

    updateLeaderAttendance(leader.id, nextPresent, newCount);
  };

  const handleDeleteLeader = (id) => {
    if (window.confirm('Are you sure you want to remove this leader?')) {
      deleteLeader(id);
    }
  };

  const handleSaveLeader = (e) => {
    e.preventDefault();
    if (!newLeader.name || !newLeader.position) return;
    
    if (editingLeader) {
      updateLeader(editingLeader.id, {
        ...editingLeader,
        ...newLeader
      });
    } else {
      addLeader({
        ...newLeader,
        monthAttendances: 0,
        presentThisWeek: false,
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
              Track leadership positions, engagements (3-attendance threshold), and active ratios
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
        <div className="roster-table-wrapper">
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
                <th>Sunday Attendance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaders.map(leader => {
                const monthCount = getLeaderMonthCount(leader);
                const isActive = monthCount >= 3;
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
                    <td>{monthCount} Services</td>
                    <td>
                      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active Leader' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`attendance-btn ${leader.presentThisWeek ? 'present' : 'absent'}`}
                        onClick={() => handleToggleAttendance(leader)}
                      >
                        {leader.presentThisWeek ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {leader.presentThisWeek ? 'Present' : 'Absent'}
                      </button>
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