/**
 * Skip to Main Content Link
 * Accessibility feature for keyboard/screen reader users
 * Hidden until focused with Tab key
 */
const SkipLink = () => {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-primary focus:text-white focus:rounded-xl focus:font-bold focus:text-sm focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary/50"
        >
            Skip to main content
        </a>
    );
};

export default SkipLink;
