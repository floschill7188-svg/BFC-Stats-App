export function formatRelativeTime(timestamp: any): string {
    if (!timestamp || typeof timestamp.seconds !== 'number') {
        return 'gerade eben';
    }
    const now = new Date();
    const notificationDate = new Date(timestamp.seconds * 1000);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    const minutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `vor ${weeks}w`;
    if (days > 0) return `vor ${days}d`;
    if (hours > 0) return `vor ${hours}h`;
    if (minutes > 0) return `vor ${minutes}m`;
    return `gerade eben`;
}
