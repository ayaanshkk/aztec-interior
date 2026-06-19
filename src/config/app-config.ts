import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Atelier Luxe Interiors",
  version: packageJson.version,
  copyright: `© ${currentYear}, Atelier Luxe Interiors.`,
  meta: {
    title: "Atelier Luxe Interiors",
    description: "Atelier Luxe Interiors",
  },
  // ✅ Add your base path here
  basePath: "/streemlyne",
};
