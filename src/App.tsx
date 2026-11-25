import { useEffect, useState, type ReactNode } from "react";
import AdminPanel from "./AdminPanel";
import { normalizeSearch, useAdminCatalog, useRegistry } from "./adminData";
import type { Role, Tour, Zone } from "./tourData";
import { useModalDialog } from "./useModalDialog";
import { zonePhotos } from "./zonePhotos";

type View = "inicio" | "catalogo" | "panel" | "recorrido" | "guia" | "admin";
type Modality = "Todos" | Tour["type"];
type Progress = { lastZone: string; visited: string[] };
type ProgressByTour = Record<string, Progress>;

function useLocalState<T,>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The current browser session can still use the state in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function Dialog({ label, close, className, children }: { label: string; close: () => void; className: string; children: ReactNode }) {
  const ref = useModalDialog();

  return (
    <dialog
      ref={ref}
      className={"ui-dialog " + className}
      aria-label={label}
      onCancel={event => {
        event.preventDefault();
        close();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
          if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) close();
        }
      }}
    >
      <button className="close" type="button" aria-label="Cerrar" onClick={close}><Icon name="close" /></button>
      {children}
    </dialog>
  );
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    logo: <><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="m7 9 5-3 5 3-5 3-5-3Zm5 3v6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    route: <><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18c7 0 1-12 8-12"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    wifi: <><path d="M4 10a12 12 0 0 1 16 0M7 14a7 7 0 0 1 10 0M10 18a3 3 0 0 1 4 0"/><circle cx="12" cy="21" r=".5" fill="currentColor"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    star: <path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3l-6.2 3.2L7 13.7 2 9l7-.9L12 2Z"/>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1 1.8V21h-4v-.2a2 2 0 0 0-1-1.8 2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1a2 2 0 0 0 .4-2.2 2 2 0 0 0-1.8-1H3v-4h.2a2 2 0 0 0 1.8-1 2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1a2 2 0 0 0 2.2.4 2 2 0 0 0 1-1.8V3h4v.2a2 2 0 0 0 1 1.8 2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.8 1h.2v4h-.2a2 2 0 0 0-2 1.4Z"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Header({ view, navigate, role, changeRole }: { view: View; navigate: (view: View) => void; role: Role; changeRole: (role: Role) => void }) {
  const nav: [View, string][] = role === "visitante"
    ? [["inicio", "Inicio"], ["catalogo", "Recorridos"], ["panel", "Mi progreso"]]
    : role === "guia"
      ? [["guia", "Panel del guía"], ["catalogo", "Recorridos"]]
      : [["admin", "Administración"], ["catalogo", "Recorridos"]];

  return (
    <header className="header">
      <button className="brand" aria-label="Ir al inicio" onClick={() => navigate("inicio")}>
        <span className="brand-mark"><Icon name="logo" size={25} /></span>
        <span>Chichén Itzá<small>RECORRIDOS VIRTUALES</small></span>
      </button>
      <nav aria-label="Navegación principal">
        {nav.map(([id, label]) => (
          <button key={id} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}>{label}</button>
        ))}
      </nav>
      <div className="role-switch">
        <label htmlFor="role">Rol de prueba</label>
        <select id="role" value={role} onChange={event => changeRole(event.target.value as Role)}>
          <option value="visitante">Visitante</option>
          <option value="guia">Guía</option>
          <option value="administrador">Administrador</option>
        </select>
      </div>
    </header>
  );
}

