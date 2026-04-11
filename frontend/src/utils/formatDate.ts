export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'Date TBD';
  
  // Handle string dates that might be in different formats
  let dateToProcess = date;
  if (typeof date === 'string') {
    // If it's a date string like "2024-01-15", ensure it's properly formatted
    if (date.includes('-')) {
      dateToProcess = date;
    }
  }
  
  const d = new Date(dateToProcess);
  if (isNaN(d.getTime())) {
    console.warn('Invalid date:', date);
    return 'Date TBD';
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (time: string): string => {
  return time;
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'Date TBD';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'Date TBD';
  
  const now = new Date();
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const diffInMs = now.getTime() - d.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return formatDate(date);
};
