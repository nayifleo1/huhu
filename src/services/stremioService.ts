import axios from 'axios';
import { Manifest, StreamResponse, Meta } from '../types/stremio';

interface CatalogOptions {
  skip?: string;
  genre?: string;
  search?: string;
}

class StremioService {
  private static instance: StremioService;
  private installedAddons: Map<string, Manifest> = new Map();
  private readonly STORAGE_KEY = 'stremio-addons';
  private readonly DEFAULT_ADDONS = [
    'https://v3-cinemeta.strem.io/manifest.json',
    'https://opensubtitles-v3.strem.io/manifest.json'
  ];

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

  async getStreams(type: string, id: string): Promise<StreamResponse[]> {
    const responses: StreamResponse[] = [];
    const formattedId = this.formatId(id);
    
    const streamingAddons = Array.from(this.installedAddons.values())
      .filter(addon => {
        const streamResource = addon.resources?.find(r => r.name === 'stream');
        if (!streamResource) return false;
        
        // Check if addon supports this content type
        const supportsType = streamResource.types.includes(type);
        
        // Check if addon supports this ID prefix (if specified)
        const supportsIdPrefix = !streamResource.idPrefixes || 
          streamResource.idPrefixes.some(prefix => formattedId.startsWith(prefix));

        // Log addon details for debugging
        console.log('Checking addon:', {
          name: addon.name,
          id: addon.id,
          url: addon.url,
          originalUrl: addon.originalUrl,
          isDebridEnabled: addon.isDebridEnabled,
          supportsType,
          supportsIdPrefix,
          resources: addon.resources
        });
        
        return supportsType && supportsIdPrefix;
      });
    
    if (streamingAddons.length === 0) {
      console.warn('No compatible streaming addons found for this content.');
      return [];
    }
    
    const fetchPromises = streamingAddons.map(async (addon) => {
      try {
        // Always use the original URL with its configuration
        const baseUrl = addon.url;
        const queryParams = addon.queryParams || '';

        if (!baseUrl) {
          console.error(`No URL found for addon ${addon.name} (${addon.id})`);
          return null;
        }

        // Construct stream URL with proper configuration
        const streamUrl = `${baseUrl}/stream/${type}/${formattedId}.json${queryParams}`;

        console.log(`Fetching streams for ${type}/${formattedId} from addon:`, {
          name: addon.name,
          id: addon.id,
          baseUrl,
          streamUrl,
          isDebridEnabled: addon.isDebridEnabled,
          types: addon.resources?.find(r => r.name === 'stream')?.types,
          idPrefixes: addon.resources?.find(r => r.name === 'stream')?.idPrefixes
        });
        
        // Use retry mechanism for the request
        const response = await this.retryRequest(() => axios.get<StreamResponse>(streamUrl));
        
        if (response.data.streams?.length > 0) {
          // Log raw stream data for debugging
          console.log(`Raw streams from ${addon.name}:`, 
            response.data.streams.slice(0, 2).map(s => ({
              ...s,
              url: s.url?.substring(0, 100) + '...'
            }))
          );
          
          // Add addon info and validate each stream
          const validStreams = response.data.streams
            .filter(stream => {
              // For Torrentio streams, check for infoHash instead of url
              const isTorrentioStream = stream.infoHash && stream.fileIdx !== undefined;
              const isValid = stream && (stream.url || isTorrentioStream) && (stream.title || stream.name);
              if (!isValid) {
                console.log('Invalid stream:', stream);
              }
              return isValid;
            })
            .map(stream => {
              // Detect if this is a direct streaming URL (including RD links)
              const isDirectStreamingUrl = stream.url && (
                stream.url.startsWith('http') || 
                stream.url.startsWith('https') ||
                // Common RD and direct streaming patterns
                stream.url.includes('real-debrid.com') ||
                stream.url.includes('debrid') ||
                stream.url.includes('stream') ||
                stream.url.includes('cdn') ||
                // Check stream properties that indicate it's from RD
                stream.name?.toLowerCase().includes('rd') ||
                stream.name?.toLowerCase().includes('debrid') ||
                stream.title?.toLowerCase().includes('rd') ||
                stream.title?.toLowerCase().includes('debrid')
              );

              // For Torrentio streams, construct magnet URL if needed
              let streamUrl = stream.url;
              let isMagnetStream = false;
              
              if (streamUrl?.startsWith('magnet:')) {
                isMagnetStream = true;
              } else if (!streamUrl && stream.infoHash && !isDirectStreamingUrl) {
                // Construct magnet link only for non-direct streaming URLs
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
                streamUrl = `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodedTitle}${trackersString}`;
                isMagnetStream = true;
              }

              // Log stream detection for debugging
              console.log('Stream detection:', {
                name: stream.name,
                isDirectStreamingUrl,
                isMagnetStream,
                url: stream.url?.substring(0, 50) + '...',
                hasInfoHash: !!stream.infoHash,
                addon: addon.name
              });

              // Create properly formatted stream object
              const formattedStream = {
                ...stream,
                url: streamUrl,
                addonName: addon.name,
                addonId: addon.id,
                name: stream.name || stream.title || 'Unknown',
                title: stream.title || stream.name || 'Unknown',
                // Ensure behaviorHints is properly structured
                behaviorHints: {
                  ...stream.behaviorHints,
                  notWebReady: !isDirectStreamingUrl,
                  isMagnetStream,
                  // Add magnet-specific properties if it's a magnet link
                  ...(isMagnetStream && {
                    infoHash: stream.infoHash || streamUrl?.match(/btih:([a-zA-Z0-9]+)/)?.[1],
                    fileIdx: stream.fileIdx,
                    magnetUrl: streamUrl,
                    // Add additional properties for magnet handling
                    type: 'torrent',
                    sources: stream.sources || [],
                    seeders: stream.seeders,
                    size: stream.size,
                    title: stream.title || stream.name,
                  })
                }
              };
              
              return formattedStream;
            });

          console.log(`Processed ${validStreams.length} valid streams from ${addon.name}`);

          if (validStreams.length > 0) {
            return {
              ...response.data,
              streams: validStreams
            };
          } else {
            console.log(`No valid streams found from ${addon.name} after processing`);
          }
        } else {
          console.log(`No streams found from ${addon.name} for ${type}/${formattedId}`);
        }
        return null;
      } catch (error: any) {
        console.error(`Error fetching streams from ${addon.name}:`, {
          error: error.message,
          addonId: addon.id,
          type,
          id: formattedId,
          isDebridEnabled: addon.isDebridEnabled
        });
        return null;
      }
    });

    // Wait for all requests to complete
    const results = await Promise.all(fetchPromises);
    
    // Filter out null results and add valid responses
    results.forEach(result => {
      if (result && result.streams?.length > 0) {
        responses.push(result);
      }
    });

    const totalStreams = responses.reduce((acc, r) => acc + (r.streams?.length || 0), 0);
    console.log(`Total valid streams found across all addons: ${totalStreams}`);
    
    if (totalStreams === 0) {
      console.log('No streams found. This could be because:', [
        '- The content is not available in any installed addon',
        '- The content ID format is not supported',
        '- The addons are not responding correctly',
        '- You need to install more streaming addons'
      ].join('\n'));
    }

    return responses;
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
}

export default StremioService; 