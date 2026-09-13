export function PageLoader({ visible }: { visible: boolean }) {
  return (
    <div className={`page-loader${visible ? '' : ' hidden'}`}>
      <div className="spinner"></div>
    </div>
  );
}
