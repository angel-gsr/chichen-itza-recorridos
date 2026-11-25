export type Role = "visitante" | "guia" | "administrador";

export type Zone = {
  id: string;
  name: string;
  description: string;
  detail: string;
  access: "public" | "staff";
};

export type Tour = {
  id: string;
  title: string;
  type: "Individual" | "Grupal";
  time: string;
  language: "Español" | "Inglés";
  tag: string;
  zoneIds: string[];
};

export const zones: Zone[] = [
  { id: "castillo", name: "El Castillo", description: "El templo de Kukulcán destaca por su pirámide escalonada.", detail: "Observa las escalinatas y la ubicación del templo en lo alto de la pirámide.", access: "public" },
  { id: "pelota", name: "Gran Juego de Pelota", description: "Una cancha monumental delimitada por muros de piedra.", detail: "Identifica los aros y los relieves que decoran el espacio ceremonial.", access: "public" },
  { id: "guerreros", name: "Templo de los Guerreros", description: "Un conjunto monumental conocido por sus columnas y relieves.", detail: "Fíjate en cómo las hileras de columnas ordenan el espacio.", access: "public" },
  { id: "caracol", name: "El Caracol", description: "Un edificio circular conocido como el observatorio de Chichén Itzá.", detail: "Compara su planta circular con la forma escalonada de El Castillo.", access: "public" },
  { id: "cenote", name: "Cenote Sagrado", description: "Un cuerpo de agua natural de gran relevancia ceremonial.", detail: "Reflexiona sobre el papel del agua en el paisaje de la península de Yucatán.", access: "public" },
  { id: "conservacion", name: "Área de conservación", description: "Espacio de demostración reservado al rol administrativo.", detail: "La regla de acceso separa el itinerario público de la gestión del patrimonio.", access: "staff" },
];

export const tours: Tour[] = [
  { id: "corazon", title: "El corazón de Chichén Itzá", type: "Individual", time: "45 min", language: "Español", tag: "Disponible", zoneIds: ["castillo", "pelota", "guerreros", "caracol", "cenote"] },
  { id: "pelota", title: "Secretos del Juego de Pelota", type: "Grupal", time: "60 min", language: "Español", tag: "Sesión de demostración", zoneIds: ["pelota", "guerreros", "castillo"] },
  { id: "astronomia", title: "Astronomía y arquitectura maya", type: "Grupal", time: "75 min", language: "Inglés", tag: "Sesión de demostración", zoneIds: ["caracol", "castillo", "guerreros"] },
];
