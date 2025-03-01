import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  CircularProgress,
} from '@mui/material';
import StremioService from '../services/stremioService';
import { Stream, StreamResponse } from '../types/stremio';

interface MediaPlayerProps {
  type: string;
  id: string;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ type, id }) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stremioService = StremioService.getInstance();

  useEffect(() => {
    loadStreams();
  }, [type, id]);

  const loadStreams = async () => {
    try {
      setLoading(true);
      setError(null);
      const responses = await stremioService.getStreams(type, id);
      const allStreams = responses.flatMap((response: StreamResponse) => response.streams);
      setStreams(allStreams);
      if (allStreams.length > 0) {
        setSelectedStream(allStreams[0]);
      }
    } catch (err) {
      setError('Failed to load streams. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
      <Box sx={{ flex: 1 }}>
        {selectedStream ? (
          <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
            <ReactPlayer
              url={selectedStream.url}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
              controls
              playing
            />
          </Box>
        ) : (
          <Box
            sx={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'black',
            }}
          >
            <Typography color="white">No stream selected</Typography>
          </Box>
        )}
      </Box>

      <Paper sx={{ width: 320, maxHeight: '600px', overflow: 'auto' }}>
        <List>
          <ListItem>
            <Typography variant="h6">Available Streams</Typography>
          </ListItem>
          {streams.length === 0 ? (
            <ListItem>
              <ListItemText primary="No streams available" />
            </ListItem>
          ) : (
            streams.map((stream, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  selected={selectedStream?.url === stream.url}
                  onClick={() => setSelectedStream(stream)}
                >
                  <ListItemText
                    primary={stream.title || stream.name}
                    secondary={`Source: ${stream.name}`}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default MediaPlayer; 