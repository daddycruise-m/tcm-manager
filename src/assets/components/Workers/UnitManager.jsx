// src/components/UnitManager.jsx
import React, { useState } from 'react'; 
import {
    Plus, Trash2, Check, X, UserPlus, Layers, BarChart2, PieChart as PieIcon, CheckCircle2,
    XCircle, Edit, Lock, ChevronDown, ChevronUp
} from 'lucide-react';

import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import '../../styles/UnitManager.css';
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

// Helper: Get initials for avatar (e.g. "Major Faith" -> "MF")
const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function UnitManager() {
    const { units, addUnit, deleteUnit, workers, addWorker, updateWorker, deleteWorker, currentMonthKey } = useTCM();

    const [selectedUnitId, setSelectedUnitId] = useState('1');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

    const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
    const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState(null);

    // Track which worker cards are expanded on mobile view
    const [expandedWorkerId, setExpandedWorkerId] = useState(null);

    const [newUnitName, setNewUnitName] = useState(''); 
    const [newUnitLogo, setNewUnitLogo] = useState('');

    const [newWorker, setNewWorker] = useState({
        name: '', phone: '', gender: 'Male', dob: '', address: ''
    });

    const activeUnit = units.find(u => u.id === selectedUnitId) || units[0];
    const activeWorkers = (workers || []).filter(w => w.unitId === selectedUnitId);

    const currentWeek = getWeekKey();
    const windowOpen = isAttendanceWindowOpen();

    // Helper to get worker service count strictly from attendance history for the selected month, defaulting to 0
    const getWorkerMonthCount = (worker) => {
        if (worker.attendanceHistory && worker.attendanceHistory[selectedMonth] !== undefined) {
            return worker.attendanceHistory[selectedMonth];
        }
        return 0;
    };

    const toggleExpandWorker = (workerId) => {
        setExpandedWorkerId(expandedWorkerId === workerId ? null : workerId);
    };

    // Calculate active stats based on the selected month's history (Threshold: 1+ services)
    const activeWorkerCount = activeWorkers.filter(w => getWorkerMonthCount(w) >= 1).length;
    const inactiveCount = activeWorkers.length - activeWorkerCount; 

    const pieData = [
        { name: 'Active (1+ Services)', value: activeWorkerCount, color: '#10b981' },
        { name: 'Inactive (0 Services)', value: inactiveCount, color: '#ef4444' }
    ];

    const handleAddUnit = (e) => {
        e.preventDefault();
        if (!newUnitName) return;
        
        addUnit({
            name: newUnitName,
            logo: newUnitLogo || '⚡'
        });

        setNewUnitName('');
        setNewUnitLogo('');
        setIsAddUnitOpen(false);
    };

    const handleDeleteUnit = (id, e) => {
        e.stopPropagation();
        if (units.length <= 1) return alert('Must retain at least one unit.');
        deleteUnit(id);
        if (selectedUnitId === id && units.length > 1) {
            const remaining = units.filter(u => u.id !== id);
            setSelectedUnitId(remaining[0].id);
        }
    };

    const handleOpenAddWorker = () => {
        setEditingWorker(null);
        setNewWorker({ name: '', phone: '', gender: 'Male', dob: '', address: '' });
        setIsAddWorkerOpen(true);
    };

    const handleOpenEditWorker = (worker) => {
        setEditingWorker(worker);
        setNewWorker({
            name: worker.name || '',
            phone: worker.phone || '',
            gender: worker.gender || 'Male',
            dob: worker.dob || '',
            address: worker.address || ''
        });
        setIsAddWorkerOpen(true);
    };

    const handleDeleteWorker = (id) => {
        if (window.confirm('Are you sure you want to delete this worker?')) {
            deleteWorker(id);
        }
    };

    // Handle Status Selection: 'served' or 'not' (Fully sanitized to prevent undefined Firebase crashes)
    const handleStatusSelect = (worker, status) => {
        if (!windowOpen) {
            alert('Service status updates are locked from Thursday through Saturday night.');
            return;
        }

        const weeklyStatusMap = worker.weeklyStatus || {};
        const prevStatus = weeklyStatusMap[currentWeek] || null;

        if (prevStatus === status) return; // No change

        let currentMonthCount = getWorkerMonthCount(worker);

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
            ...(worker.attendanceHistory || {}),
            [selectedMonth]: currentMonthCount
        };

        // Explicitly construct clean properties to guarantee ZERO undefined values reach Firebase
        updateWorker(worker.id, {
            name: worker.name || '',
            gender: worker.gender || 'Male',
            phone: worker.phone || '',
            address: worker.address || '',
            dob: worker.dob || '',
            unitId: worker.unitId || selectedUnitId,
            monthServices: Number(currentMonthCount) || 0,
            weeklyStatus: updatedWeeklyStatus,
            attendanceHistory: updatedAttendanceHistory
        });
    };

    const handleSaveWorker = (e) => {
        e.preventDefault();
        if (!newWorker.name || !selectedUnitId) return;

        if (editingWorker) {
            updateWorker(editingWorker.id, {
                ...editingWorker,
                ...newWorker
            });
        } else {
            addWorker({
                ...newWorker,
                unitId: selectedUnitId,
                monthServices: 0,
                weeklyStatus: {},
                attendanceHistory: { [currentMonthKey]: 0 }
            });
        }

        setNewWorker({ name: '', phone: '', gender: 'Male', dob: '', address: '' });
        setEditingWorker(null);
        setIsAddWorkerOpen(false);
    };

    return (
        <div className="unit-manager-container">
            {/* Top Header */}
            <div className="glass-card unit-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="unit-title-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Layers size={28} color="#8b5cf6" />
                    <div>
                        <h2 className="unit-title">Workers & Unit Hub</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Manage unit workers, service tracking, and historical activity reports
                        </p>
                    </div>
                </div>

                {/* Month Selector & Add Unit Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>Month:</label>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                        />
                    </div>

                    <button className="glass-btn" onClick={() => setIsAddUnitOpen(true)}>
                        <Plus size={16} style={{ marginRight: 6 }} /> Add Unit
                    </button>
                </div>
            </div>

            {/* Unit Selection Grid */}
            <div className="units-grid">
                {(units || []).map(unit => {
                    const count = (workers || []).filter(w => w.unitId === unit.id).length;
                    return (
                        <div
                            key={unit.id}
                            className={`glass-card unit-card ${selectedUnitId === unit.id ? 'active-unit' : ''}`}
                            onClick={() => setSelectedUnitId(unit.id)}
                        >
                            <div className="unit-card-header">
                                <div className="unit-logo-box">{unit.logo || '⚡'}</div>
                                <button className="delete-unit-btn" onClick={(e) => handleDeleteUnit(unit.id, e)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 className="unit-name">{unit.name}</h3>
                            <div className="unit-meta">
                                <span>Roster: {count} Workers</span>
                                <span>Active Hub</span>
                            </div>
                        </div>    
                    );
                })}
            </div>

            {/* Selected Unit Workers Roster */}
            <div className="glass-card roster-section">
                <div className="roster-header text-center-mobile">
                    <div>
                        <h3 className="centered-heading">{activeUnit?.logo} {activeUnit?.name} Roster ({selectedMonth})</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="text-center-mobile">
                            Viewing records for {selectedMonth} {windowOpen ? '🟢 Service Window Open' : '🔒 Window Locked (Sun-Wed Only)'}
                        </p>
                    </div>

                    <button className="glass-btn" onClick={handleOpenAddWorker}>
                        <UserPlus size={16} style={{ marginRight: 6 }} /> Add Worker
                    </button>
                </div>

                {/* Desktop Table View */}
                <div className="worker-table-wrapper desktop-roster-view">
                    <table className="worker-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Gender</th>
                                <th>Phone / Whatsapp</th>
                                <th>Address</th>
                                <th>Monthly Services</th>
                                <th>Service Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeWorkers.map(worker => {
                                const monthCount = getWorkerMonthCount(worker);
                                const workerWeeklyStatus = worker.weeklyStatus?.[currentWeek] || null;

                                return (
                                    <tr key={worker.id}>
                                        <td style={{ fontWeight: 600 }}>{worker.name}</td>
                                        <td>{worker.gender}</td>
                                        <td>{worker.phone || 'N/A'}</td>
                                        <td>{worker.address || 'N/A'}</td>
                                        <td><strong>{monthCount} served</strong></td>
                                        <td>
                                            <div className="status-btn-group" style={{ display: 'flex', gap: '6px' }}>
                                                <button 
                                                    type="button"
                                                    className={`status-action-btn served-option ${workerWeeklyStatus === 'served' ? 'active-served' : ''}`}
                                                    onClick={() => handleStatusSelect(worker, 'served')}
                                                    title={windowOpen ? "Mark as Served" : "Locked (Sun-Wed)"}
                                                >
                                                    <CheckCircle2 size={14} /> Served
                                                </button>
                                                <button 
                                                    type="button"
                                                    className={`status-action-btn not-option ${workerWeeklyStatus === 'not' ? 'active-not' : ''}`}
                                                    onClick={() => handleStatusSelect(worker, 'not')}
                                                    title={windowOpen ? "Mark as Not Served" : "Locked (Sun-Wed)"}
                                                >
                                                    <XCircle size={14} /> Not
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="icon-action-btn" onClick={() => handleOpenEditWorker(worker)} title="Edit Worker">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="icon-action-btn" onClick={() => handleDeleteWorker(worker.id)} title="Delete Worker">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {activeWorkers.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No workers registered in this unit yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Facebook Profile Dropdown List View */}
                <div className="mobile-roster-cards">
                    {activeWorkers.map(worker => {
                        const monthCount = getWorkerMonthCount(worker);
                        const workerWeeklyStatus = worker.weeklyStatus?.[currentWeek] || null;
                        const isExpanded = expandedWorkerId === worker.id;

                        return (
                            <div key={worker.id} className="mobile-profile-card">
                                {/* Clickable Header (Facebook Style Preview) */}
                                <div className="mobile-profile-header" onClick={() => toggleExpandWorker(worker.id)}>
                                    <div className="profile-avatar-circle">
                                        {getInitials(worker.name)}
                                    </div>
                                    <div className="profile-preview-info">
                                        <h4>{worker.name}</h4>
                                        <span>{worker.gender} • Tap to view details</span>
                                    </div>
                                    <div className="profile-expand-icon">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expandable Dropdown Details */}
                                {isExpanded && (
                                    <div className="mobile-profile-dropdown">
                                        <div className="dropdown-info-row">
                                            <span>Phone:</span>
                                            <strong>{worker.phone || 'N/A'}</strong>
                                        </div>
                                        <div className="dropdown-info-row">
                                            <span>Address:</span>
                                            <strong>{worker.address || 'N/A'}</strong>
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
                                                    className={`status-action-btn served-option ${workerWeeklyStatus === 'served' ? 'active-served' : ''}`}
                                                    onClick={() => handleStatusSelect(worker, 'served')}
                                                >
                                                    <CheckCircle2 size={14} /> Served
                                                </button>
                                                <button 
                                                    type="button"
                                                    className={`status-action-btn not-option ${workerWeeklyStatus === 'not' ? 'active-not' : ''}`}
                                                    onClick={() => handleStatusSelect(worker, 'not')}
                                                >
                                                    <XCircle size={14} /> Not
                                                </button>
                                            </div>
                                        </div>

                                        <div className="dropdown-actions-row">
                                            <button className="glass-btn action-edit-btn" onClick={() => handleOpenEditWorker(worker)}>
                                                <Edit size={14} style={{ marginRight: 4 }} /> Edit
                                            </button>
                                            <button className="glass-btn action-delete-btn" onClick={() => handleDeleteWorker(worker.id)}>
                                                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {activeWorkers.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                            No workers registered in this unit yet.
                        </p>
                    )}
                </div>
            </div>

            {/* Dynamic Charts Section */}
            <div className="analytics-grid" style={{ marginTop: 24 }}>
                <div className="glass-card chart-card">
                    <h4 className="chart-title centered-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <PieIcon size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
                        {activeUnit?.name} Activity Distribution ({selectedMonth})
                    </h4>

                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--glass-border)', borderRadius: 8 }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Modal: Add Unit */}
            {isAddUnitOpen && (
                <div className="modal-overlay" onClick={() => setIsAddUnitOpen(false)}>
                    <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setIsAddUnitOpen(false)}><X size={18} /></button>
                        <h3>Create New Worker Unit</h3>
                        <form onSubmit={handleAddUnit} className="modal-form" style={{ marginTop: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Unit Name</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="e.g. Sanitation, Protocol" 
                                    value={newUnitName}
                                    onChange={e => setNewUnitName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Unit Emoji / Icon Symbol</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="e.g. 🧹"
                                    value={newUnitLogo}
                                    onChange={e => setNewUnitLogo(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="glass-btn" style={{ marginTop: 10 }}>Create Unit</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal: Add / Edit Worker */}
            {isAddWorkerOpen && (
                <div className="modal-overlay" onClick={() => setIsAddWorkerOpen(false)}>
                    <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setIsAddWorkerOpen(false)}><X size={18} /></button>
                        <h3>{editingWorker ? `Edit Worker (${editingWorker.name})` : `Add Worker to ${activeUnit?.name}`}</h3>
                        <form onSubmit={handleSaveWorker} className="modal-form" style={{ marginTop: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input 
                                    type="text"
                                    className="glass-input"
                                    placeholder="Full Name"
                                    value={newWorker.name}
                                    onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone / Whatsapp</label>
                                <input 
                                    type="text"
                                    className="glass-input"
                                    placeholder="+234..."
                                    value={newWorker.phone}
                                    onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Residential Address</label>
                                <input 
                                    type="text"
                                    className="glass-input"
                                    placeholder="e.g. 12 Church Street, Asaba"
                                    value={newWorker.address}
                                    onChange={e => setNewWorker({ ...newWorker, address: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select
                                    className="glass-input"
                                    value={newWorker.gender}
                                    onChange={e => setNewWorker({ ...newWorker, gender: e.target.value })}
                                >
                                    <option value="Male" style={{ background: '#0f172a' }}>Male</option>
                                    <option value="Female" style={{ background: '#0f172a' }}>Female</option>
                                </select>
                            </div>

                            <button type="submit" className="glass-btn" style={{ marginTop: 10 }}>
                                {editingWorker ? 'Update Worker Details' : 'Register Worker'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}