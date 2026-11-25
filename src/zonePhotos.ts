type ZonePhoto = {
  src: string;
  title: string;
  alt: string;
  author: string;
  source: string;
  license: string;
  licenseUrl?: string;
};

export const zonePhotos: Partial<Record<string, ZonePhoto>> = {
  castillo: {
    src: "/zonas/castillo.webp",
    title: "El Castillo",
    alt: "Pirámide de Kukulcán en la explanada de Chichén Itzá",
    author: "C13m3n7",
    source: "https://commons.wikimedia.org/wiki/File:Kukulcan,_Chichen_Itza.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  pelota: {
    src: "/zonas/pelota.webp",
    title: "Gran Juego de Pelota",
    alt: "Muros de piedra del Gran Juego de Pelota de Chichén Itzá",
    author: "edenpictures",
    source: "https://commons.wikimedia.org/wiki/File:Great_Ball_Court_-_Chichen_Itza_2024.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  guerreros: {
    src: "/zonas/guerreros.webp",
    title: "Templo de los Guerreros",
    alt: "Templo de los Guerreros y sus columnas de piedra en Chichén Itzá",
    author: "Wolfgang Sauber",
    source: "https://commons.wikimedia.org/wiki/File:Chichen_Itza_-_Templo_de_los_Guerreros_1.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  caracol: {
    src: "/zonas/caracol.webp",
    title: "El Caracol",
    alt: "Estructura circular de El Caracol sobre su plataforma escalonada",
    author: "André Möller",
    source: "https://commons.wikimedia.org/wiki/File:Caracol_in_chich%C3%A9n_itz%C3%A1.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  cenote: {
    src: "/zonas/cenote.webp",
    title: "Cenote Sagrado",
    alt: "Agua del Cenote Sagrado entre paredes de roca y vegetación",
    author: "Altairisfar",
    source: "https://commons.wikimedia.org/wiki/File:Sacred_Cenote_Chichen_Itza.JPG",
    license: "Dominio público",
  },
};
