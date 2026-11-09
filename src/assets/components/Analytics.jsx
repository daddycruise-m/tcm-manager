// src/components/Analytics.jsx
import React, { useState, useRef } from "react";

import {
    BarChart3, TrendingUp, Users, ShieldCheck, Download, ArrowRight, FileText
} from 'lucide-react';

import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import '../styles/Analytics.css';
import { useTCM } from '../context/TCMContext';

// Helper: Get unique ISO week key for real-time active weekly tracking (e.g., "2026-W45")
const getWeekKey = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum}`;
};

// Helper: Generate week keys for all weeks belonging to the selected month (YYYY-MM)
// Handles 4, 5, or 6 weeks dynamically based on the calendar month.
const getWeeksForMonth = (yearMonthStr) => {
    if (!yearMonthStr) return [];
    const [year, month] = yearMonthStr.split('-').map(Number);
    
    const weeks = [];
    const date = new Date(year, month - 1, 1);
    
    let weekIndex = 1;
    while (date.getMonth() === month - 1) {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - startOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        
        const weekKey = `${date.getFullYear()}-W${weekNum}`;
        if (!weeks.some(w => w.key === weekKey)) {
            weeks.push({
                key: weekKey,
                label: `Week ${weekIndex}`
            });
            weekIndex++;
        }
        date.setDate(date.getDate() + 7);
    }
    return weeks;
};

export default function Analytics() {
    const exportRef = useRef();
    const [selectedQuarter, setSelectedQuarter] = useState('Q4-2026');

    // Pull live state and currentMonthKey from TCMContext
    const { members = [], workers = [], leaders = [], units = [], currentMonthKey } = useTCM();

    // Track selected month for historical/current trend analysis
    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey || '2026-11');

    // Get all weeks for the selected month (dynamically 4, 5, or 6 weeks)
    const monthWeeks = getWeeksForMonth(selectedMonth);

    // Real-time KPI Calculations
    const totalMembers = members.length;
    const totalWorkers = workers.length;
    const totalLeaders = leaders.length;

    // Use actual live current week key for real-time KPI card tracking
    const currentWeek = getWeekKey();
    const sundayPresentMembers = members.filter(m => m.weeklyStatus?.[currentWeek] === 'served').length;
    const sundayPresentLeaders = leaders.filter(l => l.weeklyStatus?.[currentWeek] === 'served').length;
    
    // Male & Female Member breakdown
    const maleMembersCount = members.filter(m => (m.gender || '').toLowerCase() === 'male').length;
    const femaleMembersCount = members.filter(m => (m.gender || '').toLowerCase() === 'female').length;

    // Leader Participation (Threshold = 3 services/mo)
    const activeLeadersCount = leaders.filter(l => (l.monthAttendances || 0) >= 3).length;
    const inactiveLeadersCount = totalLeaders - activeLeadersCount;
    const leaderActiveRatio = totalLeaders > 0 ? ((activeLeadersCount / totalLeaders) * 100).toFixed(1) : '0.0';

    // Worker Capacity Calculation (Active Workers >= 2 Services)
    const activeWorkersCount = workers.filter(w => (w.monthServices || w.monthService || 0) >= 2).length;
    const workerCapacityRatio = totalWorkers > 0 ? ((activeWorkersCount / totalWorkers) * 100).toFixed(1) : '0.0';

    // Leader Participation Pie Data
    const leadersActivityData = [
        { name: 'Active Leaders (≥ 3)', value: activeLeadersCount, color: '#10b981' },
        { name: 'Inactive Leaders (< 3)', value: inactiveLeadersCount, color: '#ef4444' },
    ];

    // Map weekly attendance totals for Members
    const memberAttendanceTrendData = monthWeeks.map(week => {
        const count = members.filter(m => m.weeklyStatus?.[week.key] === 'served').length;
        return {
            week: week.label,
            SundayService: count
        };
    });

    // Map weekly attendance totals for Leaders
    const leaderAttendanceTrendData = monthWeeks.map(week => {
        const count = leaders.filter(l => l.weeklyStatus?.[week.key] === 'served').length;
        return {
            week: week.label,
            LeaderService: count
        };
    });

    // PDF Export Functionality
    const handleExportPDF = async () => {
        const element = exportRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`TCM_Executive_Analytics_${selectedMonth}.pdf`);
    };

    return (
        <div className="analytics-container" ref={exportRef}>
            {/* Header Bar */}
            <div className="glass-card analytics-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="analytics-title-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BarChart3 size={28} color="#8b5cf6" />
                    <div>
                        <h2 className="analytics-title">Analytics & Intelligence Dashboard</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Weekly Service Trends & Leadership Performance Breakdown ({selectedMonth})
                        </p>
                    </div>
                </div>

                <div className="analytics-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Month Selector to view current or past month trends */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>Month Trend:</label>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                        />
                    </div>

                    <button className="glass-btn" onClick={handleExportPDF} style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                        <Download size={16} style={{ marginRight: 6 }} /> Export Executive PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="kpi-grid">
                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Selected Week Members</span>
                        <span className="kpi-value">{sundayPresentMembers}</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {totalMembers > 0 ? ((sundayPresentMembers / totalMembers) * 100).toFixed(1) : 0}% Turnout
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <Users size={22} color="#3b82f6" />
                    </div>
                </div>

                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Selected Week Leaders</span>
                        <span className="kpi-value">{sundayPresentLeaders}</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {totalLeaders > 0 ? ((sundayPresentLeaders / totalLeaders) * 100).toFixed(1) : 0}% Leadership Turnout
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                        <ShieldCheck size={22} color="#10b981" />
                    </div>
                </div>

                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Active Leadership Ratio</span>
                        <span className="kpi-value">{leaderActiveRatio}%</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {activeLeadersCount} of {totalLeaders} Leaders Active
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                        <TrendingUp size={22} color="#8b5cf6" />
                    </div>
                </div>

                <div className="glass-card kpi-card">
                    <div className="kpi-details">
                        <span className="kpi-title">Unit Roster Strength</span>
                        <span className="kpi-value">{totalWorkers}</span>
                        <span className="kpi-trend positive">
                            <ArrowRight size={16} /> {workerCapacityRatio}% Operational Capacity
                        </span>
                    </div>

                    <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.2)' }}>
                        <Users size={22} color="#ec4899" />
                    </div>
                </div>
            </div>

            {/* Weekly Attendance Charts Grid (Members vs Leaders) */}
            <div className="charts-grid-two">
                {/* Members Weekly Trend */}
                <div className="glass-card chart-card">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Members Weekly Attendance ({selectedMonth})</h3>
                            <span className="chart-subtitle">Weekly turnout across {monthWeeks.length} Sundays</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={memberAttendanceTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMember" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="week" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--glass-border)', borderRadius: 8 }} 
                                    formatter={(value) => [`${value} members served`, 'Members Present']}
                                />
                                <Area type="monotone" dataKey="SundayService" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMember)" name="Members Service" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leaders Weekly Trend */}
                <div className="glass-card chart-card">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Leaders Weekly Attendance ({selectedMonth})</h3>
                            <span className="chart-subtitle">Leadership attendance trajectory across {monthWeeks.length} Sundays</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={leaderAttendanceTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLeader" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="week" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--glass-border)', borderRadius: 8 }} 
                                    formatter={(value) => [`${value} leaders served`, 'Leaders Present']}
                                />
                                <Area type="monotone" dataKey="LeaderService" stroke="#10b981" fillOpacity={1} fill="url(#colorLeader)" name="Leaders Service" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Executive Summary & Leadership Engagement Row */}
            <div className="charts-grid-two" style={{ marginTop: '24px' }}>
                <div className="glass-card chart-card">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Leadership Overall Ratio</h3>
                            <span className="chart-subtitle">Active Leaders (≥ 3 attendance/mo rule)</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 260 }}>
                        {totalLeaders > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie 
                                        data={leadersActivityData}  
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label
                                    >
                                        {leadersActivityData.map((entry, index) => (
                                            <Cell key={`cell-leader-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'var(--glass-border)', borderRadius: 8 }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '100px' }}>
                                No Leader records registered yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-card executive-summary-card">
                    <div className="chart-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={22} color="#3b82f6" />
                            <h3 className="chart-title">Executive Briefing ({selectedMonth})</h3>
                        </div>
                    </div>

                    <div className="summary-grid">
                        <div className="summary-item">
                            <div className="summary-bullet" style={{ background: '#3b82f6' }}></div>
                            <div className="summary-text">
                                <h5>Member Turnout Analysis</h5>
                                <p>Tracks weekly turnout across <strong>{monthWeeks.length} Sundays</strong>. Hover over the blue area chart above to see exact member counts per week.</p>
                            </div>
                        </div>

                        <div className="summary-item">
                            <div className="summary-bullet" style={{ background: '#10b981' }}></div>
                            <div className="summary-text">
                                <h5>Leader Attendance Trajectory</h5>
                                <p>Tracks leadership presence week by week. <strong>{sundayPresentLeaders} leaders</strong> served during the active week.</p>
                            </div>
                        </div>

                        <div className="summary-item">
                            <div className="summary-bullet" style={{ background: '#8b5cf6' }}></div>
                            <div className="summary-text">
                                <h5>Leadership Health Check</h5>
                                <p><strong>{leaderActiveRatio}%</strong> of registered leaders ({activeLeadersCount} of {totalLeaders}) meet or exceed the 3-service monthly threshold.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}