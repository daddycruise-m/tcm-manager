import React from 'react';
import { Users, Briefcase, Shield, } from 'lucide-react';
import '../styles/LandingPage.css';

export default function LandingPage({ onSelectRole, counts }) {
    const cards = [
        { id: 'members', title: 'Members', count: counts.members, icon: Users, color: '#3b82f6' },
        { id: 'workers', title: 'Workers', count: counts.workers, icon: Briefcase, color: '#8b5cf6' },
        { id: 'leaders', title: 'Leaders', count: counts.leaders, icon: Shield, color: '#10b981' }
    ];

    return(
        <div className="landing-container">
            <nav className='landing-nav'>
                {cards.map(c => (
                    <button 
                    key={c.id}
                    onClick={() => onSelectRole(c.id)}
                    className='glass-btn nav-link-btn'
                    >{c.title}
                    </button>
                ))}
            </nav>

            <div className="card-grid">
                {cards.map(card => {
                    const Icon = card.icon; 
                    return (
                        <div
                        key={card.id}
                        className='glass-card role-card'
                        onClick={() => onSelectRole(card.id)}
                        >
                            <div className="icon-wrapper" style={{ background: `${card.color}22 `}}>
                                <Icon size={32} color={card.color} />
                            </div>
                            <h3 className='card-title'>{card.title}</h3>
                            <p className='card-subtext'>Registered Total</p>
                            <h2 className='card-count' style={{color: card.color}}>{card.count}</h2>
                            </div>
                    );
                })}
            </div>
        </div>
    );
}