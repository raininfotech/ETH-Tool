export function truncateString(text: string): string {
    const truncatedText = text.substring(0, 10) + "..." + text.substring(text.length - 10);
    return truncatedText;
}
