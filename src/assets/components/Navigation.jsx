import React from "react";
import { Users, ShieldCheck, Briefcase, BarChart3, FileCheck, Home } from "lucide-react";
import { useTCM } from '../context/TCMContext';
import '../styles/Navigation.css';

export default function Navigation({ currentView, setCurrentView, onOPenLogin }) {
    const tcmContext = useTCM();
    const currentUser = tcmContext?.currentUser || tcmContext?.user || null;

    const navItems = [
        { id: 'landing', label: 'Home', icon: Home },
        { id: 'members', label: 'Members', icon: Users },
        { id: 'workers', label: 'Workers Hub', icon: Briefcase, roleRequired: 'workers' },
        { id: 'leaders', label: 'Leaders Portal', icon: ShieldCheck, roleRequired: 'leaders' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports Generators', icon: FileCheck },
    ];

    const handleNavClick = (item) => {
        if (item.roleRequired) {
            const hasAccess = currentUser && (currentUser.role === item.roleRequired || currentUser.role === 'admin');
            if (!hasAccess) {
                onOPenLogin(item.roleRequired);
                return;
            }
        }
        setCurrentView(item.id);
    };

    return (
        <nav className="glass-card main-nav">
            <div className="nav-links-group">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                        <button 
                            key={item.id} 
                            className={`nav-item-btn ${isActive ? 'active' : ''}`}
                            onClick={() => handleNavClick(item)}
                        >
                            <Icon size={16} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}