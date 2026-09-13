export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="SecureLens logo" role="img">
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10v-6L12 2.5Z" stroke="#000" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="11.5" r="3.2" stroke="#22C55E" strokeWidth="1.6" />
      <path d="m14.4 13.9 2.1 2.1" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
