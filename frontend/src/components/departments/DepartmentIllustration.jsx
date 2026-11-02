const palette = {
  heart: { bg: "#fff0f1", color: "#e05466" },
  brain: { bg: "#f2edff", color: "#8161ca" },
  bone: { bg: "#fff5e7", color: "#c68a3e" },
  child: { bg: "#eaf6ff", color: "#3889c9" },
  skin: { bg: "#fff1e9", color: "#d57c59" },
  stethoscope: { bg: "#eaf7f2", color: "#279778" }
};

export default function DepartmentIllustration({ type = "stethoscope", size = 88 }) {
  const style = palette[type] || palette.stethoscope;
  const common = { fill: "none", stroke: style.color, strokeWidth: 3.3, strokeLinecap: "round", strokeLinejoin: "round" };
  return <div className="department-art" style={{ width: size, height: size, background: style.bg }} aria-hidden="true">
    <svg viewBox="0 0 100 100" width="78%" height="78%">
      {type === "heart" && <>
        <path {...common} d="M50 78 19 49C-1 27 25 9 42 25l8 9 8-9c17-16 43 2 23 24L50 78Z" />
        <path {...common} d="M13 51h19l8-15 12 30 9-17h25" />
      </>}
      {type === "brain" && <>
        <path {...common} d="M48 18c-10-8-22 1-20 12-12 5-13 21-3 28-5 13 5 24 17 21 4 8 14 7 18 1V26c0-7-6-11-12-8Z" />
        <path {...common} d="M52 18c10-8 22 1 20 12 12 5 13 21 3 28 5 13-5 24-17 21-4 8-14 7-18 1M50 25v49M29 39c9-3 14 4 12 12M70 39c-9-3-14 4-12 12M29 61c8-3 12 2 13 8M71 61c-8-3-12 2-13 8" />
      </>}
      {type === "bone" && <path {...common} d="M24 32c-7-8-18 1-12 9 2 3 6 4 9 3l38 38c-1 4 0 8 3 11 8 7 17-4 10-11 7 7 18-2 11-10-3-3-7-4-11-3L35 31c1-4 0-8-3-11-8-7-17 4-10 12Z" />}
      {type === "child" && <>
        <circle {...common} cx="50" cy="28" r="14" />
        <path {...common} d="M25 81c2-18 12-29 25-29s23 11 25 29M37 25c3-5 8-7 13-7 7 0 12 4 14 10M44 33h.1M57 33h.1M46 39c3 3 6 3 9 0" />
        <path {...common} d="M22 49c-5 8-5 16 0 23M78 49c5 8 5 16 0 23" />
      </>}
      {type === "skin" && <>
        <path {...common} d="M18 75c12-22 19-48 32-48s20 26 32 48" />
        <path {...common} d="M25 75h50M30 62h40M36 49h28M42 36h16" />
        <circle cx="34" cy="22" r="3" fill={style.color}/><circle cx="67" cy="17" r="3" fill={style.color}/><circle cx="80" cy="36" r="2.5" fill={style.color}/>
      </>}
      {type === "stethoscope" && <>
        <path {...common} d="M25 17v20c0 13 8 21 19 21s19-8 19-21V17M19 17h12M57 17h12M44 58v7c0 10 7 17 17 17h4" />
        <circle {...common} cx="73" cy="82" r="9" />
        <path {...common} d="M19 17v-4M69 17v-4" />
      </>}
    </svg>
  </div>;
}
