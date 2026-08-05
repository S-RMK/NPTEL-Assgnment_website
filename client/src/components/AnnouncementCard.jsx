import { Pin, Megaphone } from 'lucide-react';

const AnnouncementCard = ({ announcement }) => {
    return (
        <div className="glass-panel" style={{
            padding: '1.25rem',
            borderRadius: '16px',
            marginBottom: '1rem',
            background: announcement.isPinned ? 'rgba(234, 179, 8, 0.08)' : 'var(--clr-bg-card)',
            border: announcement.isPinned ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid var(--clr-border)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Megaphone size={18} color={announcement.isPinned ? '#eab308' : '#38bdf8'} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: announcement.isPinned ? '#fde047' : '#7dd3fc', textTransform: 'uppercase' }}>
                        {announcement.isPinned ? 'Pinned Announcement' : 'Announcement'}
                    </span>
                </div>
                {announcement.isPinned && <Pin size={16} color="#eab308" />}
            </div>

            <h4 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.05rem' }}>{announcement.title}</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--clr-text-muted)', lineHeight: '1.4' }}>
                {announcement.content}
            </p>
        </div>
    );
};

export default AnnouncementCard;
