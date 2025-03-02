import axios from 'axios';
import { Manifest, StreamResponse, Meta, Stream } from '../types/stremio';

interface CatalogOptions {
  skip?: string;
  genre?: string;
  search?: string;
  limit?: number;
}

interface MetaDetails extends Meta {
  videos?: {
    id: string;
    title: string;
    released: string;
    season?: number;
    episode?: number;
  }[];
}

interface AddonCapabilities {
  name: string;
  id: string;
  version: string;
  catalogs: {
    type: string;
    id: string;
    name: string;
  }[];
  resources: {
    name: string;
    types: string[];
    idPrefixes?: string[];
  }[];
  types: string[];
}

class StremioService {
  private static instance: StremioService;
  private installedAddons: Map<string, Manifest> = new Map();
  private readonly STORAGE_KEY = 'stremio-addons';
  private readonly DEFAULT_ADDONS = [
    'https://v3-cinemeta.strem.io/manifest.json',
    'https://opensubtitles-v3.strem.io/manifest.json',
    'https://torrentio.strem.fun/manifest.json'
  ];
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private readonly DEFAULT_PAGE_SIZE = 100;

  private constructor() {
    this.loadInstalledAddons();
  }

  static getInstance(): StremioService {
    if (!StremioService.instance) {
      StremioService.instance = new StremioService();
    }
    return StremioService.instance;
  }

  private async retryRequest<T>(request: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(request, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  private async loadInstalledAddons(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const addons = JSON.parse(stored);
        addons.forEach((addon: Manifest) => {
          if (addon.url || addon.originalUrl) {
            this.installedAddons.set(addon.id, addon);
          }
        });
      }

      // Install default add-ons if they're not already installed
      await this.installDefaultAddons();
    } catch (error) {
      console.error('Error loading installed addons:', error);
    }
  }

  private async installDefaultAddons(): Promise<void> {
    try {
      for (const url of this.DEFAULT_ADDONS) {
        try {
          const manifest = await this.retryRequest(() => this.getManifest(url));
          if (!this.installedAddons.has(manifest.id)) {
            this.installedAddons.set(manifest.id, manifest);
            console.log(`Installed default addon: ${manifest.name}`);
          }
        } catch (error) {
          console.error(`Failed to install default addon from ${url}:`, error);
        }
      }
      this.saveInstalledAddons();
    } catch (error) {
      console.error('Error installing default addons:', error);
    }
  }

