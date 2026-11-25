import { useState, type FormEvent, type ReactNode } from "react";
import {
  displayField, entities, getOptions, normalizeSearch, updateRegistry, useRegistry,
  type Entity, type Entry, type Field, type Registry, type Values,
} from "./adminData";
import "./admin.css";
import { useModalDialog } from "./useModalDialog";

type Tab = Entity | "summary" | "guides";
type DialogMode = "view" | "edit" | "create" | "status";
type DialogState = { mode: DialogMode; entryId?: string };

const tabs: { key: Tab; label: string }[] = [
  { key: "summary", label: "Resumen" },
  { key: "participants", label: "Participantes" },
  { key: "guides", label: "Guías" },
  { key: "avatars", label: "Avatares" },
  { key: "roles", label: "Roles y permisos" },
  { key: "zones", label: "Zonas" },
  { key: "tours", label: "Recorridos" },
];

const entityDescriptions: Record<Tab, string> = {
  summary: "Consulta los registros activos y el escenario de despliegue distribuido.",
  participants: "Administra los perfiles y sus roles e idiomas.",
  guides: "Gestiona perfiles de participantes con el rol de guía.",
  avatars: "Personaliza la representación de cada participante.",
  roles: "Define los roles de los perfiles y documenta los permisos previstos.",
  zones: "Edita las fichas culturales y el acceso a las zonas.",
  tours: "Configura las modalidades, los idiomas y los itinerarios del catálogo.",
};

