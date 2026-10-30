// src/components/Members.jsx
import React, { useState, useRef } from 'react';
import {
  Users, UserPlus, Download, Search, CheckCircle2, 
  XCircle, Trash2, CalendarCheck, Clock, X, AlertTriangle, UserCheck, Edit
} from 'lucide-react';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../../styles/Members.css';
import '../../styles/LoginModal.css';
import { useTCM } from '../../context/TCMContext';

export default function Members() {
  const exportRef = useRef();

  const { members, addMember, updateMember, updateMemberAttendance, deleteMember } = useTCM();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [newMember, setNewMember] = useState({
    name: '', gender: 'Male', dob: '', phone: '', unit: 'General', address: ''
  });

  const isAfterWednesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek > 3 || (dayOfWeek === 3 && today.getHours() >= 23 && today.getMinutes() >= 59);
  };

  const cutoffApplied = isAfterWednesday();

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

  const totalMembers = members ? members.length : 0;
  const maleCount = members ? members.filter(m => m.gender === 'Male').length : 0;
  const femaleCount = members ? members.filter(m => m.gender === 'Female').length : 0;
  const presentCount = members ? members.filter(m => m.presentThisWeek).length : 0;

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

  const handleToggleAttendance = (member) => {
    if (cutoffApplied) return;

    const nextPresent = !member.presentThisWeek;
    const newCount = nextPresent 
      ? (member.monthAttendances || 0) + 1 
      : Math.max(0, (member.monthAttendances || 0) - 1);

    updateMemberAttendance(member.id, nextPresent, newCount);
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
        presentThisWeek: false
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
    pdf.save(`TCM_Members_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="members-container">
      {/* Header Bar */}
      <div className="glass-card members-header-bar">
        <div className="members-title-section">
          <Users size={28} color="#3b82f6" />
          <div>
            <h2 className="members-title">Members Management Directory</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time attendance logs, auto-age evaluation, and weekly cutoffs
            </p>
          </div>
        </div>
        <div className="members-actions">
          <button className="glass-btn" onClick={handleExportPDF} style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>
            <Download size={16} style={{ marginRight: 6 }} /> Export PDF
          </button>
          <button className="glass-btn" onClick={handleOpenAdd} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <UserPlus size={16} style={{ marginRight: 6 }} /> Add Member
          </button>
        </div>
      </div>

      {/* Wednesday Cutoff Banner */}
      {cutoffApplied && (
        <div className="cutoff-banner">
          <AlertTriangle size={18} />
          <span>
            <strong>Wednesday Cutoff Passed:</strong> Weekly attendance updates are now locked until the next Sunday cycle starts.
          </span>
        </div>
      )}

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
            <span className="stat-label">Present This Sunday</span>
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

      {/* Printable Roster Table */}
      <div className="glass-card roster-card" ref={exportRef}>
        <div className="roster-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Calculated Age</th>
                <th>Unit / Service Group</th>
                <th>Phone Number</th>
                <th>Residential Address</th>
                <th>Monthly Count</th>
                <th>Sunday Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <tr key={member.id}>
                  <td>
                    <div className="member-identity">
                      <div className={`gender-avatar ${(member.gender || 'male').toLowerCase()}`}>
                        {member.name ? member.name.charAt(0) : 'M'}
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
                  <td>{member.monthAttendances || 0} Services</td>
                  <td>
                    <button
                      className={`attendance-btn ${member.presentThisWeek ? 'present' : 'absent'}`}
                      onClick={() => handleToggleAttendance(member)}
                      disabled={cutoffApplied}
                      title={cutoffApplied ? 'Attendance locked post-Wednesday' : 'Click to toggle attendance'}
                    >
                      {member.presentThisWeek ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {member.presentThisWeek ? 'Present' : 'Absent'}
                    </button>
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
              ))}

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