function ZoneImage({ zoneId, priority = false }: { zoneId: string; priority?: boolean }) {
  const photo = zonePhotos[zoneId];
  return photo ? (
    <img className="zone-image" src={photo.src} alt={photo.alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" />
  ) : null;
}

function TourCard({ tour, onOpen }: { tour: Tour; onOpen: () => void }) {
  return (
    <article className="tour-card">
      <div className="tour-image">
        <ZoneImage zoneId={tour.zoneIds[0]} />
        <span className={"pill " + (tour.type === "Individual" ? "light" : "terra")}>{tour.type}</span>
      </div>
      <div className="tour-body">
        <p className="eyebrow">{tour.tag}</p>
        <h3>{tour.title}</h3>
        <div className="tour-meta"><span><Icon name="clock" size={16} />{tour.time}</span><span><Icon name="globe" size={16} />{tour.language}</span></div>
        <button className="text-button" onClick={onOpen} aria-label={"Ver detalles de " + tour.title}>Ver detalles <Icon name="arrow" size={17} /></button>
      </div>
    </article>
  );
}

function Home({ setView, openCatalog, openTour, tours, role }: { setView: (v: View) => void; openCatalog: (modality: Modality) => void; openTour: (id: string) => void; tours: Tour[]; role: Role }) {
  return <main>
    <section className="hero">
      <div className="hero-image"><ZoneImage zoneId="castillo" priority /></div>
      <div className="hero-overlay"/>
      <div className="hero-copy"><p className="kicker">PATRIMONIO QUE TRASCIENDE DISTANCIAS</p><h1>Explora el mundo<br/>maya, <em>sin fronteras.</em></h1><p>Recorre Chichén Itzá a tu ritmo o prueba una sesión grupal con una guía de ejemplo.</p>
        <div className="hero-actions"><button className="primary" onClick={() => openCatalog("Todos")}>Explorar recorridos <Icon name="arrow"/></button><button className="secondary" onClick={() => setView(role === "visitante" ? "panel" : role === "guia" ? "guia" : "admin")}>{role === "visitante" ? "Ver mi progreso" : role === "guia" ? "Panel del guía" : "Administración"}</button></div>
        <div className="live-status"><span className="pulse"/><strong>Prototipo académico</strong><span>Sesiones grupales simuladas</span></div>
      </div>
    </section>

    <section className="intro section"><div><p className="kicker dark">DOS FORMAS DE DESCUBRIR</p><h2>Tu recorrido, a tu manera.</h2></div><p className="section-lead">Elige la libertad de explorar a tu ritmo o la riqueza de compartir el camino con otras personas.</p></section>
    <section className="modes section">
      <article className="mode-card"><div className="mode-icon"><Icon name="route" size={26}/></div><h3>Recorrido individual</h3><p>Explora las paradas a tu ritmo y reanuda tu visita desde este navegador.</p><button className="text-button" onClick={() => openCatalog("Individual")}>Explorar por mi cuenta <Icon name="arrow" size={17}/></button></article>
      <article className="mode-card featured"><div className="mode-icon"><Icon name="users" size={26}/></div><h3>Experiencia grupal</h3><p>Prueba el itinerario, los avatares y los controles de guía en una sesión simulada.</p><button className="text-button" onClick={() => openCatalog("Grupal")}>Ver recorridos grupales <Icon name="arrow" size={17}/></button></article>
    </section>

    <section className="featured-tours section"><div className="section-head"><div><p className="kicker dark">SELECCIÓN DESTACADA</p><h2>Empieza por aquí.</h2></div><button className="outline" onClick={() => setView("catalogo")}>Ver todos los recorridos</button></div>
      <div className="tour-grid">{tours.slice(0, 3).map(t => <TourCard key={t.id} tour={t} onOpen={() => openTour(t.id)}/>)}</div>
    </section>
  </main>;
}

function Catalog({ tours, zones, selected, select, start, filter, setFilter }: {
  tours: Tour[];
  zones: Zone[];
  selected: Tour | undefined;
  select: (id: string | null) => void;
  start: (id: string) => void;
  filter: Modality;
  setFilter: (filter: Modality) => void;
}) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const publicZones = zones.filter(zone => zone.access === "public");
  const list = tours.filter(tour =>
    (filter === "Todos" || tour.type === filter)
    && (!language || tour.language === language)
    && normalizeSearch(tour.title).includes(normalizeSearch(query))
  );

  return (
    <main className="page">
      <div className="page-title"><div><p className="kicker dark">EXPERIENCIAS DISPONIBLES</p><h1>Recorridos por Chichén Itzá</h1><p>Descubre historias, arquitectura y saberes mayas en experiencias diseñadas para ti.</p></div></div>
      <div className="filters">
        <div className="search"><input aria-label="Buscar recorridos" placeholder="Buscar recorridos…" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="filter-tabs" role="group" aria-label="Modalidad">
          {(["Todos", "Individual", "Grupal"] as const).map(value => <button className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value}</button>)}
        </div>
        <select aria-label="Idioma del recorrido" value={language} onChange={event => setLanguage(event.target.value)}><option value="">Todos los idiomas</option><option>Español</option><option>Inglés</option></select>
      </div>
      <div className="catalog-layout">
        <div className="tour-grid catalog">{list.length ? list.map(tour => <TourCard key={tour.id} tour={tour} onOpen={() => select(tour.id)} />) : <p role="status">No hay recorridos que coincidan con los filtros.</p>}</div>
        <aside className="zones" aria-label="Zonas culturales">
          <h3>{publicZones.length} zonas públicas</h3>
          {publicZones.map((zone, index) => <div className="zone-row" key={zone.id}><span>{index + 1}</span><b>{zone.name}</b></div>)}
        </aside>
      </div>
      {selected && (
        <Dialog label={selected.title} close={() => select(null)} className="detail-drawer">
          {zonePhotos[selected.zoneIds[0]] && <div className="drawer-photo"><ZoneImage zoneId={selected.zoneIds[0]} /></div>}
          <p className="kicker dark">{selected.type} · {selected.language}</p>
          <h2>{selected.title}</h2>
          <p>{selected.type === "Grupal" ? "Explora el itinerario y la dinámica de guía en una sesión simulada." : "Visita las paradas del itinerario a tu ritmo."}</p>
          <ul className="itinerary">{selected.zoneIds.map(id => <li key={id}>{zones.find(zone => zone.id === id)?.name}</li>)}</ul>
          <p>{selected.time} estimados</p>
          <button className="primary full" onClick={() => start(selected.id)}>{selected.type === "Grupal" ? "Entrar a la sesión de prueba" : "Iniciar o reanudar el recorrido"} <Icon name="arrow" /></button>
        </Dialog>
      )}
    </main>
  );
}

