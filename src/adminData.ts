import { useMemo, useSyncExternalStore } from "react";
import { tours, zones, type Tour, type Zone } from "./tourData";

export type Entity = "roles" | "participants" | "avatars" | "zones" | "tours";
export type Values = Record<string, string | string[]>;

export interface Entry {
  id: string;
  name: string;
  active: boolean;
  values: Values;
}

export type Registry = Record<Entity, Entry[]>;

type Option = { value: string; label: string };

export interface Field {
  key: string;
  label: string;
  type?: "email" | "textarea" | "select" | "multiple" | "number";
  options?: readonly Option[];
  related?: Entity;
}

const roleEntries: Entry[] = [
  { id: "visitante", name: "Visitante", active: true, values: { permission: "Recorrer zonas de acceso general", description: "Explora el itinerario y consulta su progreso." } },
  { id: "guia", name: "Guía", active: true, values: { permission: "Conducir recorridos grupales", description: "Coordina y orienta a los participantes de un grupo." } },
  { id: "administrador", name: "Administrador", active: true, values: { permission: "Gestionar registros y consultar zonas reservadas", description: "Mantiene la información de la plataforma." } },
];

const initialRegistry: Registry = {
  roles: roleEntries,
  participants: [
    { id: "USR-01042", name: "Lucía Méndez", active: true, values: { email: "lucia@example.com", role: "visitante", language: "Español" } },
    { id: "USR-01043", name: "Jorge Ramírez", active: true, values: { email: "jorge@example.com", role: "visitante", language: "Español" } },
    { id: "USR-01044", name: "Amelia King", active: false, values: { email: "amelia@example.com", role: "visitante", language: "Inglés" } },
    { id: "USR-01045", name: "Mariana Canché", active: true, values: { email: "mariana@example.com", role: "guia", language: "Maya" } },
  ],
  avatars: [
    { id: "AVA-01", name: "Luna del Mayab", active: true, values: { owner: "USR-01042", initials: "LM" } },
    { id: "AVA-02", name: "Mariana", active: true, values: { owner: "USR-01045", initials: "MC" } },
  ],
  zones: zones.map(({ id, name, ...values }) => ({ id, name, active: true, values })),
  tours: tours.map(({ id, title, ...values }) => ({ id, name: title, active: true, values: { ...values, duration: String(parseInt(values.time, 10)) } })),
};

function options(...labels: string[]): Option[] {
  return labels.map(label => ({ value: label, label }));
}

export const entities: Record<Entity, { label: string; singular: string; fields: Field[] }> = {
  participants: {
    label: "Participantes", singular: "participante",
    fields: [
      { key: "email", label: "Correo electrónico", type: "email" },
      { key: "role", label: "Rol", type: "select", related: "roles" },
      { key: "language", label: "Idioma", type: "select", options: options("Español", "Inglés", "Maya") },
    ],
  },
  avatars: {
    label: "Avatares", singular: "avatar",
    fields: [
      { key: "owner", label: "Participante", type: "select", related: "participants" },
      { key: "initials", label: "Iniciales" },
    ],
  },
  roles: {
    label: "Roles y permisos", singular: "rol",
    fields: [
      { key: "permission", label: "Permisos de diseño" },
      { key: "description", label: "Descripción", type: "textarea" },
    ],
  },
  zones: {
    label: "Zonas", singular: "zona",
    fields: [
      { key: "access", label: "Acceso", type: "select", options: [{ value: "public", label: "General" }, { value: "staff", label: "Restringido" }] },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "detail", label: "Detalle cultural", type: "textarea" },
    ],
  },
  tours: {
    label: "Recorridos", singular: "recorrido",
    fields: [
      { key: "type", label: "Modalidad", type: "select", options: options("Individual", "Grupal") },
      { key: "language", label: "Idioma", type: "select", options: options("Español", "Inglés") },
      { key: "duration", label: "Duración en minutos", type: "number" },
      { key: "tag", label: "Disponibilidad" },
      { key: "zoneIds", label: "Zonas del itinerario", type: "multiple", related: "zones" },
    ],
  },
};

export function getOptions(field: Field, registry: Registry, current: Values[Field["key"]] = ""): readonly Option[] {
  if (!field.related) return field.options ?? [];
  return registry[field.related]
    .filter(entry => entry.active || (Array.isArray(current) ? current.includes(entry.id) : entry.id === current))
    .map(entry => ({ value: entry.id, label: entry.active ? entry.name : `${entry.name} (baja)` }));
}

export function displayField(field: Field, entry: Entry, registry: Registry): string {
  const value = entry.values[field.key];
  const choices = getOptions(field, registry, value);
  const labelFor = (id: string) => choices.find(option => option.value === id)?.label ?? id;
  return Array.isArray(value) ? value.map(labelFor).join(", ") : labelFor(value ?? "");
}

const storageKey = "chichen-itza.admin.v1";
const changeEvent = "chichen-itza.admin.updated";
let rawSnapshot: string | null | undefined;
let snapshot = initialRegistry;

export function readRegistry(): Registry {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== rawSnapshot) {
      const parsed = raw ? JSON.parse(raw) as Partial<Registry> : null;
      snapshot = parsed && Object.keys(initialRegistry).every(key => Array.isArray(parsed[key as Entity]))
        ? parsed as Registry
        : initialRegistry;
      rawSnapshot = raw;
    }
  } catch {
    snapshot = initialRegistry;
    rawSnapshot = undefined;
  }
  return snapshot;
}

function subscribe(update: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === storageKey) update();
  };
  window.addEventListener(changeEvent, update);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(changeEvent, update);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useRegistry() {
  return useSyncExternalStore(subscribe, readRegistry);
}

export function updateRegistry(entity: Entity, update: (records: Entry[], registry: Registry) => Entry[]) {
  const current = readRegistry();
  const next = { ...current, [entity]: update(current[entity], current) };
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    throw new Error("El navegador no pudo guardar el registro. Revisa si el almacenamiento local está disponible.");
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function useAdminCatalog(): { tours: Tour[]; zones: Zone[] } {
  const registry = useRegistry();
  return useMemo(() => {
    const activeZones = registry.zones.filter(entry => entry.active).map(({ id, name, values }) => ({
      id,
      name,
      access: values.access as Zone["access"],
      description: String(values.description),
      detail: String(values.detail),
    }));
    const activeZoneIds = new Set(activeZones.map(zone => zone.id));
    const activeTours = registry.tours.filter(entry => entry.active).map(({ id, name, values }) => ({
      id,
      title: name,
      type: values.type as Tour["type"],
      language: values.language as Tour["language"],
      time: `${values.duration} min`,
      tag: String(values.tag),
      zoneIds: (values.zoneIds as string[]).filter(zoneId => activeZoneIds.has(zoneId)),
    }));
    return { tours: activeTours.filter(tour => tour.zoneIds.length > 0), zones: activeZones };
  }, [registry.zones, registry.tours]);
}