function Modal({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  const element = useModalDialog();

  return (
    <dialog
      ref={element}
      className="form-drawer registry-dialog"
      aria-labelledby="registry-dialog-title"
      onCancel={event => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <button className="close registry-close" type="button" onClick={onDismiss} aria-label="Cerrar formulario">×</button>
      {children}
    </dialog>
  );
}

function FieldControl({ field, entry, registry, lockRole, selection, setSelection }: {
  field: Field;
  entry?: Entry;
  registry: Registry;
  lockRole: boolean;
  selection: string[];
  setSelection: (ids: string[]) => void;
}) {
  const value = entry?.values[field.key] ?? "";
  const options = getOptions(field, registry, value);

  if (field.key === "role" && lockRole) return null;

  if (field.type === "multiple") {
    return (
      <fieldset className="zone-choices">
        <legend>{field.label} *</legend>
        <p>Selecciona las zonas en el orden del recorrido.</p>
        {options.length === 0 && <p>Agrega o reactiva una zona para continuar.</p>}
        {options.map(option => {
          const index = selection.indexOf(option.value);
          return (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={index >= 0}
                onChange={event => setSelection(event.target.checked
                  ? [...selection, option.value]
                  : selection.filter(id => id !== option.value))}
              />
              <span>{option.label}</span>
              {index >= 0 && <strong aria-label={`Posición ${index + 1}`}>{index + 1}</strong>}
            </label>
          );
        })}
      </fieldset>
    );
  }

  let control: ReactNode;
  if (field.type === "select") {
    control = (
      <select name={field.key} defaultValue={String(value)} required>
        <option value="" disabled>{options.length ? "Selecciona una opción" : "No hay opciones activas"}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  } else if (field.type === "textarea") {
    control = <textarea name={field.key} defaultValue={String(value)} rows={3} maxLength={500} required />;
  } else {
    const numeric = field.type === "number";
    control = (
      <input
        name={field.key}
        type={field.type ?? "text"}
        defaultValue={String(value)}
        min={numeric ? 1 : undefined}
        max={numeric ? 480 : undefined}
        maxLength={field.key === "initials" ? 3 : 150}
        required
      />
    );
  }

  return <label>{field.label} *{control}</label>;
}

function RegistryForm({ entity, entry, registry, guides, onSave, onDismiss }: {
  entity: Entity;
  entry?: Entry;
  registry: Registry;
  guides: boolean;
  onSave: (entry: Entry) => void;
  onDismiss: () => void;
}) {
  const config = entities[entity];
  const initialSelection = entry?.values.zoneIds;
  const [selection, setSelection] = useState(Array.isArray(initialSelection) ? initialSelection : []);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const values: Values = {};

    for (const field of config.fields) {
      if (field.key === "role" && guides) {
        values.role = "guia";
      } else if (field.type === "multiple") {
        values[field.key] = selection;
      } else {
        values[field.key] = String(formData.get(field.key) ?? "").trim();
      }
    }
    if (typeof values.initials === "string") values.initials = values.initials.toLocaleUpperCase("es");

    try {
      const id = entry?.id ?? Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, "0")).join("");
      onSave({ id, name, values, active: entry?.active ?? true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el registro.");
    }
  }

  return (
    <>
      <p className="kicker dark">{entry ? "MODIFICACIÓN" : "ALTA"}</p>
      <h2 id="registry-dialog-title">{entry ? "Editar" : "Agregar"} {guides ? "guía" : config.singular}</h2>
      <p>Los campos marcados con * son obligatorios.</p>
      <form onSubmit={submit}>
        <label>Nombre *<input name="name" defaultValue={entry?.name} maxLength={120} required autoFocus /></label>
        {guides && <p className="registry-form-note">Rol asignado: {registry.roles.find(role => role.id === "guia")?.name ?? "Guía"}</p>}
        {config.fields.map(field => <FieldControl key={field.key} {...{ field, entry, registry, selection, setSelection }} lockRole={guides} />)}
        {error && <p className="registry-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="outline" onClick={onDismiss}>Cancelar</button>
          <button className="primary" type="submit">Guardar registro</button>
        </div>
      </form>
    </>
  );
}

function validateEntry(entity: Entity, candidate: Entry, all: Entry[], registry: Registry) {
  if (!candidate.name) throw new Error("Escribe un nombre válido.");

  const before = all.find(entry => entry.id === candidate.id);
  for (const field of entities[entity].fields) {
    const value = candidate.values[field.key];
    const choices = getOptions(field, registry, before?.values[field.key]).map(option => option.value);
    if (Array.isArray(value)) {
      if (!value.length || value.some(id => !choices.includes(id))) {
        throw new Error(`Selecciona al menos una opción válida en «${field.label}».`);
      }
    } else if (!value || (field.type === "select" && !choices.includes(value))) {
      throw new Error(`Completa el campo «${field.label}» con una opción válida.`);
    }
  }

  if (entity === "participants") {
    const email = String(candidate.values.email).toLocaleLowerCase("es");
    if (all.some(entry => entry.id !== candidate.id && String(entry.values.email).toLocaleLowerCase("es") === email)) {
      throw new Error("El correo ya está registrado en otro perfil.");
    }
  }

  if (entity === "avatars" && candidate.active) {
    if (all.some(entry => entry.id !== candidate.id && entry.active && entry.values.owner === candidate.values.owner)) {
      throw new Error("El participante ya tiene un avatar activo.");
    }
  }
}

function EntryDetails({ entry, entity, registry }: { entry: Entry; entity: Entity; registry: Registry }) {
  return (
    <>
      <p className="kicker dark">CONSULTA</p>
      <h2 id="registry-dialog-title">{entry.name}</h2>
      <p>{entry.id}</p>
      <dl className="registry-details">
        <div><dt>Estado</dt><dd>{entry.active ? "Activo" : "Baja"}</dd></div>
        {entities[entity].fields.map(field => (
          <div key={field.key}>
            <dt>{field.label}</dt><dd>{displayField(field, entry, registry)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function StatusDialog({ entry, onConfirm, onDismiss }: { entry: Entry; onConfirm: () => void; onDismiss: () => void }) {
  const [error, setError] = useState("");
  return (
    <>
      <p className="kicker dark">{entry.active ? "BAJA" : "REACTIVACIÓN"}</p>
      <h2 id="registry-dialog-title">{entry.active ? "Dar de baja" : "Reactivar"} registro</h2>
      <p>{entry.active
        ? `«${entry.name}» quedará inactivo. Su ficha e identificador seguirán disponibles para consulta.`
        : `«${entry.name}» volverá a estar activo.`}</p>
      {error && <p className="registry-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="outline" onClick={onDismiss} autoFocus>Cancelar</button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            try {
              onConfirm();
            } catch (error) {
              setError(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
            }
          }}
        >{entry.active ? "Confirmar baja" : "Confirmar reactivación"}</button>
      </div>
    </>
  );
}

function Summary({ registry }: { registry: Registry }) {
  const nodes = [
    ["Mérida, MX", "Operativo", "24 ms"],
    ["Ciudad de México, MX", "Operativo", "38 ms"],
    ["Virginia, EE. UU.", "Sincronizando", "82 ms"],
  ];
  const countedEntities = ["participants", "avatars", "zones", "tours"] as const;

  return (
    <>
      <div className="stat-cards">
        {countedEntities.map(entity => <article key={entity}>
          <span>{entities[entity].label}</span>
          <strong>{registry[entity].filter(entry => entry.active).length}</strong>
          <small>Activos en el registro local</small>
        </article>)}
      </div>
      <div className="admin-charts">
        <section className="panel-card">
          <p className="eyebrow">ESTADO DE LA RED · SIMULACIÓN</p>
          <h3>Nodos regionales</h3>
          {nodes.map(([city, state, latency]) => <div className="server-row" key={city}>
            <span className={state === "Operativo" ? "dot" : "dot amber"} aria-hidden="true" />
            <div><b>{city}</b><small>{state}</small></div><strong>{latency}</strong>
          </div>)}
        </section>
      </div>
    </>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("participants");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState("");
  const registry = useRegistry();

  const entity = tab === "guides" || tab === "summary" ? "participants" : tab;
  const config = entities[entity];
  const title = tabs.find(item => item.key === tab)?.label;
  const records = registry[entity].filter(entry => tab !== "guides" || entry.values.role === "guia");
  const fields = config.fields.slice(0, 2);
  const shown = records.filter(entry => {
    const searchable = [entry.name, entry.id, ...config.fields.map(field => displayField(field, entry, registry))];
    return (status === "all" || entry.active === (status === "active"))
      && normalizeSearch(searchable.join(" ")).includes(normalizeSearch(query));
  });
  const selected = records.find(entry => entry.id === dialog?.entryId);

  function changeTab(next: Tab) {
    setTab(next);
    setNotice("");
    setQuery("");
    setStatus("all");
  }

  function showDialog(mode: DialogMode, entryId?: string) {
    setNotice("");
    setDialog({ mode, entryId });
  }

  function save(candidate: Entry) {
    updateRegistry(entity, (all, current) => {
      if (dialog?.mode !== "edit") {
        validateEntry(entity, candidate, all, current);
        return [...all, candidate];
      }

      const previous = all.find(entry => entry.id === candidate.id);
      if (!previous) throw new Error("El registro cambió en otra pestaña. Vuelve a consultar la lista.");
      const next = { ...candidate, active: previous.active };
      validateEntry(entity, next, all, current);
      return all.map(entry => entry.id === candidate.id ? next : entry);
    });
    setNotice(dialog?.mode === "edit" ? "Modificación guardada." : "Alta guardada.");
    setDialog(null);
  }

  function toggleStatus(entryId: string) {
    let active = false;
    updateRegistry(entity, (all, current) => {
      const previous = all.find(entry => entry.id === entryId);
      if (!previous || previous.active !== selected?.active) {
        throw new Error("El registro cambió en otra pestaña. Vuelve a consultar la lista.");
      }
      active = !previous.active;
      const next = { ...previous, active };
      if (active) validateEntry(entity, next, all, current);
      return all.map(entry => entry.id === entryId ? next : entry);
    });
    setNotice(active ? "Registro reactivado." : "Baja registrada.");
    setDialog(null);
  }

  return (
    <main className="admin-shell registry-shell">
      <aside className="admin-nav registry-nav" aria-label="Secciones de administración">
        <div className="admin-title"><span>Administración<small>Chichén Itzá Virtual</small></span></div>
        <p>GESTIÓN</p>
        {tabs.map(item => <button
          key={item.key}
          className={item.key === tab ? "active" : ""}
          aria-current={item.key === tab ? "true" : undefined}
          onClick={() => changeTab(item.key)}
        >{item.label}</button>)}
      </aside>
      <section className="admin-content">
        <div className="admin-head">
          <div>
            <p className="kicker dark">GESTIÓN DEL SISTEMA</p>
            <h1>{title}</h1>
            <p>{entityDescriptions[tab]}</p>
          </div>
          {tab !== "summary" && <button className="primary" onClick={() => showDialog("create")}>+ Nuevo registro</button>}
        </div>
        <p className="registry-note">Modo de demostración. Los cambios se guardan en este navegador.</p>
        {tab === "summary" ? <Summary registry={registry} /> : (
          <>
            <div className="table-tools registry-tools">
              <label className="search"><span className="sr-only">Buscar en {title}</span>
                <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar en ${title?.toLowerCase()}`} />
              </label>
              <select aria-label="Estado de registro" value={status} onChange={event => setStatus(event.target.value)}>
                <option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Bajas</option>
              </select>
            </div>
            <div className="registry-result">
              <p className="registry-count" role="status">{shown.length} de {records.length} registros</p>
              {notice && <p role="status" className="registry-notice">{notice}</p>}
            </div>
            <div className="data-table registry-table-wrap">
              <table className="registry-table">
                <caption className="sr-only">Registros de {title}</caption>
                <thead><tr>
                  <th scope="col">Nombre</th>{fields.map(field => <th key={field.key} scope="col">{field.label}</th>)}
                  <th scope="col">Estado</th><th scope="col">Acciones</th>
                </tr></thead>
                <tbody>
                  {shown.map(entry => <tr key={entry.id}>
                    <th scope="row">{entry.name}<small>{entry.id}</small></th>
                    {fields.map(field => <td key={field.key}>{displayField(field, entry, registry)}</td>)}
                    <td><span className={entry.active ? "status ok" : "status"}>{entry.active ? "Activo" : "Baja"}</span></td>
                    <td className="registry-actions">
                      <button onClick={() => showDialog("view", entry.id)} aria-label={`Consultar ${entry.name}`}>Consultar</button>
                      <button onClick={() => showDialog("edit", entry.id)} aria-label={`Editar ${entry.name}`}>Editar</button>
                      <button onClick={() => showDialog("status", entry.id)} aria-label={`${entry.active ? "Dar de baja" : "Reactivar"} ${entry.name}`}>
                        {entry.active ? "Dar de baja" : "Reactivar"}
                      </button>
                    </td>
                  </tr>)}
                  {shown.length === 0 && <tr><td colSpan={fields.length + 3}>No hay registros que coincidan.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {dialog && (
        <Modal onDismiss={() => setDialog(null)}>
          {dialog.mode === "view" && selected && <EntryDetails entry={selected} entity={entity} registry={registry} />}
          {dialog.mode === "status" && selected && (
            <StatusDialog entry={selected} onConfirm={() => toggleStatus(selected.id)} onDismiss={() => setDialog(null)} />
          )}
          {(dialog.mode === "create" || dialog.mode === "edit") && (
            <RegistryForm entity={entity} entry={selected} registry={registry} guides={tab === "guides"} onSave={save} onDismiss={() => setDialog(null)} />
          )}
        </Modal>
      )}
    </main>
  );
}