function VisitorPanel({ tours, progress, start, navigate }: { tours: Tour[]; progress: ProgressByTour; start: (id: string) => void; navigate: (view: View) => void }) {
  const [avatar, setAvatar] = useLocalState("chichen-avatar", "Luna del Mayab");
  const [editing, setEditing] = useState(false);
  const visited = (tour: Tour) => tour.zoneIds.filter(id => progress[tour.id]?.visited.includes(id)).length;
  const completed = tours.filter(tour => visited(tour) === tour.zoneIds.length).length;

  return (
    <main className="page dashboard">
      <div className="welcome"><div><p className="kicker dark">MI ESPACIO</p><h1>Mi progreso</h1><p>Consulta las zonas visitadas en este navegador y retoma un recorrido.</p></div><button className="outline" onClick={() => navigate("catalogo")}>Ver catálogo</button></div>
      <section className="dashboard-grid" aria-label="Estadísticas y avatar">
        <div className="panel-card"><div className="card-title"><h3>Estadísticas del visitante</h3></div><div className="stats-row visitor-stats"><span><b>{tours.reduce((total, tour) => total + visited(tour), 0)}</b>Paradas visitadas</span><span><b>{completed}</b>Recorridos terminados</span></div></div>
        <div className="panel-card avatar-card"><div className="big-avatar" aria-hidden="true">{avatar.slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">MI AVATAR</p><h3>{avatar}</h3><p>Visitante</p><button className="text-button" onClick={() => setEditing(true)}>Personalizar avatar <Icon name="arrow" size={17} /></button></div></div>
      </section>
      <div className="section-head compact"><h2>Mis recorridos</h2></div>
      <div className="tour-grid">
        {tours.map(tour => <article className="panel-card progress-card" key={tour.id}><h3>{tour.title}</h3><p>{visited(tour)} de {tour.zoneIds.length} paradas visitadas</p><progress aria-label={"Progreso de " + tour.title} value={visited(tour)} max={tour.zoneIds.length} /><button className="text-button" onClick={() => start(tour.id)}>{visited(tour) ? "Reanudar" : "Iniciar"} <Icon name="arrow" size={17} /></button></article>)}
      </div>
      {editing && <Dialog label="Personalizar avatar" close={() => setEditing(false)} className="auth-modal">
        <h2>Personalizar avatar</h2>
        <form onSubmit={event => {
          event.preventDefault();
          const nickname = String(new FormData(event.currentTarget).get("nickname") ?? "").trim();
          if (!nickname) return;
          setAvatar(nickname);
          setEditing(false);
        }}><label>Nombre del avatar<input name="nickname" defaultValue={avatar} required maxLength={40} pattern=".*\S.*" /></label><button className="primary full">Guardar avatar</button></form>
      </Dialog>}
    </main>
  );
}

function GroupAvatars() {
  const { avatars, participants, roles } = useRegistry();
  const members = avatars.flatMap(avatar => {
    const participant = participants.find(entry => entry.id === avatar.values.owner && entry.active);
    const role = roles.find(entry => entry.id === participant?.values.role && entry.active);
    return avatar.active && role && role.id !== "administrador" ? [{ avatar, role }] : [];
  });

  if (!members.length) return null;
  return (
    <div className="group-avatars">
      <p>Avatares de ejemplo</p>
      <ul aria-label="Avatares de la sesión de ejemplo">
        {members.slice(0, 4).map(({ avatar, role }) => (
          <li key={avatar.id}><span aria-hidden="true">{avatar.values.initials}</span><div><strong>{avatar.name}</strong><small>{role.name}</small></div></li>
        ))}
      </ul>
    </div>
  );
}

function VirtualTour({ role, tour, zones, progress, visit, leave }: { role: Role; tour: Tour; zones: Zone[]; progress: Progress; visit: (id: string) => void; leave: () => void }) {
  const [offline, setOffline] = useState(false);
  const [feedback, setFeedback] = useState<"restricted" | "detail" | null>(null);
  const itinerary = tour.zoneIds.map(id => zones.find(zone => zone.id === id)).filter((zone): zone is Zone => Boolean(zone));
  const current = itinerary.find(zone => zone.id === progress.lastZone) ?? itinerary[0];
  const index = itinerary.indexOf(current);
  const count = itinerary.filter(zone => progress.visited.includes(zone.id)).length;
  const restriction = zones.find(zone => zone.access === "staff");

  return (
    <main className="tour-room">
      <div className="tour-top">
        <div><p className="eyebrow">{tour.type === "Grupal" ? "SESIÓN GRUPAL SIMULADA" : "RECORRIDO INDIVIDUAL"}</p><h2>{tour.title}</h2></div>
        <div className="tour-top-actions"><button className="connection" onClick={() => setOffline(!offline)}>{offline ? "Restablecer conexión" : "Simular desconexión"}</button><button className="outline light-outline" onClick={leave}>Salir del recorrido</button></div>
      </div>
      {offline && <div className="offline-banner" role="status"><Icon name="wifi" /><div><b>Desconexión simulada</b><span>El avance se conserva en este navegador. Restablece la conexión para continuar.</span></div></div>}
      <div className="tour-stage">
        <div className="visual-stage">
          <ZoneImage zoneId={current.id} priority />
          <div className="zone-label">
            <small>PARADA {index + 1} DE {itinerary.length}</small>
            <h1>{current.name}</h1><p>{current.description}</p>
            <button className="outline light-outline zone-detail" disabled={offline} onClick={() => setFeedback("detail")}>Explorar detalle de la zona</button>
          </div>
        </div>
        <aside className="tour-sidebar" aria-label="Itinerario">
          <div className="route-progress"><span>PROGRESO DEL RECORRIDO</span><b>{Math.round(count * 100 / itinerary.length)} %</b><progress aria-label="Paradas visitadas" value={count} max={itinerary.length} /><small>{count} de {itinerary.length} paradas visitadas</small></div>
          <div className="zone-list">{itinerary.map((zone, i) => (
            <button key={zone.id} className={zone.id === current.id ? "current" : progress.visited.includes(zone.id) ? "done" : ""} aria-current={zone.id === current.id ? "step" : undefined} disabled={offline} onClick={() => visit(zone.id)}>
              <span>{i + 1}</span><div><small>{zone.id === current.id ? "PARADA ACTUAL" : progress.visited.includes(zone.id) ? "VISITADA" : "POR VISITAR"}</small><b>{zone.name}</b></div>
              {zone.id === current.id && <Icon name="chevron" size={16} />}
            </button>
          ))}</div>
          {role === "guia" && tour.type === "Grupal" && <button className="primary full next-stop" disabled={offline || index >= itinerary.length - 1} onClick={() => visit(itinerary[index + 1].id)}>Avanzar con el grupo <Icon name="arrow" /></button>}
          {restriction && (role === "administrador"
            ? <div className="guide-note"><div><b>{restriction.name}</b><p>{restriction.description}</p></div></div>
            : <button className="restricted-link" onClick={() => setFeedback("restricted")}>Consultar el área de conservación</button>)}
          {tour.type === "Grupal" && <GroupAvatars />}
        </aside>
      </div>
      {feedback && <Dialog label={feedback === "restricted" ? "Acceso restringido" : current.name} close={() => setFeedback(null)} className="mini-modal">
        <h2>{feedback === "restricted" ? "Acceso restringido" : current.name}</h2>
        <p>{feedback === "restricted" ? "El rol actual solo permite consultar las zonas públicas del itinerario. El área de conservación está reservada a administración en esta demostración." : current.detail}</p>
        <button className="primary full" onClick={() => setFeedback(null)}>Entendido</button>
      </Dialog>}
    </main>
  );
}

function GuidePanel({ tours, start }: { tours: Tour[]; start: (id: string) => void }) {
  const reviews = [112, 12, 3, 1, 0];
  const total = reviews.reduce((sum, count) => sum + count, 0);
  const average = (reviews.reduce((sum, count, i) => sum + count * (5 - i), 0) / total).toFixed(1);

  return (
    <main className="page dashboard">
      <div className="welcome"><div><p className="kicker dark">PANEL DEL GUÍA</p><h1>Bienvenida, Mariana.</h1><p>Selecciona una sesión grupal de demostración.</p></div></div>
      <section className="guide-layout">
        <div><h2>Sesiones grupales</h2>
          {tours.length ? tours.map(tour => <article className="session-card active-session" key={tour.id}><div className="session-time"><span>GRUPAL</span></div><div><h3>{tour.title}</h3><p>{tour.language} · {tour.time}</p></div><button className="primary" onClick={() => start(tour.id)}>Ir a la sala <Icon name="arrow" /></button></article>) : <p>No hay sesiones grupales activas.</p>}
        </div>
        <aside className="reputation panel-card" aria-label="Distribución de valoraciones de ejemplo">
          <h2>Reputación del guía</h2>
          <div className="score"><strong>{average}</strong><div><span aria-hidden="true">★★★★★</span><small>{total} valoraciones de ejemplo</small></div></div>
          {reviews.map((count, i) => <div className="rating-bar" key={i} aria-label={(5 - i) + " estrellas, " + count + " valoraciones"}><span>{5 - i}</span><div aria-hidden="true"><i style={{ width: count * 100 / total + "%" }} /></div><small>{count}</small></div>)}
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<View>("inicio");
  const [role, setRole] = useState<Role>("visitante");
  const [modality, setModality] = useState<Modality>("Todos");
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [selectedId, select] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useLocalState<ProgressByTour>("chichen-progress", {});
  const { tours, zones } = useAdminCatalog();
  const publicZoneIds = new Set(zones.filter(zone => zone.access === "public").map(zone => zone.id));
  const visibleTours = tours.map(tour => ({
    ...tour,
    zoneIds: role === "administrador" ? tour.zoneIds : tour.zoneIds.filter(id => publicZoneIds.has(id)),
  })).filter(tour => tour.zoneIds.length > 0);

  const active = visibleTours.find(tour => tour.id === activeId);
  const selected = visibleTours.find(tour => tour.id === selectedId);
  const progressKey = (tourId: string) => role === "visitante" ? tourId : role + "/" + tourId;

  function navigate(next: View) {
    select(null);
    if (next === "catalogo") setModality("Todos");
    setView(next);
    window.scrollTo(0, 0);
  }

  function openCatalog(filter: Modality) {
    navigate("catalogo");
    setModality(filter);
  }

  function changeRole(next: Role) {
    setRole(next);
    navigate(next === "guia" ? "guia" : next === "administrador" ? "admin" : "inicio");
  }

  function visit(tourId: string, zoneId: string) {
    const key = progressKey(tourId);
    setProgress(previous => ({
      ...previous,
      [key]: { lastZone: zoneId, visited: [...new Set([...(previous[key]?.visited ?? []), zoneId])] },
    }));
  }

  function start(tourId: string) {
    const tour = visibleTours.find(item => item.id === tourId);
    if (!tour) return;
    const saved = progress[progressKey(tourId)]?.lastZone;
    visit(tourId, saved && tour.zoneIds.includes(saved) ? saved : tour.zoneIds[0]);
    setActiveId(tourId);
    navigate("recorrido");
  }

  return (
    <>
      <Header view={view} navigate={navigate} role={role} changeRole={changeRole} />
      {view === "inicio" && <Home tours={visibleTours} role={role} setView={navigate} openCatalog={openCatalog} openTour={id => { navigate("catalogo"); select(id); }} />}
      {view === "catalogo" && <Catalog tours={visibleTours} zones={zones} selected={selected} select={select} start={start} filter={modality} setFilter={setModality} />}
      {view === "panel" && <VisitorPanel tours={visibleTours} progress={progress} start={start} navigate={navigate} />}
      {view === "recorrido" && (active
        ? <VirtualTour key={active.id} tour={active} role={role} zones={zones} progress={progress[progressKey(active.id)] ?? { lastZone: active.zoneIds[0], visited: [] }} visit={id => visit(active.id, id)} leave={() => navigate(role === "visitante" ? "panel" : role === "guia" ? "guia" : "catalogo")} />
        : <main className="page"><h1>Recorrido no disponible</h1><button className="outline" onClick={() => navigate("catalogo")}>Volver al catálogo</button></main>)}
      {view === "guia" && role === "guia" && <GuidePanel tours={visibleTours.filter(tour => tour.type === "Grupal")} start={start} />}
      {view === "admin" && role === "administrador" && <AdminPanel />}
      <footer>
        <div className="brand inverted"><span className="brand-mark"><Icon name="logo" /></span><span>Chichén Itzá<small>RECORRIDOS VIRTUALES</small></span></div>
        <p>Prototipo académico · Sistemas Distribuidos</p>
        <button className="photo-credits-button" onClick={() => setCreditsOpen(true)}>Créditos de las fotografías</button>
      </footer>
      {creditsOpen && (
        <Dialog label="Créditos de las fotografías" close={() => setCreditsOpen(false)} className="credits-dialog">
          <h2>Créditos de las fotografías</h2>
          <p>Imágenes de Wikimedia Commons, adaptadas a WebP para la web.</p>
          <ul>{Object.values(zonePhotos).map(photo => photo && (
            <li key={photo.src}>
              <a href={photo.source}>{photo.title}</a><span>{photo.author} · {photo.licenseUrl ? <a href={photo.licenseUrl}>{photo.license}</a> : photo.license}</span>
            </li>
          ))}</ul>
        </Dialog>
      )}
    </>
  );
}
