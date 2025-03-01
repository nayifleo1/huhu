import axios from 'axios';
import { StreamingAddon, StreamingContent } from '../types/catalog';

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MzljNDc4YTc3MWYzNWMwNTAyMmY5ZmVhYmNjYTAxYyIsIm5iZiI6MTcwOTkxMTEzNS4xNCwic3ViIjoiNjVlYjJjNWYzODlkYTEwMTYyZDgyOWU0Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.gosBVl1wYUbePOeB9WieHn8bY9x938-GSGmlXZK_UVM';

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
            const isMovie = type === 'movie';
            
            // If the ID starts with 'tt', it's an IMDB ID and needs to be converted
            let tmdbId = id;
            if (id.startsWith('tt')) {
                const findResponse = await axios.get(
                    `${TMDB_BASE_URL}/find/${id}?external_source=imdb_id`,
                    {
                        headers: {
                            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                            'accept': 'application/json'
                        }
                    }
                );

                // Get the TMDB ID from the appropriate results array
                const result = isMovie ? 
                    findResponse.data.movie_results[0] : 
                    findResponse.data.tv_results[0];

                if (!result) {
                    throw new Error(`No TMDB results found for IMDB ID: ${id}`);
                }

                tmdbId = result.id.toString();
            }

            const endpoint = `${TMDB_BASE_URL}/${isMovie ? 'movie' : 'tv'}/${tmdbId}`;
            
            // For TV shows, we need to get all seasons data
            const requests = [
                axios.get(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                        'accept': 'application/json'
                    }
                }),
                axios.get(`${endpoint}/credits`, {
                    headers: {
                        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                        'accept': 'application/json'
                    }
                })
            ];

            if (!isMovie) {
                // For TV shows, get aggregate credits for a more complete cast list
                requests.push(
                    axios.get(`${endpoint}/aggregate_credits`, {
                        headers: {
                            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                            'accept': 'application/json'
                        }
                    })
                );
            }

            const responses = await Promise.all(requests);
            const [details, credits, aggregateCredits] = responses;
            const data = details.data;
            
            // Process cast data, preferring aggregate credits for TV shows
            let castData;
            if (!isMovie && aggregateCredits?.data?.cast) {
                castData = aggregateCredits.data.cast
                    .filter((member: any) => member.profile_path)
                    .sort((a: any, b: any) => (b.roles?.length || 0) - (a.roles?.length || 0))
                    .slice(0, 20)
                    .map((member: any) => ({
                        id: member.id,
                        name: member.name,
                        character: member.roles?.[0]?.character || '',
                        profilePath: `https://image.tmdb.org/t/p/w185${member.profile_path}`,
                        order: member.order
                    }));
            } else {
                castData = credits.data.cast
                    .filter((member: any) => member.profile_path)
                    .slice(0, 20)
                    .map((member: any) => ({
                        id: member.id,
                        name: member.name,
                        character: member.character,
                        profilePath: `https://image.tmdb.org/t/p/w185${member.profile_path}`,
                        order: member.order
                    }));
            }

            // Get director (for movies) or creators (for TV shows)
            let director;
            if (isMovie) {
                director = credits.data.crew.find((member: any) => member.job === 'Director')?.name;
            } else {
                const creators = data.created_by?.map((creator: any) => creator.name) || [];
                director = creators.length > 0 ? creators.join(', ') : undefined;
            }

            // Handle seasons for TV shows
            let videos = [];
            if (!isMovie && data.seasons) {
                // Get the list of valid seasons (filtering out season 0 and unaired seasons)
                const validSeasons = data.seasons
                    .filter((season: any) => 
                        season.season_number > 0 && 
                        season.episode_count > 0 &&
                        new Date(season.air_date) <= new Date() // Only include seasons that have started airing
                    )
                    .sort((a: any, b: any) => a.season_number - b.season_number);

                // Map the seasons to our format
                videos = validSeasons.map((season: any) => ({
                    season: season.season_number,
                    episode: 1,
                    title: season.name,
                    overview: season.overview,
                    thumbnail: season.poster_path ? `https://image.tmdb.org/t/p/w300${season.poster_path}` : null,
                    episodeCount: season.episode_count,
                    airDate: season.air_date
                }));

                // Log season data for debugging
                console.log('Series seasons data:', {
                    title: data.name,
                    totalSeasons: data.number_of_seasons,
                    seasonsFound: videos.length,
                    seasonNumbers: videos.map((v: any) => v.season)
                });
            }

            const metadata = {
                id: data.id.toString(),
                imdb_id: id.startsWith('tt') ? id : data.external_ids?.imdb_id,
                type,
                name: data.title || data.name,
                poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
                background: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
                logo: null,
                description: data.overview,
                releaseInfo: isMovie ? 
                    new Date(data.release_date).getFullYear() : 
                    `${new Date(data.first_air_date).getFullYear()}${data.status === 'Ended' ? '-' + new Date(data.last_air_date).getFullYear() : ''}`,
                runtime: data.runtime ? 
                    `${data.runtime}m` : 
                    data.episode_run_time?.[0] ? `${data.episode_run_time[0]}m` : undefined,
                genres: data.genres.map((g: any) => g.name),
                cast: castData.map((c: { name: string }) => c.name).join(', '),
                castData,
                director,
                rating: (data.vote_average / 2).toFixed(1),
                videos,
                numberOfSeasons: videos.length, // Use actual number of valid seasons
                inProduction: data.in_production,
                status: data.status,
                lastAirDate: data.last_air_date,
                nextAirDate: data.next_episode_to_air?.air_date
            };

            return metadata;
        } catch (error) {
            console.error('Error fetching TMDB metadata:', error);
            return null;
        }
    },

    async getSeasonDetails(showId: string, seasonNumber: number) {
        try {
            // Convert IMDB ID to TMDB ID if necessary
            let tmdbId = showId;
            if (showId.startsWith('tt')) {
                const findResponse = await axios.get(
                    `${TMDB_BASE_URL}/find/${showId}?external_source=imdb_id`,
                    {
                        headers: {
                            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                            'accept': 'application/json'
                        }
                    }
                );

                const result = findResponse.data.tv_results[0];
                if (!result) {
                    throw new Error(`No TMDB results found for IMDB ID: ${showId}`);
                }

                tmdbId = result.id.toString();
            }

            // Get both season details and show details to validate season number
            const [seasonResponse, showResponse] = await Promise.all([
                axios.get(
                    `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                            'accept': 'application/json'
                        }
                    }
                ),
                axios.get(
                    `${TMDB_BASE_URL}/tv/${tmdbId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                            'accept': 'application/json'
                        }
                    }
                )
            ]);

            const seasonData = seasonResponse.data;
            const showData = showResponse.data;

            // Validate that this is a valid season
            if (seasonNumber <= 0 || seasonNumber > showData.number_of_seasons) {
                throw new Error(`Invalid season number: ${seasonNumber}`);
            }

            // Sort episodes by episode number and filter out any invalid episodes
            const episodes = seasonData.episodes
                .filter((episode: any) => 
                    episode.episode_number > 0 && 
                    episode.air_date // Only include episodes with air dates
                )
                .sort((a: any, b: any) => a.episode_number - b.episode_number)
                .map((episode: any) => ({
                    number: episode.episode_number,
                    title: episode.name,
                    description: episode.overview,
                    released: episode.air_date,
                    thumbnail: episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : null,
                    runtime: episode.runtime
                }));

            return {
                season: seasonNumber,
                episodes,
                name: seasonData.name,
                overview: seasonData.overview,
                poster: seasonData.poster_path ? `https://image.tmdb.org/t/p/w300${seasonData.poster_path}` : null
            };
        } catch (error) {
            console.error('Error fetching season details:', error);
            return null;
        }
    }
};