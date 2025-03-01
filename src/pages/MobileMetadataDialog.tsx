import {
    Dialog,
    DialogContent,
    Box,
    IconButton,
    Skeleton,
    Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StreamingContent } from '../types/catalog';

interface MobileMetadataDialogProps {
    open: boolean;
    onClose: () => void;
    content?: StreamingContent;
    loading?: boolean;
}

export default function MobileMetadataDialog({ open, onClose, content, loading }: MobileMetadataDialogProps) {
    const renderLoadingState = () => (
        <Box sx={{ width: '100%' }}>
            {/* Hero section skeleton */}
            <Box sx={{ position: 'relative', width: '100%', height: '50vh', mb: 2 }}>
                <Skeleton 
                    variant="rectangular" 
                    width="100%" 
                    height="100%" 
                    sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        transform: 'none',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)',
                        borderRadius: 0
                    }} 
                />
                <Box 
                    sx={{ 
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        padding: 3,
                        pt: 8
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {[1, 2, 3].map((i) => (
                            <Skeleton 
                                key={i}
                                variant="rectangular" 
                                width={60} 
                                height={24} 
                                sx={{ 
                                    borderRadius: 1,
                                    background: 'rgba(255,255,255,0.1)'
                                }} 
                            />
                        ))}
                    </Box>
                    <Skeleton 
                        variant="rectangular" 
                        width="70%" 
                        height={36} 
                        sx={{ 
                            mb: 1,
                            borderRadius: 1,
                            background: 'rgba(255,255,255,0.1)'
                        }} 
                    />
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Skeleton 
                            variant="rectangular" 
                            width={100} 
                            height={24} 
                            sx={{ 
                                borderRadius: 1,
                                background: 'rgba(255,255,255,0.1)'
                            }} 
                        />
                        <Skeleton 
                            variant="rectangular" 
                            width={60} 
                            height={24} 
                            sx={{ 
                                borderRadius: 1,
                                background: 'rgba(255,255,255,0.1)'
                            }} 
                        />
                    </Box>
                </Box>
            </Box>

            {/* Content section skeleton */}
            <Box sx={{ px: 3 }}>
                {/* Description */}
                <Box sx={{ mb: 4 }}>
                    <Skeleton 
                        variant="rectangular" 
                        width="100%" 
                        height={16} 
                        sx={{ 
                            mb: 1,
                            borderRadius: 0.5,
                            background: 'rgba(255,255,255,0.1)'
                        }} 
                    />
                    <Skeleton 
                        variant="rectangular" 
                        width="95%" 
                        height={16} 
                        sx={{ 
                            mb: 1,
                            borderRadius: 0.5,
                            background: 'rgba(255,255,255,0.1)'
                        }} 
                    />
                    <Skeleton 
                        variant="rectangular" 
                        width="90%" 
                        height={16} 
                        sx={{ 
                            borderRadius: 0.5,
                            background: 'rgba(255,255,255,0.1)'
                        }} 
                    />
                </Box>

                {/* Cast section */}
                <Box sx={{ mb: 4 }}>
                    <Skeleton 
                        variant="rectangular" 
                        width={120} 
                        height={24} 
                        sx={{ 
                            mb: 2,
                            borderRadius: 0.5,
                            background: 'rgba(255,255,255,0.1)'
                        }} 
                    />
                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Box key={i} sx={{ flexShrink: 0 }}>
                                <Skeleton 
                                    variant="rectangular" 
                                    width={120} 
                                    height={180} 
                                    sx={{ 
                                        mb: 1,
                                        borderRadius: 2,
                                        background: 'rgba(255,255,255,0.1)'
                                    }} 
                                />
                                <Skeleton 
                                    variant="rectangular" 
                                    width={80} 
                                    height={16} 
                                    sx={{ 
                                        borderRadius: 0.5,
                                        background: 'rgba(255,255,255,0.1)'
                                    }} 
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Additional info section */}
                <Box>
                    <Skeleton 
                        variant="rectangular" 
                        width={140} 
                        height={24} 
                        sx={{ 
                            mb: 2,
                            borderRadius: 0.5,
                            background: 'rgba(255,255,255,0.1)'
                        }} 
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[1, 2, 3].map((i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                                <Skeleton 
                                    variant="rectangular" 
                                    width={100} 
                                    height={20} 
                                    sx={{ 
                                        borderRadius: 0.5,
                                        background: 'rgba(255,255,255,0.1)'
                                    }} 
                                />
                                <Skeleton 
                                    variant="rectangular" 
                                    width={200} 
                                    height={20} 
                                    sx={{ 
                                        borderRadius: 0.5,
                                        background: 'rgba(255,255,255,0.1)'
                                    }} 
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
            TransitionComponent={Fade}
            transitionDuration={300}
        >
            <DialogContent 
                sx={{ 
                    p: 0, 
                    background: '#000000',
                    overflowX: 'hidden'
                }}
            >
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        zIndex: 10,
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                        }
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {loading ? renderLoadingState() : (
                    content && (
                        <Box sx={{ width: '100%' }}>
                            {/* Content rendering code here */}
                        </Box>
                    )
                )}
            </DialogContent>
        </Dialog>
    );
} 