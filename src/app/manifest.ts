import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SELYE — Gestão Física e Comunidade Esportiva",
    short_name: "SELYE",
    description: "Plataforma multimodal de gestão de treinamento, constância e comunidade esportiva.",
    start_url: "/",
    display: "standalone",
    background_color: "#151C1A",
    theme_color: "#202A27",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}