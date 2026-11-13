/**
 * AmbientBackground
 * -----------------
 * Renders the ambient coloured light blobs that the Liquid Glass surfaces
 * refract. Using a fixed-position React element (not CSS background-image
 * on body) because iOS Safari does not support background-attachment:fixed
 * on any element — the blobs simply don't appear there.
 *
 * z-index: 0 keeps it behind all app content.
 * The page background colour (#06060f) is set on body via CSS.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top-left violet blob — primary ambient light source */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '70%',
        height: '60%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.42) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Bottom-right indigo blob */}
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: '65%',
        height: '70%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.34) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Centre-right soft violet — adds mid-screen depth */}
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '5%',
        width: '45%',
        height: '40%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.18) 0%, transparent 70%)',
        filter: 'blur(80px)',
      }} />

      {/* Top-right accent — subtle complementary blue-violet */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '10%',
        width: '35%',
        height: '30%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(99, 70, 220, 0.20) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />
    </div>
  );
}
