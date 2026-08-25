import Link from "next/link";
import Clock from "./Clock";
import NavLinks from "./NavLinks";
import { getProjectConfig } from "@/lib/config";

// The persistent HUD frame and top bar, on every screen.
export default function Chrome() {
  const project = getProjectConfig();
  const projectSlug = project.name.toLowerCase().replace(/\s+/g, "-");
  return (
    <>
      <div className="frame" aria-hidden="true">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Saarathi, command center home">
          <span className="mk" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 18c3.5 0 3.5-12 7-12s3.5 12 7 12" stroke="#33e2c6" strokeWidth="2" strokeLinecap="round" />
              <circle cx="19.6" cy="18" r="1.7" fill="#33e2c6" />
            </svg>
          </span>
          <span className="nm">SAARATHI</span>
        </Link>
        <span className="sep" />
        <NavLinks />
        <span className="proj" title={project.path || "running on bundled snapshot"}>
          <span className="dot" />
          <span>{projectSlug}</span>
        </span>
        <div className="status-r">
          <span className="nominal">
            <span className="d" />
            <span className="lbl" style={{ color: "var(--accent)" }}>All systems nominal</span>
          </span>
          <span className="readout">
            ENV <b>{project.env}</b>&nbsp;&nbsp;<Clock />
          </span>
        </div>
      </header>
    </>
  );
}
