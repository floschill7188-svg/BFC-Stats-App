import React from 'react';

interface TallyMarksProps {
  count: number;
}

const TallyGroup: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
        <line x1="4" y1="4" x2="4" y2="20"></line>
        <line x1="8" y1="4" x2="8" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
        <line x1="16" y1="4" x2="16" y2="20"></line>
        <line x1="2" y1="18" x2="18" y2="6"></line>
    </svg>
);

const TallySingle: React.FC = () => (
    <svg width="8" height="24" viewBox="0 0 8 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
        <line x1="4" y1="4" x2="4" y2="20"></line>
    </svg>
);

const TallyMarks: React.FC<TallyMarksProps> = ({ count }) => {
    if (isNaN(count) || count <= 0) {
        return <span className="text-gray-400">-</span>;
    }

    const groups = Math.floor(count / 5);
    const singles = count % 5;

    return (
        <span className="flex items-center flex-wrap" aria-label={`${count} Striche`}>
            {Array.from({ length: groups }).map((_, i) => <TallyGroup key={`group-${i}`} />)}
            {Array.from({ length: singles }).map((_, i) => <TallySingle key={`single-${i}`} />)}
        </span>
    );
};

export default TallyMarks;