  private saveInstalledAddons(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(Array.from(this.installedAddons.values()))
    );
  }

  async getManifest(url: string): Promise<Manifest> {
    try {
      // First fetch the manifest to get the addon's configuration
      const response = await axios.get<Manifest>(url);
      const manifest = response.data;
      
      // Get base URL without query parameters
      const urlObj = new URL(url);
      const baseUrl = urlObj.origin + urlObj.pathname.replace('/manifest.json', '');
      const queryParams = urlObj.search;

      // Special handling for different addon types based on their manifest
      const addonId = manifest.id;
      const isDebridEnabled = url.includes('rd=') || url.includes('apikey=') || 
        (manifest.catalogs || []).some(cat => cat.id?.includes('realdebrid') || cat.name?.includes('RealDebrid'));

      // Log addon details for debugging
      console.log('Processing addon manifest:', {
        originalUrl: url,
        baseUrl,
        id: manifest.id,
        name: manifest.name,
        hasQueryParams: queryParams.length > 0,
        isDebridEnabled,
        resources: manifest.resources,
        catalogs: manifest.catalogs
      });

      // Store both URLs and addon configuration
      const finalManifest = { 
        ...manifest, 
        url: baseUrl,
        originalUrl: url, // Keep the full original URL with all parameters
        requiresConfiguration: manifest.behaviorHints?.configurable,
        isDebridEnabled,
        queryParams: queryParams || '',
        addonId
      };

      console.log('Manifest processed:', {
        id: finalManifest.id,
        name: finalManifest.name,
        url: finalManifest.url,
        originalUrl: finalManifest.originalUrl,
        requiresConfiguration: finalManifest.requiresConfiguration,
        isDebridEnabled: finalManifest.isDebridEnabled,
        resources: finalManifest.resources
      });

      return finalManifest;
    } catch (error) {
      console.error('Error fetching manifest:', error);
      throw error;
    }
  }

  async installAddon(url: string): Promise<void> {
    console.log('Installing addon from URL:', url);
    const manifest = await this.getManifest(url);
    console.log('Got manifest:', manifest);
    this.installedAddons.set(manifest.id, manifest);
    this.saveInstalledAddons();
  }

  removeAddon(id: string): void {
    this.installedAddons.delete(id);
    this.saveInstalledAddons();
  }

  getInstalledAddons(): Manifest[] {
    return Array.from(this.installedAddons.values());
  }

  private formatId(id: string): string {
    // Ensure IMDB IDs start with 'tt'
    if (/^\d+$/.test(id)) {
      return `tt${id}`;
    }
    if (!id.startsWith('tt')) {
      return `tt${id}`;
    }
    return id;
  }

  async getAllCatalogs(): Promise<{ [addonId: string]: Meta[] }> {
    const results: { [addonId: string]: Meta[] } = {};
    const addons = Array.from(this.installedAddons.values());

    for (const addon of addons) {
      if (!addon.catalogs || addon.catalogs.length === 0) continue;

      results[addon.id] = [];
      
      for (const catalog of addon.catalogs) {
        try {
          console.log(`Fetching catalog ${catalog.type}/${catalog.id} from ${addon.name}`);
          const items = await this.getCatalogWithPagination(addon.id, catalog.type, catalog.id);
          results[addon.id].push(...items);
        } catch (error) {
          console.error(`Error fetching catalog from ${addon.name}:`, error);
        }
      }
    }

    return results;
  }

  async getCatalogWithPagination(addonId: string, type: string, id: string, options: CatalogOptions = {}): Promise<Meta[]> {
    const allItems: Meta[] = [];
    let skip = 0;
    const limit = options.limit || this.DEFAULT_PAGE_SIZE;
    let hasMore = true;

    while (hasMore) {
      try {
        const items = await this.getCatalog(addonId, type, id, { ...options, skip: skip.toString() });
        if (!items || items.length === 0) {
          hasMore = false;
          break;
        }

        allItems.push(...items);
        skip += items.length;

        if (options.limit && allItems.length >= options.limit) {
          allItems.splice(options.limit);
          break;
        }

        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching page ${skip} from ${addonId}:`, error);
        hasMore = false;
      }
    }

    return allItems;
  }

  async getMetaDetails(type: string, id: string): Promise<MetaDetails | null> {
    const addons = Array.from(this.installedAddons.values())
      .filter(addon => addon.resources?.some(r => r.name === 'meta' && r.types.includes(type)));

    for (const addon of addons) {
      try {
        if (!addon.url) continue;

        const url = `${addon.url}/meta/${type}/${this.formatId(id)}.json`;
        const response = await this.retryRequest(() => axios.get<{ meta: MetaDetails }>(url));
        
        if (response.data?.meta) {
          return response.data.meta;
        }
      } catch (error) {
        console.error(`Error fetching meta from ${addon.name}:`, error);
      }
    }

    return null;
  }

  async getSubtitles(type: string, id: string, videoId?: string): Promise<any[]> {
    const subtitleAddons = Array.from(this.installedAddons.values())
      .filter(addon => addon.resources?.some(r => r.name === 'subtitles' && r.types.includes(type)));

    const results = [];
    
    for (const addon of subtitleAddons) {
      try {
        if (!addon.url) continue;

        const url = `${addon.url}/subtitles/${type}/${this.formatId(id)}${videoId ? '/' + videoId : ''}.json`;
        const response = await this.retryRequest(() => axios.get(url));
        
        if (response.data?.subtitles) {
          results.push({
            addonName: addon.name,
            subtitles: response.data.subtitles
          });
        }
      } catch (error) {
        console.error(`Error fetching subtitles from ${addon.name}:`, error);
      }
    }

    return results;
  }

  async getStreams(type: string, id: string): Promise<StreamResponse[]> {
    const responses: StreamResponse[] = [];
    const formattedId = this.formatId(id);
    
    const streamingAddons = Array.from(this.installedAddons.values())
      .filter(addon => {
        const streamResource = addon.resources?.find(r => r.name === 'stream');
        return streamResource && 
               streamResource.types.includes(type) && 
               (!streamResource.idPrefixes || streamResource.idPrefixes.some(prefix => formattedId.startsWith(prefix)));
      });

    // Process addons in batches to avoid overwhelming the network
    const batchSize = this.MAX_CONCURRENT_REQUESTS;
    for (let i = 0; i < streamingAddons.length; i += batchSize) {
      const batch = streamingAddons.slice(i, i + batchSize);
      const batchPromises = batch.map(addon => this.fetchStreamsFromAddon(addon, type, formattedId));
      
      const results = await Promise.all(batchPromises);
      results.forEach(result => {
        if (result) responses.push(result);
      });

      // Add a small delay between batches
      if (i + batchSize < streamingAddons.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return responses;
  }

  private async fetchStreamsFromAddon(addon: Manifest, type: string, id: string): Promise<StreamResponse | null> {
    try {
      const baseUrl = addon.url;
      const queryParams = addon.queryParams || '';

      if (!baseUrl) {
        console.error(`No URL found for addon ${addon.name} (${addon.id})`);
        return null;
      }

      const streamUrl = `${baseUrl}/stream/${type}/${id}.json${queryParams}`;
      
      const response = await this.retryRequest(() => axios.get<StreamResponse>(streamUrl));
      
      if (!response.data.streams?.length) {
        return null;
      }

      const processedStreams = this.processStreams(response.data.streams, addon);
      
      return processedStreams.length > 0 ? { streams: processedStreams } : null;

    } catch (error) {
      console.error(`Error fetching streams from ${addon.name}:`, error);
      return null;
    }
  }

  private processStreams(streams: any[], addon: Manifest): Stream[] {
    return streams
      .filter(stream => {
        const isTorrentioStream = stream.infoHash && stream.fileIdx !== undefined;
        return stream && (stream.url || isTorrentioStream) && (stream.title || stream.name);
      })
      .map(stream => {
        const isDirectStreamingUrl = this.isDirectStreamingUrl(stream.url);
        const isRealDebridCached = this.isRealDebridCachedStream(stream, addon);
        const streamUrl = this.getStreamUrl(stream);
        const isMagnetStream = streamUrl?.startsWith('magnet:');

        // Keep original stream data exactly as provided by the addon
        return {
          ...stream,
          url: streamUrl,
          addonName: addon.name,
          addonId: addon.id,
          // For Torrentio, name contains the full formatted title with [RD+]
          // For MediaFusion, title contains addon info and name contains file info
          name: stream.name,
          title: stream.title,
          behaviorHints: {
            ...stream.behaviorHints,
            notWebReady: !isDirectStreamingUrl,
            isMagnetStream,
            isRealDebridCached,
            cached: isRealDebridCached,
            ...(isMagnetStream && {
              infoHash: stream.infoHash || streamUrl?.match(/btih:([a-zA-Z0-9]+)/)?.[1],
              fileIdx: stream.fileIdx,
              magnetUrl: streamUrl,
              type: 'torrent',
              sources: stream.sources || [],
              seeders: stream.seeders,
              size: stream.size,
              title: stream.title,
            })
          }
        };
      });
  }

  private isDirectStreamingUrl(url?: string): boolean {
    return Boolean(
      url && (
        url.startsWith('http') || 
        url.startsWith('https') ||
        url.includes('real-debrid.com') ||
        url.includes('debrid')
      )
    );
  }

  private isRealDebridCachedStream(stream: any, addon: Manifest): boolean {
    return Boolean(
      (addon.id === 'com.stremio.torrentio.addon' && 
       addon.originalUrl?.includes('torrentio.strem.fun')) &&
      (this.isDirectStreamingUrl(stream.url) || stream.behaviorHints?.cached) &&
      stream.infoHash &&
      (stream.title?.toLowerCase().includes('[rd+]') || 
       stream.title?.toLowerCase().includes('[rd]') || 
       stream.title?.toLowerCase().includes('rd+') ||
       (stream.title?.toLowerCase().includes('cached') && 
        stream.title?.toLowerCase().includes('rd')))
    );
  }

  private getStreamUrl(stream: any): string {
    if (stream.url) return stream.url;
    
    if (stream.infoHash) {
      const trackers = [
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://9.rarbg.com:2810/announce',
        'udp://tracker.openbittorrent.com:6969/announce',
        'udp://tracker.torrent.eu.org:451/announce',
        'udp://open.stealth.si:80/announce',
        'udp://tracker.leechers-paradise.org:6969/announce',
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.internetwarriors.net:1337/announce'
      ];
      const trackersString = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
      const encodedTitle = encodeURIComponent(stream.title || stream.name || 'Unknown');
      return `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodedTitle}${trackersString}`;
    }

    return '';
  }

  async getCatalog(addonId: string, type: string, id: string, options: CatalogOptions = {}): Promise<Meta[]> {
    const addon = this.installedAddons.get(addonId);
    if (!addon) throw new Error('Addon not found');
    if (!addon.url) throw new Error('Addon URL not found');

    try {
      const queryParams = new URLSearchParams();
      if (options.skip) queryParams.append('skip', options.skip);
      if (options.genre) queryParams.append('genre', options.genre);
      if (options.search) queryParams.append('search', options.search);

      const url = `${addon.url}catalog/${type}/${id}.json${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await axios.get<{ metas: Meta[] }>(url);
      return response.data.metas;
    } catch (error) {
      console.error('Error fetching catalog:', error);
      throw error;
    }
  }

  getAddonCapabilities(): AddonCapabilities[] {
    return Array.from(this.installedAddons.values()).map(addon => ({
      name: addon.name,
      id: addon.id,
      version: addon.version,
      catalogs: addon.catalogs || [],
      resources: addon.resources || [],
      types: addon.types || []
    }));
  }

  async getCatalogPreview(addonId: string, type: string, id: string, limit: number = 5): Promise<{
    addon: string;
    type: string;
    id: string;
    items: Meta[];
  }> {
    try {
      const items = await this.getCatalog(addonId, type, id, { limit });
      return {
        addon: this.installedAddons.get(addonId)?.name || addonId,
        type,
        id,
        items
      };
    } catch (error) {
      console.error(`Error fetching catalog preview for ${addonId}:`, error);
      return {
        addon: addonId,
        type,
        id,
        items: []
      };
    }
  }

  async getAllAddonMetadataExamples(): Promise<{
    [addonId: string]: {
      name: string;
      catalogs: {
        type: string;
        id: string;
        name: string;
        examples: Meta[];
      }[];
    }
  }> {
    const results: {
      [addonId: string]: {
        name: string;
        catalogs: {
          type: string;
          id: string;
          name: string;
          examples: Meta[];
        }[];
      }
    } = {};

    const addons = Array.from(this.installedAddons.values());

    for (const addon of addons) {
      if (!addon.catalogs || addon.catalogs.length === 0) continue;

      results[addon.id] = {
        name: addon.name,
        catalogs: []
      };

      for (const catalog of addon.catalogs) {
        try {
          console.log(`Fetching example items from ${addon.name} catalog: ${catalog.type}/${catalog.id}`);
          const items = await this.getCatalog(addon.id, catalog.type, catalog.id, { limit: 5 });
          
          results[addon.id].catalogs.push({
            type: catalog.type,
            id: catalog.id,
            name: catalog.name,
            examples: items
          });
        } catch (error) {
          console.error(`Error fetching examples from ${addon.name} catalog:`, error);
          results[addon.id].catalogs.push({
            type: catalog.type,
            id: catalog.id,
            name: catalog.name,
            examples: []
          });
        }
      }
    }

    return results;
  }

  async previewAddon(url: string): Promise<{
    name: string;
    version: string;
    description: string;
    types: string[];
    catalogs: {
      type: string;
      id: string;
      name: string;
    }[];
    resources: {
      name: string;
      types: string[];
      idPrefixes?: string[];
    }[];
  }> {
    try {
      console.log('Fetching addon manifest from:', url);
      const manifest = await this.retryRequest(() => this.getManifest(url));
      
      return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        types: manifest.types || [],
        catalogs: manifest.catalogs || [],
        resources: manifest.resources || []
      };
    } catch (error) {
      console.error('Error previewing addon:', error);
      throw new Error('Failed to preview addon. Please check the URL and try again.');
    }
  }
}

export default StremioService; 