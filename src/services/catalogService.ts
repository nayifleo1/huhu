import axios from 'axios';
import { StreamingAddon, StreamingContent } from '../types/catalog';

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MzljNDc4YTc3MWYzNWMwNTAyMmY5ZmVhYmNjYTAxYyIsIm5iZiI6MTcwOTkxMTEzNS4xNCwic3ViIjoiNjVlYjJjNWYzODlkYTEwMTYyZDgyOWU0Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.gosBVl1wYUbePOeB9WieHn8bY9x938-GSGmlXZK_UVM';
const TMDB_TIMEOUT = 3000; // 3 seconds timeout
const TMDB_MAX_RETRIES = 2;

// Add fuzzy search utility
function fuzzyMatch(str: string, pattern: string): boolean {
    const strLower = str.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Direct match check
    if (strLower.includes(patternLower)) return true;
    
    // Levenshtein distance for fuzzy matching
    const calculateLevenshteinDistance = (a: string, b: string): number => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[a.length][b.length];
    };

    // Calculate similarity threshold based on pattern length
    const maxDistance = Math.floor(patternLower.length * 0.3); // Allow 30% error rate
    const distance = calculateLevenshteinDistance(strLower, patternLower);
    
    return distance <= maxDistance;
}

// Add interface for cast member at the top of the file
interface CastMember {
    id: number;
    name: string;
    character: string;
    profilePath: string | null;
    order: number;
}

// Add this utility function for retrying requests
async function retryRequest(requestFn: () => Promise<any>, maxRetries: number = TMDB_MAX_RETRIES): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            if (attempt === maxRetries - 1) throw error;
            
            // If it's a timeout or network error, wait before retrying
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error')) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                continue;
            }
            throw error;
        }
    }
}

