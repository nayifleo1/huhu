import { registerPlugin } from '@capacitor/core';

export interface ExternalPlayerPlugin {
    openVideo(options: { 
        url: string; 
        title?: string;
        useDefault?: boolean;
    }): Promise<void>;
    clearDefaultPlayer(): Promise<void>;
}

const ExternalPlayer = registerPlugin<ExternalPlayerPlugin>('ExternalPlayer', {
    web: {
        load: () => Promise.resolve({
            openVideo: () => Promise.reject('ExternalPlayer is not available on web'),
            clearDefaultPlayer: () => Promise.reject('ExternalPlayer is not available on web')
        })
    }
});

export default ExternalPlayer; 