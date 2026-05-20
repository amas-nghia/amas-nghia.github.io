import { experience } from '../../data/experience';
import { profile, skills } from '../../data/profile';
import type { Project } from '../../data/projects';

type ProjectsHudProps = {
  nearestProject: Project | null;
  activeProject: Project | null;
  onCloseProject: () => void;
};

export function ProjectsHud({ nearestProject, activeProject, onCloseProject }: ProjectsHudProps) {
  return (
    <div className="overlay">
      <header className="hero-panel">
        <p className="eyebrow">Interactive Game Developer Portfolio</p>
        <h1>{profile.name}</h1>
        <p className="title">{profile.title}</p>
        <p className="summary">{profile.summary}</p>
        <div className="hero-actions">
          <a href={profile.cvPath} target="_blank" rel="noreferrer">
            Download CV
          </a>
          <a href={profile.linkedIn} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={`mailto:${profile.email}`}>Email</a>
        </div>
      </header>

      <aside className="quick-panel">
        <div>
          <span className="panel-label">Controls</span>
          <p>WASD move - Q/E camera - Shift sprint - F inspect</p>
        </div>
        <div>
          <span className="panel-label">Skills</span>
          <div className="skill-list">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>
      </aside>

      <section className="experience-strip">
        {experience.map((item) => (
          <article key={item.company}>
            <strong>{item.company}</strong>
            <span>{item.role}</span>
            <small>{item.period}</small>
          </article>
        ))}
      </section>

      <div className={`prompt ${nearestProject ? 'is-visible' : ''}`}>
        {nearestProject ? `Press F to inspect ${nearestProject.name}` : ''}
      </div>

      <article className={`project-panel ${activeProject ? 'is-open' : ''}`} aria-live="polite">
        <button className="close-button" type="button" aria-label="Close project panel" onClick={onCloseProject}>
          x
        </button>
        <p className="eyebrow">Selected Project</p>
        <h2>{activeProject?.name}</h2>
        {activeProject ? (
          <>
            <p className="project-meta">
              {activeProject.platform} - {activeProject.role} - Team size: {activeProject.teamSize}
            </p>
            <div className="project-tech">
              {activeProject.tech.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </div>
            <ul>
              {activeProject.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </>
        ) : null}
      </article>
    </div>
  );
}
