export interface Manifest {
  id: string;
  name: string;
  version: string;
  description: string;
  url?: string;
  originalUrl?: string;
  types: string[];
  resources: Resource[];
  catalogs: {
    type: string;
    id: string;
    name: string;
  }[];
  behaviorHints?: {
    configurable?: boolean;
    [key: string]: any;
  };
  // Additional properties for Torrentio handling
  isTorrentio?: boolean;
  // Additional properties for addon configuration
  isDebridEnabled?: boolean;
  queryParams?: string;
  addonId?: string;
  requiresConfiguration?: boolean;
}

export interface Resource {
  name: string;
  types: string[];
  idPrefixes?: string[];
}

export interface StreamResponse {
  streams: Stream[];
}

export interface Stream {
  name?: string;
  title?: string;
  url: string;
  addonName?: string;
  addonId?: string;
  behaviorHints?: {
    bingeGroup?: string;
    notWebReady?: boolean;
    proxyHeaders?: Record<string, string>;
    isRealDebridCached?: boolean;
    cached?: boolean;
  };
  description?: string;
  subtitles?: Subtitle[];
  // Additional properties that might come from Torrentio
  size?: string;
  fileIdx?: number;
  infoHash?: string;
  sources?: string[];
  availability?: number;
  seeders?: number;
}

export interface Subtitle {
  url: string;
  lang: string;
  id?: string;
}

export interface Meta {
  id: string;
  type: string;
  name: string;
  poster: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  year?: number;
  genres?: string[];
  cast?: string[];
  director?: string;
  runtime?: string;
} 