export const catalogService = {
    async getCatalogContent(addonId: string, type: string, catalogId: string, options?: { search?: string }): Promise<StreamingContent[]> {
        try {
            // Always use Cinemeta URL
            const url = options?.search
                ? `${CINEMETA_URL}/catalog/${type}/${catalogId}/search=${encodeURIComponent(options.search)}.json`
                : `${CINEMETA_URL}/catalog/${type}/${catalogId}.json`;

            console.log('Cinemeta request:', {
                url,
                type,
                catalogId,
                search: options?.search
            });

            const response = await axios.get(url);
            
            // Debug log the raw response
            console.log('API Response:', {
                url,
                status: response.status,
                hasData: !!response.data,
                hasMetas: Array.isArray(response.data?.metas),
                metasLength: response.data?.metas?.length,
                firstItem: response.data?.metas?.[0]
            });

            // Map the response data to match our StreamingContent interface
            if (response.data && Array.isArray(response.data.metas)) {
                const results = response.data.metas
                    .filter((item: any) => {
                        if (!options?.search) return true;
                        
                        const searchLower = options.search.toLowerCase();
                        
                        // Check title match with fuzzy search
                        const titleLower = (item.name || item.title || '').toLowerCase();
                        if (fuzzyMatch(titleLower, searchLower)) return true;
                        
                        // Check cast match
                        if (item.cast && Array.isArray(item.cast)) {
                            return item.cast.some((actor: string) => 
                                fuzzyMatch(actor.toLowerCase(), searchLower)
                            );
                        }
                        
                        return false;
                    })
                    .map((item: any) => ({
                        id: item.imdb_id || item.id,
                        imdb_id: item.imdb_id,
                        type: item.type || type,
                        name: item.name || item.title,
                        title: item.title,
                        poster: item.poster,
                        background: item.background,
                        logo: item.logo,
                        description: item.description || item.overview,
                        releaseInfo: item.releaseInfo || (item.year ? item.year.toString() : undefined),
                        year: item.year,
                        runtime: item.runtime,
                        genres: item.genres,
                        cast: item.cast,
                        director: item.director,
                        imdbRating: item.imdbRating
                    }));

                console.log('Processed results:', {
                    url,
                    count: results.length,
                    sample: results.slice(0, 2).map((r: StreamingContent) => ({ 
                        id: r.id, 
                        name: r.name, 
                        type: r.type 
                    }))
                });

                return results;
            }
            return [];
        } catch (error) {
            console.error('Error fetching catalog content:', error);
            console.error('Request details:', {
                addonId,
                type,
                catalogId,
                search: options?.search
            });
            return [];
        }
    },

    async getStreamingAddons(): Promise<StreamingAddon[]> {
        try {
            // Return Cinemeta addon configuration with exact catalog structure
            return [{
                id: "com.linvo.cinemeta",
                version: "3.0.13",
                name: "Cinemeta",
                description: "The official addon for movie and series catalogs",
                resources: ["catalog", "meta", "addon_catalog"],
                types: ["movie", "series"],
                idPrefixes: ["tt"],
                catalogs: [
                    // Movies catalogs
                    {
                        type: "movie",
                        id: "top",
                        name: "Popular",
                        genres: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"],
                        extra: [
                            {
                                name: "genre",
                                options: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"]
                            },
                            { name: "search" },
                            { name: "skip" }
                        ]
                    },
                    {
                        type: "movie",
                        id: "year",
                        name: "New",
                        extra: [{ name: "genre", isRequired: true }, { name: "skip" }]
                    },
                    {
                        type: "movie",
                        id: "imdbRating",
                        name: "Featured",
                        genres: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"],
                        extra: [
                            {
                                name: "genre",
                                options: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"]
                            },
                            { name: "skip" }
                        ]
                    },
                    // Series catalogs
                    {
                        type: "series",
                        id: "top",
                        name: "Popular",
                        genres: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western", "Reality-TV", "Talk-Show", "Game-Show"],
                        extra: [
                            {
                                name: "genre",
                                options: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western", "Reality-TV", "Talk-Show", "Game-Show"]
                            },
                            { name: "search" },
                            { name: "skip" }
                        ]
                    },
                    {
                        type: "series",
                        id: "year",
                        name: "New",
                        extra: [{ name: "genre", isRequired: true }, { name: "skip" }]
                    },
                    {
                        type: "series",
                        id: "imdbRating",
                        name: "Featured",
                        genres: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western", "Reality-TV", "Talk-Show", "Game-Show"],
                        extra: [
                            {
                                name: "genre",
                                options: ["Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western", "Reality-TV", "Talk-Show", "Game-Show"]
                            },
                            { name: "skip" }
                        ]
                    }
                ],
                behaviorHints: { configurable: false, newEpisodeNotifications: true }
            }];
        } catch (error) {
            console.error('Error fetching streaming addons:', error);
            return [];
        }
    },

    async getMetadata(type: string, id: string) {
        try {
            // Format the ID to ensure it's a valid IMDB ID
            const imdbId = id.startsWith('tt') ? id : `tt${id}`;
            
            // Fetch data from Cinemeta
            const cinemetaResponse = await axios.get(`${CINEMETA_URL}/meta/${type}/${imdbId}.json`);
            
            if (!cinemetaResponse.data?.meta) {
                throw new Error('No metadata returned from Cinemeta');
            }

            const data = cinemetaResponse.data.meta;

            // Get TMDB ID from IMDB ID with timeout and retry
            let tmdbId;
            try {
                const findResponse = await retryRequest(async () => {
                    return await axios.get(
                        `${TMDB_BASE_URL}/find/${imdbId}?external_source=imdb_id`,
                        {
                            headers: {
                                'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`
                            },
                            timeout: TMDB_TIMEOUT
                        }
                    );
                });
                tmdbId = findResponse.data.movie_results?.[0]?.id || findResponse.data.tv_results?.[0]?.id;
            } catch (error) {
                console.error('Error fetching TMDB ID (using Cinemeta fallback):', error);
            }

            // Fetch cast data from TMDB if we have the ID
            let castData = [];
            if (tmdbId) {
                try {
                    const creditsResponse = await retryRequest(async () => {
                        return await axios.get(
                            `${TMDB_BASE_URL}/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}/credits`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`
                                },
                                timeout: TMDB_TIMEOUT
                            }
                        );
                    });

                    if (creditsResponse.data.cast?.length > 0) {
                        castData = creditsResponse.data.cast.map((member: any) => ({
                            id: member.id,
                            name: member.name,
                            character: member.character || '',
                            profilePath: member.profile_path 
                                ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                                : null,
                            order: member.order
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching TMDB cast data (using Cinemeta fallback):', error);
                }
            }

            // If TMDB cast data fetch failed or is empty, use Cinemeta cast data
            if (castData.length === 0) {
                console.log('Using Cinemeta cast data as fallback');
                castData = (data.cast || []).map((actor: string, index: number) => ({
                    id: index + 1,
                    name: actor,
                    character: '',
                    profilePath: data.cast_imdb_ids?.[index] 
                        ? `https://images.metahub.space/avatar/medium/${data.cast_imdb_ids[index]}/img` 
                        : null,
                    order: index
                }));
            }
            
            // Map videos for TV shows
            let videos = [];
            if (type === 'series' && data.videos) {
                // Group videos by season and get the first episode of each season
                const seasonMap = new Map();
                data.videos.forEach((video: any) => {
                    if (video.season && video.episode) {
                        if (!seasonMap.has(video.season)) {
                            seasonMap.set(video.season, {
                                season: video.season,
                                episode: 1,
                                title: video.name || video.title || `Season ${video.season}`,
                                overview: video.overview || '',
                                thumbnail: video.thumbnail || data.background,
                                episodeCount: 0,
                                airDate: video.released,
                                episodes: [] // Add array to store episode details
                            });
                        }
                        // Update episode count and store episode details
                        const seasonData = seasonMap.get(video.season);
                        seasonData.episodeCount++;
                        seasonData.episodes = seasonData.episodes || [];
                        seasonData.episodes.push({
                            number: video.episode,
                            title: video.name || video.title || `Episode ${video.episode}`,
                            overview: video.overview || '',
                            thumbnail: video.thumbnail || data.background,
                            released: video.released,
                            runtime: video.runtime
                        });
                        seasonMap.set(video.season, seasonData);
                    }
                });
                
                videos = Array.from(seasonMap.values()).sort((a: any, b: any) => a.season - b.season);
            }

            const metadata = {
                id: data.id,
                imdb_id: data.imdb_id || imdbId,
                type,
                name: data.name,
                poster: data.poster,
                background: data.background,
                logo: data.logo,
                description: data.description,
                releaseInfo: data.releaseInfo,
                runtime: data.runtime,
                genres: data.genres || [],
                cast: castData.map((c: CastMember) => c.name).join(', ') || '',
                castData,
                director: data.director,
                rating: data.imdbRating ? (parseFloat(data.imdbRating) / 2).toFixed(1) : undefined,
                videos,
                numberOfSeasons: videos.length,
                inProduction: data.status === 'Continuing',
                status: data.status || 'Released',
                lastAirDate: data.videos?.slice(-1)[0]?.released || null,
                nextAirDate: null
            };

            return metadata;
        } catch (error) {
            console.error('Error fetching metadata:', error);
            return null;
        }
    },

    async getSeasonDetails(showId: string, seasonNumber: number) {
        try {
            // Format the ID to ensure it's a valid IMDB ID
            const imdbId = showId.startsWith('tt') ? showId : `tt${showId}`;
            const url = `${CINEMETA_URL}/meta/series/${imdbId}.json`;

            console.log('Fetching season details from Cinemeta:', url);
            const response = await axios.get(url);
            
            if (!response.data?.meta) {
                throw new Error('No metadata returned from Cinemeta');
            }

            const data = response.data.meta;
            
            // Filter videos for the requested season and ensure they have all required data
            const seasonEpisodes = (data.videos || [])
                .filter((video: any) => 
                    video.season === seasonNumber &&
                    video.episode &&
                    video.released // Only include episodes with release dates
                )
                .sort((a: any, b: any) => a.episode - b.episode)
                .map((episode: any) => ({
                    number: episode.episode,
                    title: episode.name || episode.title || `Episode ${episode.episode}`,
                    description: episode.overview || episode.description || '',
                    released: episode.released,
                    thumbnail: episode.thumbnail || data.background,
                    runtime: episode.runtime || data.runtime,
                    imdbId: episode.imdb_id || null // Include episode-specific IMDB ID if available
                }));

            if (seasonEpisodes.length === 0) {
                throw new Error(`No episodes found for season ${seasonNumber}`);
            }

            // Get season-specific metadata if available
            const seasonMeta = data.seasons?.find((s: any) => s.season === seasonNumber);

            return {
                season: seasonNumber,
                episodes: seasonEpisodes,
                name: seasonMeta?.name || `Season ${seasonNumber}`,
                overview: seasonMeta?.overview || data.description || '',
                poster: seasonMeta?.poster || data.poster
            };
        } catch (error) {
            console.error('Error fetching season details from Cinemeta:', error);
            return null;
        }
    }
};