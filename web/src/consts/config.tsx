export const JIFFY_API_URL =
  import.meta.env.VITE_JIFFY_API_URL ?? "https://jiffy-api.gauchoracing.com";

export const SENTINEL_URL =
  import.meta.env.VITE_SENTINEL_URL ?? "https://sso.gauchoracing.com";
export const SENTINEL_OAUTH_BASE_URL = `${SENTINEL_URL.replace(/\/+$/, "")}/oauth/authorize`;
export const SENTINEL_CLIENT_ID =
  import.meta.env.VITE_SENTINEL_CLIENT_ID ?? "MxgxnQFxKTNH";

export const SOCIAL_LINKS = {
  github: "https://github.com/gaucho-racing/jiffy",
  instagram: "https://instagram.com/gauchoracingucsb",
  twitter: "https://twitter.com/gauchoracing_",
  linkedin:
    "https://www.linkedin.com/company/gaucho-racing-at-uc-santa-barbara",
};
