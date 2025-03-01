export interface CatalogItem {
    id: string;
    type: string;
    name: string;
    genres?: string[];
    extra?: {
        name: string;
        options?: string[];
        isRequired?: boolean;
    }[];
}

export interface StreamingAddon {
    id: string;
    logo?: string;
    version: string;
    name: string;
    description: string;
    catalogs: CatalogItem[];
    resources: string[];
    types: string[];
    idPrefixes: string[];
    behaviorHints: {
        configurable: boolean;
        newEpisodeNotifications?: boolean;
    };
}

export interface StreamingContent {
    id: string;
    imdb_id?: string;
    type: string;
    name: string;
    title?: string;
    poster: string;
    background?: string;
    logo?: string;
    description?: string;
    releaseInfo?: string;
    year?: number;
    runtime?: string;
    genres?: string[];
    cast?: string[];
    director?: string;
    imdbRating?: string;
} 